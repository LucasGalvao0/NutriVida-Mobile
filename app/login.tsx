import React, { useState, useEffect, useRef } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Eye, EyeOff, Mail, Lock, X, AlertCircle } from "lucide-react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';

const logoApp = require("@/assets/images/Logonutri.png");

// Substitua pelo IP da sua máquina
const API_URL = 'http://192.168.11.255:3000'; 

export default function Login() {
  const router = useRouter();
  
  // Estados de Login
  const [login, setLogin] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Estados de Erro em Linha (Mensagens abaixo dos campos)
  const [emailError, setEmailError] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");

  // Estados dos Modais de Recuperação e Alerta Customizado
  const [modalRecuperacaoVisible, setModalRecuperacaoVisible] = useState(false);
  const [modalRedefinirVisible, setModalRedefinirVisible] = useState(false);
  const [emailRecuperacao, setEmailRecuperacao] = useState("");
  const [token, setToken] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [isSendingToken, setIsSendingToken] = useState(false); 
  
  // Estado do Alerta Customizado, agora com 'isSuccess'
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: "", message: "", isSuccess: false });
  
  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // --- FUNÇÃO AUXILIAR DE ALERTA ATUALIZADA ---
  const showCustomAlert = (title: string, message: string, isSuccess: boolean = false) => {
    setAlertConfig({ visible: true, title, message, isSuccess });
  };

  const closeCustomAlert = () => {
    setAlertConfig({ ...alertConfig, visible: false });
  };

  // --- VALIDAÇÕES EM LINHA ---
  
  const isValidEmail = (email: string) => {
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    return gmailRegex.test(email);
  };

  const isValidPassword = (senha: string) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(senha);
  };

  const isFormValid = isValidEmail(login) && isValidPassword(password);

  function handleValidationErrors() {
    setEmailError("");
    setPasswordError("");

    if (!login) {
      setEmailError("Informe o e-mail.");
    } else if (!isValidEmail(login)) {
      setEmailError("Use um e-mail @gmail.com válido.");
    }

    if (!password) {
      setPasswordError("Informe a senha.");
    } else if (!isValidPassword(password)) {
      setPasswordError(
        "A senha deve ter no mínimo 8 caracteres, 1 letra maiúscula e 1 número."
      );
    }
  }

  // --- FUNÇÕES DE API ---

  async function onClickLogin() {
    if (!isFormValid) {
      handleValidationErrors();
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: login, senha: password }),
      });

      const textResponse = await response.text();
      const data = JSON.parse(textResponse);

      if (!response.ok) {
        throw new Error(data.message || "E-mail ou senha inválidos.");
      }

      const dadosUsuario = data.usuario ? data.usuario : data;
      await AsyncStorage.setItem("dadosUsuario", JSON.stringify(dadosUsuario));
      
      if (data.token) {
        await AsyncStorage.setItem("userToken", data.token);
      }

      router.replace("/(tabs)"); 

    } catch (error: any) {
      showCustomAlert("Erro ao entrar", error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const handleEnviarToken = async () => {
    if (!isValidEmail(emailRecuperacao)) {
      showCustomAlert("Atenção", "Digite um formato de e-mail válido para receber o token.");
      return;
    }

    setIsSendingToken(true);

    try {
      const response = await fetch(`${API_URL}/usuarios/solicitar-reset`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailRecuperacao }),
      });

      const textResponse = await response.text();
      let responseData = {};
      try {
        responseData = JSON.parse(textResponse);
      } catch (e) {}

      if (!response.ok) {
        throw new Error(responseData.message || "Erro ao solicitar recuperação. Tente novamente.");
      }

      setModalRecuperacaoVisible(false);
      // Aqui passamos 'true' para o alerta ser de SUCESSO (Verde)
      showCustomAlert("E-mail enviado", "Se o e-mail estiver cadastrado, o token chegará na sua caixa de entrada.", true);
      setModalRedefinirVisible(true);
      
    } catch (error: any) {
      showCustomAlert("Aviso", error.message);
    } finally {
      setIsSendingToken(false);
    }
  };

  const handleRedefinirSenha = async () => {
    if (!token) {
      showCustomAlert("Atenção", "Preencha o token recebido no e-mail.");
      return;
    }
    if (novaSenha.length < 8) {
      showCustomAlert("Atenção", "A nova senha deve ter no mínimo 8 dígitos.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/usuarios/redefinir-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, novaSenha }),
      });

      const responseText = await response.text();
      let responseData = {};
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {}

      if (!response.ok) {
        throw new Error(responseData.message || "Falha no servidor.");
      }

      setModalRedefinirVisible(false);
      // Aqui passamos 'true' para o alerta ser de SUCESSO (Verde)
      showCustomAlert("Sucesso", "Senha redefinida com sucesso! Pode fazer o login.", true);
      
    } catch (error: any) {
      showCustomAlert("Erro Detalhado", `Motivo: ${error.message}`);
    }
  };

  return (
    <LinearGradient
      colors={["#0a1f1a", "#0f172a"]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.container}>
          {/* Header com Logo */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image source={logoApp} style={styles.logo} resizeMode="contain" />
            <Text style={styles.saudacao}>Que bom vê-lo novamente!</Text>
            <Text style={styles.subtitle}>
              Entre para continuar sua jornada
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View
            style={[
              styles.main,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputWrapper, emailError ? styles.inputErrorBorder : null]}>
                <Mail
                  color="#00E676"
                  size={20}
                  strokeWidth={2}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={login}
                  placeholder="seu@email.com"
                  placeholderTextColor="#666"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={(text) => {
                    setLogin(text);
                    setEmailError(""); 
                  }}
                />
              </View>
              {emailError ? <Text style={styles.inlineErrorText}>{emailError}</Text> : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Senha</Text>
              <View style={[styles.inputWrapper, passwordError ? styles.inputErrorBorder : null]}>
                <Lock
                  color="#00E676"
                  size={20}
                  strokeWidth={2}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  placeholder="Mínimo de 8 dígitos"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setPasswordError(""); 
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff color="#666" size={20} strokeWidth={2} />
                  ) : (
                    <Eye color="#666" size={20} strokeWidth={2} />
                  )}
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={styles.inlineErrorText}>{passwordError}</Text> : null}
            </View>

            {/* Esqueci Senha */}
            <TouchableOpacity
              onPress={() => setModalRecuperacaoVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.linkEsqueci}>
                Esqueceu sua senha?
              </Text>
            </TouchableOpacity>

            {/* Botão Entrar */}
            {isFormValid ? (
              <TouchableOpacity
                style={styles.button}
                onPress={onClickLogin}
                activeOpacity={0.8}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={["#00E676", "#00C853"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>{isLoading ? "Entrando..." : "Entrar"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.buttonDisabled}
                onPress={handleValidationErrors}
                activeOpacity={0.7}
              >
                <Text style={styles.buttonTextDisabled}>Entrar</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Footer */}
          <Animated.View
            style={[
              styles.footer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Text style={styles.footerText}>Não tem uma conta?</Text>
            <Link href="/register" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.linkCriar}> Criar conta</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>

          {/* Divisor */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Login Social */}
          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              activeOpacity={0.8}
              onPress={() => {
                Linking.openURL(`${API_URL}/auth/google`);
              }}
            >
              <Text style={styles.socialButtonText}>Login com Google</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* --- MODAIS DE RECUPERAÇÃO --- */}
      
      {/* Modal 1: Informar E-mail */}
      <Modal visible={modalRecuperacaoVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeModalButton} 
              onPress={() => setModalRecuperacaoVisible(false)}
            >
              <X color="#bafdbc" size={24} />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>Recuperar senha</Text>
            <Text style={styles.modalSubtitle}>Digite seu e-mail para receber o token de segurança.</Text>
            
            <View style={styles.inputWrapperModal}>
              <TextInput
                style={styles.inputModal}
                placeholder="seu@email.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
                value={emailRecuperacao}
                onChangeText={setEmailRecuperacao}
              />
            </View>

            <TouchableOpacity 
              style={[styles.modalButton, isSendingToken && { opacity: 0.7 }]} 
              onPress={handleEnviarToken}
              disabled={isSendingToken}
            >
              <LinearGradient colors={["#00E676", "#00C853"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buttonGradientModal}>
                <Text style={styles.buttonText}>{isSendingToken ? "Enviando..." : "Enviar Token"}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal 2: Inserir Token e Nova Senha */}
      <Modal visible={modalRedefinirVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <TouchableOpacity 
              style={styles.closeModalButton} 
              onPress={() => setModalRedefinirVisible(false)}
            >
              <X color="#bafdbc" size={24} />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Redefinir senha</Text>
            
            <View style={styles.inputWrapperModal}>
              <TextInput
                style={styles.inputModal}
                placeholder="Cole o token recebido"
                placeholderTextColor="#666"
                value={token}
                onChangeText={setToken}
              />
            </View>

            <View style={[styles.inputWrapperModal, { marginTop: 15 }]}>
              <TextInput
                style={styles.inputModal}
                placeholder="Nova senha (mínimo 8 dígitos)"
                placeholderTextColor="#666"
                secureTextEntry
                value={novaSenha}
                onChangeText={setNovaSenha}
              />
            </View>

            <TouchableOpacity style={styles.modalButton} onPress={handleRedefinirSenha}>
              <LinearGradient colors={["#00E676", "#00C853"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buttonGradientModal}>
                <Text style={styles.buttonText}>Redefinir</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- ALERTA CUSTOMIZADO ESTILIZADO (VERDE/VERMELHO) --- */}
      <Modal visible={alertConfig.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          {/* A borda fica verde se for sucesso, ou vermelha se for erro */}
          <View style={[styles.alertBox, { borderColor: alertConfig.isSuccess ? 'rgba(0, 230, 118, 0.3)' : 'rgba(239, 68, 68, 0.3)' }]}>
            <AlertCircle color={alertConfig.isSuccess ? "#00E676" : "#EF4444"} size={40} style={{ marginBottom: 15 }} />
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            
            <TouchableOpacity style={styles.alertButton} onPress={closeCustomAlert}>
              <Text style={styles.alertButtonText}>OK, entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  keyboardView: { flex: 1 },
  container: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 30, paddingVertical: 40 },
  header: { alignItems: "center", marginBottom: 35 },
  logo: { width: 200, height: 80, marginBottom: 15 },
  saudacao: { color: "#00E676", fontSize: 24, fontWeight: "700", marginBottom: 5 },
  subtitle: { color: "#bafdbc", fontSize: 14, fontWeight: "400" },
  main: { width: "100%", backgroundColor: "rgba(255,255,255,0.08)", padding: 24, borderRadius: 20, borderWidth: 1, borderColor: "rgba(0, 230, 118, 0.2)" },
  inputContainer: { marginBottom: 18 },
  label: { fontWeight: "600", fontSize: 14, marginBottom: 8, color: "#bafdbc" },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 12, borderWidth: 2, borderColor: "transparent" },
  inputIcon: { marginLeft: 14 },
  input: { flex: 1, padding: 14, paddingLeft: 10, fontSize: 15, color: "#000" },
  eyeIcon: { padding: 14 },
  
  // Erros em linha
  inlineErrorText: { color: "#EF4444", fontSize: 12, marginTop: 6, marginLeft: 4, fontWeight: "500" },
  inputErrorBorder: { borderColor: "#EF4444" },

  linkEsqueci: { color: "#00E676", textAlign: "right", marginTop: 4, marginBottom: 24, fontWeight: "600", fontSize: 13 },
  button: { borderRadius: 12, overflow: "hidden", elevation: 4, shadowColor: "#00E676", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  buttonGradient: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#0D332D", fontSize: 17, fontWeight: "bold" },
  buttonDisabled: { backgroundColor: "rgba(255,255,255,0.1)", paddingVertical: 16, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  buttonTextDisabled: { color: "#666", fontSize: 17, fontWeight: "bold" },
  footer: { flexDirection: "row", marginTop: 30, alignItems: "center" },
  footerText: { color: "#bafdbc", fontSize: 14 },
  linkCriar: { color: "#00E676", fontWeight: "bold", fontSize: 14 },
  divider: { flexDirection: "row", alignItems: "center", marginTop: 30, marginBottom: 20, width: "100%" },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  dividerText: { color: "#666", paddingHorizontal: 15, fontSize: 13 },
  socialContainer: { flexDirection: "row", gap: 12, width: "100%" },
  socialButton: { flex: 1, backgroundColor: "rgba(255,255,255,0.05)", paddingVertical: 14, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  socialButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(10, 31, 26, 0.8)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { width: "100%", backgroundColor: "rgba(15, 23, 42, 0.98)", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: "rgba(0, 230, 118, 0.3)" },
  closeModalButton: { alignSelf: "flex-end", padding: 5 },
  modalTitle: { fontSize: 22, fontWeight: "bold", color: "#00E676", marginBottom: 8, textAlign: "center" },
  modalSubtitle: { color: "#bafdbc", textAlign: "center", marginBottom: 20, fontSize: 14 },
  inputWrapperModal: { backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 12 },
  inputModal: { padding: 14, fontSize: 15, color: "#000" },
  modalButton: { borderRadius: 12, overflow: "hidden", marginTop: 20 },
  buttonGradientModal: { paddingVertical: 14, alignItems: "center", justifyContent: "center" },

  // --- ESTILOS DO ALERTA CUSTOMIZADO ---
  alertBox: { 
    width: "85%", 
    backgroundColor: "rgba(15, 23, 42, 0.98)", 
    borderRadius: 20, 
    padding: 25, 
    alignItems: "center",
    borderWidth: 1, 
    // A borda agora é dinâmica lá em cima
  },
  alertTitle: { 
    fontSize: 20, 
    fontWeight: "bold", 
    color: "#fff", 
    marginBottom: 10, 
    textAlign: "center" 
  },
  alertMessage: { 
    fontSize: 15, 
    color: "#bafdbc", 
    textAlign: "center", 
    marginBottom: 25,
    lineHeight: 20
  },
  alertButton: { 
    backgroundColor: "rgba(255,255,255,0.1)", 
    paddingVertical: 12, 
    paddingHorizontal: 30, 
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)"
  },
  alertButtonText: { 
    color: "#fff", 
    fontWeight: "bold", 
    fontSize: 16 
  }
});
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
  ScrollView,
  Modal,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Eye, EyeOff, Mail, Lock, User, AlertCircle } from "lucide-react-native";
import { Linking } from 'react-native';

const logoApp = require("@/assets/images/Logonutri.png");

// IP da sua máquina
const API_URL = 'http://192.168.0.109:3000';

export default function Register() {
  const router = useRouter();
  
  // Estados para capturar os inputs
  const [nomes, setNomes] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [senha, setSenha] = useState<string>("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Estados de Erro em Linha
  const [nomeError, setNomeError] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [senhaError, setSenhaError] = useState<string>("");

  // Estado do Alerta Customizado
  // Adicionamos 'onConfirm' para poder redirecionar o usuário após o sucesso
  const [alertConfig, setAlertConfig] = useState({ 
    visible: false, 
    title: "", 
    message: "", 
    onConfirm: null as (() => void) | null 
  });

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

  // --- FUNÇÕES AUXILIARES DE ALERTA ---
  const showCustomAlert = (title: string, message: string, onConfirm?: () => void) => {
    setAlertConfig({ visible: true, title, message, onConfirm: onConfirm || null });
  };

  const closeCustomAlert = () => {
    if (alertConfig.onConfirm) {
      alertConfig.onConfirm(); // Executa a ação (ex: ir para o login) se existir
    }
    setAlertConfig({ ...alertConfig, visible: false });
  };

  // --- VALIDAÇÕES EM LINHA ---
 const isValidEmail = (email: string) => {
  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  return gmailRegex.test(email);
};

const isValidPassword = (senha: string) => {
  // mínimo 8 caracteres, 1 letra maiúscula, 1 letra e 1 número
  const passwordRegex = /^(?=.*[A-Z])(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(senha);
};
  // O formulário só é válido se todos os campos passarem nas regras
  const isFormValid =
  nomes.trim() !== "" &&
  isValidEmail(email) &&
  isValidPassword(senha);

  function handleValidationErrors() {
  setNomeError("");
  setEmailError("");
  setSenhaError("");

  if (!nomes.trim()) {
    setNomeError("Informe seu nome completo.");
  }

  if (!email) {
    setEmailError("Informe o e-mail.");
  } else if (!isValidEmail(email)) {
    setEmailError("Use um e-mail @gmail.com válido.");
  }

  if (!senha) {
    setSenhaError("Informe a senha.");
  } else if (!isValidPassword(senha)) {
    setSenhaError(
      "A senha deve ter no mínimo 8 caracteres, 1 letra maiúscula e 1 número."
    );
  }
}

  // --- FUNÇÕES DE API ---
  async function onClickRegistrar() {
    if (!isFormValid) {
      handleValidationErrors();
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          nome_usuario: nomes, 
          email: email, 
          senha: senha 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao realizar o cadastro.");
      }

      // Alerta de sucesso chamando a rota de login no botão "OK"
      showCustomAlert("Sucesso", "Cadastro realizado com sucesso!", () => {
        router.push("/login");
      });

    } catch (error: any) {
      showCustomAlert("Erro no cadastro", error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <LinearGradient colors={["#0a1f1a", "#0f172a"]} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.container}>
            {/* Header */}
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
              <Text style={styles.saudacao}>Cadastre-se</Text>
            </Animated.View>

            {/* Formulario */}
            <Animated.View
              style={[
                styles.main,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Nome Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Digite seu nome completo</Text>
                <View style={[styles.inputWrapper, nomeError ? styles.inputErrorBorder : null]}>
                  <User color="#00E676" size={20} strokeWidth={2} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Digite seu nome"
                    placeholderTextColor="#666"
                    value={nomes}
                    onChangeText={(text) => {
                      setNomes(text);
                      setNomeError(""); // Limpa o erro ao digitar
                    }}
                  />
                </View>
                {nomeError ? <Text style={styles.inlineErrorText}>{nomeError}</Text> : null}
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Digite seu e-mail</Text>
                <View style={[styles.inputWrapper, emailError ? styles.inputErrorBorder : null]}>
                  <Mail color="#00E676" size={20} strokeWidth={2} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="seu@email.com"
                    placeholderTextColor="#666"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setEmailError(""); 
                    }}
                  />
                </View>
                {emailError ? <Text style={styles.inlineErrorText}>{emailError}</Text> : null}
              </View>

              {/* Senha Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Digite sua senha</Text>
                <View style={[styles.inputWrapper, senhaError ? styles.inputErrorBorder : null]}>
                  <Lock color="#00E676" size={20} strokeWidth={2} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Mínimo de 8 dígitos"
                    placeholderTextColor="#666"
                    secureTextEntry={!showPassword}
                    value={senha}
                    onChangeText={(text) => {
                      setSenha(text);
                      setSenhaError("");
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
                {senhaError ? <Text style={styles.inlineErrorText}>{senhaError}</Text> : null}
              </View>

              {/* Botão Criar Conta */}
              {isFormValid ? (
                <TouchableOpacity
                  style={styles.button}
                  onPress={onClickRegistrar}
                  activeOpacity={0.8}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={["#00E676", "#00C853"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.buttonText}>{isLoading ? "Cadastrando..." : "Cadastrar"}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.buttonDisabled}
                  onPress={handleValidationErrors}
                  activeOpacity={0.7}
                >
                  <Text style={styles.buttonTextDisabled}>Cadastrar</Text>
                </TouchableOpacity>
              )}

              {/* Divisor "ou" */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Botão Google */}
              <TouchableOpacity
  style={styles.socialButton}
  activeOpacity={0.8}
  onPress={() => {
    // Endereço da sua API que inicia o fluxo do Passport Google
    Linking.openURL(`${API_URL}/auth/google`);
  }}
>
  <Text style={styles.socialButtonText}>Cadastro com Google</Text>
</TouchableOpacity>

            </Animated.View>

            {/* Footer */}
            <Animated.View
              style={[
                styles.footer,
                { opacity: fadeAnim },
              ]}
            >
              <Text style={styles.footerText}>Já possui uma conta?</Text>
              <Link href="/login" asChild>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.linkCriar}> Faça login</Text>
                </TouchableOpacity>
              </Link>
            </Animated.View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- ALERTA CUSTOMIZADO ESTILIZADO --- */}
      <Modal visible={alertConfig.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.alertBox}>
            <AlertCircle 
              color={alertConfig.title === "Sucesso" ? "#00E676" : "#EF4444"} 
              size={40} 
              style={{ marginBottom: 15 }} 
            />
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
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 30, paddingVertical: 40 },
  header: { alignItems: "center", marginBottom: 30 },
  logo: { width: 180, height: 70, marginBottom: 12 },
  saudacao: { color: "#00E676", fontSize: 28, fontWeight: "800", marginBottom: 5 },
  main: { width: "100%", backgroundColor: "rgba(255,255,255,0.08)", padding: 24, borderRadius: 20, borderWidth: 1, borderColor: "rgba(0, 230, 118, 0.2)" },
  inputContainer: { marginBottom: 16 },
  label: { fontWeight: "600", fontSize: 14, marginBottom: 8, color: "#bafdbc" },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 12, borderWidth: 2, borderColor: "transparent" },
  inputIcon: { marginLeft: 14 },
  input: { flex: 1, padding: 14, paddingLeft: 10, fontSize: 15, color: "#000" },
  eyeIcon: { padding: 14 },
  
  // --- ESTILOS DE ERROS EM LINHA ---
  inlineErrorText: { color: "#EF4444", fontSize: 12, marginTop: 6, marginLeft: 4, fontWeight: "500" },
  inputErrorBorder: { borderColor: "#EF4444" },
  
  button: { borderRadius: 12, overflow: "hidden", marginTop: 20, elevation: 4, shadowColor: "#00E676", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  buttonGradient: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#0D332D", fontSize: 17, fontWeight: "bold" },
  buttonDisabled: { backgroundColor: "rgba(255,255,255,0.1)", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  buttonTextDisabled: { color: "#666", fontSize: 17, fontWeight: "bold" },
  divider: { flexDirection: "row", alignItems: "center", marginTop: 25, marginBottom: 25, width: "100%" },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  dividerText: { color: "#666", paddingHorizontal: 15, fontSize: 13 },
  socialButton: { backgroundColor: "rgba(255,255,255,0.05)", paddingVertical: 16, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  socialButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  footer: { flexDirection: "row", marginTop: 25, alignItems: "center" },
  footerText: { color: "#bafdbc", fontSize: 14 },
  linkCriar: { color: "#00E676", fontWeight: "bold", fontSize: 14 },

  // --- ESTILOS DO ALERTA CUSTOMIZADO ---
  modalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(10, 31, 26, 0.8)", 
    justifyContent: "center", 
    alignItems: "center", 
    padding: 20 
  },
  alertBox: { 
    width: "85%", 
    backgroundColor: "rgba(15, 23, 42, 0.98)", 
    borderRadius: 20, 
    padding: 25, 
    alignItems: "center",
    borderWidth: 1, 
    borderColor: "rgba(255, 255, 255, 0.1)" 
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
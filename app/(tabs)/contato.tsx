import React, { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Linking } from 'react-native';
import { 
  ChevronLeft,
  ChevronDown,
  MessageCircle,
  Mail,
  Phone,
  Instagram,
  Send,
  CheckCircle2,
  MapPin,
  Clock,
  Facebook,
  Twitter,
  User,
  Code
} from "lucide-react-native";

const API_URL = 'http://192.168.0.109:3000'; // Ajuste para o IP correto da sua API

export default function Contato() {
  const router = useRouter();
  
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  
  const [modalSelectVisible, setModalSelectVisible] = useState(false);
  const [opcoesDestino, setOpcoesDestino] = useState<{id: string | number, nome: string, icon: any}[]>([]);

  // Busca os Nutricionistas da API para montar as opções de contato
  // Busca os Nutricionistas da API para montar as opções de contato
  useEffect(() => {
    const buscarNutricionistas = async () => {
      try {
        const res = await fetch(`${API_URL}/nutricionistas`);
        
        // Só tenta ler o JSON se o servidor responder com status 200 OK
        if (res.ok) {
          const data = await res.json();
          const formatado = data.map((n: any) => ({
            id: n.id,
            nome: n.nome || n.nome_nutricionista || "Nutricionista",
            icon: User 
          }));
          
          setOpcoesDestino([
            ...formatado,
            { id: "dev", nome: "Desenvolvedores do App", icon: Code }
          ]);
        } else {
          // Se a API não deu 200 (ex: deu 404 ou 500), ignoramos o erro
          console.log("A API /nutricionistas retornou um erro:", res.status);
          setOpcoesDestino([{ id: "dev", nome: "Desenvolvedores do App", icon: Code }]);
        }
      } catch (error) {
        // Se a rede falhar completamente, o catch apanha e não envia throw de erro para a tela
        console.log("Sem conexão à API de nutricionistas.");
        setOpcoesDestino([{ id: "dev", nome: "Desenvolvedores do App", icon: Code }]);
      }
    };

    buscarNutricionistas();
  }, []);

  const canaisContato = [
  {
    id: 1,
    titulo: "WhatsApp",
    info: "(11) 99999-9999",
    descricao: "Fale conosco no WhatsApp",
    icon: MessageCircle,
    cor: "#25D366",
    url: "https://wa.me/5511999999999",
    fallback: "https://wa.me/5511999999999"
  },
  {
    id: 2,
    titulo: "Telefone",
    info: "(11) 99999-9999",
    descricao: "Ligue para nós",
    icon: Phone,
    cor: "#34B7F1",
    url: "tel:+5511999999999"
  },
  {
    id: 3,
    titulo: "Email",
    info: "contato@nutrivida.com",
    descricao: "Envie um email",
    icon: Mail,
    cor: "#EA4335",
    url: "mailto:contato@nutrivida.com"
  }
];

  const redesSociais = [
    {
  id: 1,
  nome: "Instagram",
  usuario: "@nutrivida",
  icon: Instagram,
  cor: "#E4405F",
  url: "https://www.instagram.com/site.nutrivida/"
},
{
  id: 2,
  nome: "Facebook",
  usuario: "/nutrivida",
  icon: Facebook,
  cor: "#1877F2",
  url: "https://www.facebook.com/profile.php?id=61587956773052"
}
  ];

  const formatPhone = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    let formatted = cleaned;
    if (cleaned.length >= 11) formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    else if (cleaned.length >= 7) formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    else if (cleaned.length >= 2) formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return formatted;
  };

  const validarFormulario = () => {
    if (!nome.trim()) return Alert.alert("Atenção", "Por favor, informe seu nome."), false;
    if (!email.trim() || !email.includes("@")) return Alert.alert("Atenção", "Por favor, informe um email válido."), false;
    if (telefone.replace(/\D/g, "").length < 10) return Alert.alert("Atenção", "Por favor, informe um telefone válido."), false;
    if (!destinatario) return Alert.alert("Atenção", "Por favor, selecione com quem deseja falar."), false;
    if (!mensagem.trim() || mensagem.trim().length < 10) return Alert.alert("Atenção", "Por favor, escreva uma mensagem com pelo menos 10 caracteres."), false;
    return true;
  };

  const enviarMensagem = async () => {
    if (!validarFormulario()) return;
    setEnviando(true);
    
    try {
      const destinatarioSelecionado = opcoesDestino.find(opt => opt.id === destinatario);
      const nomeAssunto = destinatarioSelecionado ? destinatarioSelecionado.nome : "Geral";

      const dadosContato = {
        nome: nome,
        email: email,
        telefone: telefone,
        // Removemos o 'remetente' para evitar o erro no SQL. 
        // O assunto vai junto com a mensagem.
        mensagem: `[Assunto: ${nomeAssunto}]\n\n${mensagem}`
      };

      const response = await fetch(`${API_URL}/contatos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosContato)
      });

      if (response.ok) {
        Alert.alert(
          "Mensagem Enviada!",
          "Recebemos sua mensagem e retornaremos em breve. Obrigado por entrar em contato!",
          [{ text: "OK", onPress: () => { setNome(""); setEmail(""); setTelefone(""); setDestinatario(""); setMensagem(""); } }]
        );
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro desconhecido do servidor");
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      Alert.alert("Erro", "Não foi possível enviar a mensagem. Verifique a sua conexão e tente novamente.");
    } finally {
      setEnviando(false);
    }
  };
  // Encontra o objeto selecionado para exibir o nome correto no botão
  const destinatarioSelecionado = opcoesDestino.find(opt => String(opt.id) === destinatario);

  return (
    <LinearGradient colors={["#0a1f1a", "#0f172a"]} style={styles.gradient}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <ChevronLeft color="#00E676" size={28} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fale Conosco</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView 
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Intro Card */}
          <View style={styles.introCard}>
            <View style={styles.introIconBg}>
              <MessageCircle color="#00E676" size={32} strokeWidth={2} />
            </View>
            <Text style={styles.introTitle}>Como podemos ajudar?</Text>
            <Text style={styles.introText}>
              Estamos aqui para tirar suas dúvidas e ouvir suas sugestões!
            </Text>
          </View>

          {/* Canais de Contato Rápido */}
          <View style={styles.section}>
  <Text style={styles.sectionTitle}>Contato Direto</Text>
  {canaisContato.map((canal) => {
    const IconComponent = canal.icon;

    const handlePress = async () => {
  try {
    const supported = await Linking.canOpenURL(canal.url);

    if (supported) {
      await Linking.openURL(canal.url);
    } else if (canal.fallback) {
      await Linking.openURL(canal.fallback);
    } else {
      Alert.alert("Erro", "Não foi possível abrir o aplicativo.");
    }
  } catch (error) {
    Alert.alert("Erro", "Algo deu errado ao abrir o link.");
  }
};
    return (
      <TouchableOpacity
        key={canal.id}
        style={styles.canalCard}
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <View style={[styles.canalIconBg, { backgroundColor: `${canal.cor}20` }]}>
          <IconComponent color={canal.cor} size={24} strokeWidth={2.5} />
        </View>

        <View style={styles.canalInfo}>
          <Text style={styles.canalTitulo}>{canal.titulo}</Text>
          <Text style={styles.canalContato}>{canal.info}</Text>
          <Text style={styles.canalDescricao}>{canal.descricao}</Text>
        </View>

        <View style={styles.canalArrow}>
          <ChevronLeft
            color="#666"
            size={20}
            strokeWidth={2}
            style={{ transform: [{ rotate: '180deg' }] }}
          />
        </View>
      </TouchableOpacity>
    );
  })}
</View>

          {/* Formulário de Contato */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Enviar Mensagem</Text>
            
            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome Completo *</Text>
                <TextInput
                  style={styles.input}
                  value={nome}
                  onChangeText={setNome}
                  placeholder="Digite seu nome"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="seu@email.com"
                  placeholderTextColor="#666"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Telefone / WhatsApp *</Text>
                <TextInput
                  style={styles.input}
                  value={telefone}
                  onChangeText={(t) => setTelefone(formatPhone(t))}
                  placeholder="(00) 00000-0000"
                  placeholderTextColor="#666"
                  keyboardType="phone-pad"
                  maxLength={15}
                />
              </View>

              {/* SELECT CUSTOMIZADO */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Com quem deseja falar? *</Text>
                <TouchableOpacity 
                  style={styles.selectInput} 
                  activeOpacity={0.8}
                  onPress={() => setModalSelectVisible(true)}
                >
                  <Text style={[styles.selectText, !destinatario && { color: "#666" }]}>
                    {destinatarioSelecionado ? destinatarioSelecionado.nome : "Selecione um destinatário"}
                  </Text>
                  <ChevronDown color="#00E676" size={20} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mensagem *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={mensagem}
                  onChangeText={setMensagem}
                  placeholder="Digite sua mensagem aqui..."
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{mensagem.length} / 500</Text>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, enviando && styles.submitButtonDisabled]}
                onPress={enviarMensagem}
                activeOpacity={0.8}
                disabled={enviando}
              >
                {enviando ? (
                  <Text style={styles.submitButtonText}>Enviando...</Text>
                ) : (
                  <>
                    <Send color="#0D332D" size={20} strokeWidth={2.5} />
                    <Text style={styles.submitButtonText}>Enviar Mensagem</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.formNote}>
                * Campos obrigatórios. Responderemos em até 24 horas úteis.
              </Text>
            </View>
          </View>

          {/* Redes Sociais */}
          <View style={styles.section}>
  <Text style={styles.sectionTitle}>Redes Sociais</Text>
  <View style={styles.socialContainer}>
    {redesSociais.map((rede) => {
      const IconComponent = rede.icon;

      const handlePress = () => {
        Linking.openURL(rede.url);
      };

      return (
        <TouchableOpacity
          key={rede.id}
          style={styles.socialCard}
          activeOpacity={0.7}
          onPress={handlePress}
        >
          <View style={[styles.socialIconBg, { backgroundColor: `${rede.cor}20` }]}>
            <IconComponent color={rede.cor} size={28} strokeWidth={2} />
          </View>
          <Text style={styles.socialNome}>{rede.nome}</Text>
          <Text style={styles.socialUsuario}>{rede.usuario}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
</View>

          {/* Informações Adicionais */}
          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <MapPin color="#00E676" size={20} strokeWidth={2} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Endereço</Text>
                <Text style={styles.infoText}>
                  Rua das Flores, 123{"\n"}
                  Centro - Taquaritinga/SP{"\n"}
                  CEP: 15900-000
                </Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Clock color="#00E676" size={20} strokeWidth={2} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Horário de Atendimento</Text>
                <Text style={styles.infoText}>
                  Segunda a Sexta: 8h às 18h{"\n"}
                  Sábado: 8h às 12h{"\n"}
                  Domingo: Fechado
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.footerSpace} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL DO SELECT DE CONTATOS */}
      <Modal
        visible={modalSelectVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalSelectVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setModalSelectVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Com quem deseja falar?</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {opcoesDestino.map((item) => {
                const OptionIcon = item.icon;
                const isSelected = destinatario === String(item.id);
                
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.modalOption}
                    onPress={() => {
                      setDestinatario(String(item.id));
                      setModalSelectVisible(false);
                    }}
                  >
                    <OptionIcon color={isSelected ? "#00E676" : "#94a3b8"} size={20} />
                    
                    <Text style={[styles.modalOptionText, isSelected && { color: "#00E676", fontWeight: "bold" }]}>
                      {item.nome}
                    </Text>
                    
                    {isSelected && (
                      <CheckCircle2 color="#00E676" size={20} style={{ marginLeft: 'auto' }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, backgroundColor: "rgba(10, 31, 26, 0.95)" },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0, 230, 118, 0.15)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  placeholder: { width: 40 },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  introCard: { marginHorizontal: 20, marginTop: 20, backgroundColor: "rgba(0, 230, 118, 0.1)", borderRadius: 20, padding: 25, alignItems: "center", borderWidth: 1, borderColor: "rgba(0, 230, 118, 0.3)" },
  introIconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(0, 230, 118, 0.2)", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  introTitle: { fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 8 },
  introText: { fontSize: 14, color: "#bafdbc", textAlign: "center", lineHeight: 20 },
  section: { marginTop: 30, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#fff", marginBottom: 15 },
  canalCard: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: 16, padding: 16, marginBottom: 12, gap: 15, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)" },
  canalIconBg: { width: 50, height: 50, borderRadius: 25, justifyContent: "center", alignItems: "center" },
  canalInfo: { flex: 1 },
  canalTitulo: { fontSize: 15, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  canalContato: { fontSize: 14, color: "#00E676", marginBottom: 2 },
  canalDescricao: { fontSize: 12, color: "#bafdbc" },
  canalArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255, 255, 255, 0.05)", justifyContent: "center", alignItems: "center" },
  formCard: { backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)" },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#bafdbc", marginBottom: 8 },
  input: { backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: 12, padding: 16, fontSize: 15, color: "#fff", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)" },
  
  // ESTILOS DO SELECT CUSTOMIZADO
  selectInput: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)" },
  selectText: { fontSize: 15, color: "#fff" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { width: "100%", maxHeight: "70%", backgroundColor: "#0f172a", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(0, 230, 118, 0.3)" },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)" },
  modalOption: { flexDirection: "row", alignItems: "center", paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)", gap: 12 },
  modalOptionText: { color: "#e2e8f0", fontSize: 16 },

  textArea: { height: 120, textAlignVertical: "top" },
  charCount: { fontSize: 11, color: "#666", marginTop: 6, textAlign: "right" },
  submitButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#00E676", paddingVertical: 16, borderRadius: 16, marginTop: 10 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 16, fontWeight: "bold", color: "#0D332D" },
  formNote: { fontSize: 11, color: "#666", textAlign: "center", marginTop: 12, lineHeight: 16 },
  socialContainer: { flexDirection: "row", gap: 12 },
  socialCard: { flex: 1, backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)" },
  socialIconBg: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  socialNome: { fontSize: 13, fontWeight: "600", color: "#fff", marginBottom: 4 },
  socialUsuario: { fontSize: 11, color: "#bafdbc" },
  infoSection: { paddingHorizontal: 20, marginTop: 30, gap: 12 },
  infoCard: { flexDirection: "row", backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: 16, padding: 18, gap: 15, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)" },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: "bold", color: "#fff", marginBottom: 6 },
  infoText: { fontSize: 13, color: "#bafdbc", lineHeight: 20 },
  faqBanner: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginTop: 30, backgroundColor: "rgba(255, 184, 0, 0.1)", borderRadius: 20, padding: 20, gap: 15, borderWidth: 1, borderColor: "rgba(255, 184, 0, 0.3)" },
  faqIconBg: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255, 184, 0, 0.2)", justifyContent: "center", alignItems: "center" },
  faqContent: { flex: 1 },
  faqTitle: { fontSize: 16, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  faqText: { fontSize: 13, color: "#FFB800" },
  footerSpace: { height: 20 },
});
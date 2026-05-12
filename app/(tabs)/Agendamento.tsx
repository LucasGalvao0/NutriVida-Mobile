import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Image,
  Animated,
  Modal,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Search,
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  ChevronLeft,
  X,
  Building2,
  AlertCircle
} from "lucide-react-native";

const { width } = Dimensions.get("window");
const perfilIcon = require("@/assets/images/perfilicon.png");
const logoApp = require("@/assets/images/logo.png");
const imgConsultorio = require("@/assets/images/consultorio.jpg");

const API_URL = 'http://192.168.0.109:3000'; 

export default function HomeAgendamentos() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Estados
  const [searchQuery, setSearchQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [usuario, setUsuario] = useState({ nome: "", id: null });
  const [agendamentoAtual, setAgendamentoAtual] = useState<any>(null);
  
  // Guardamos todos os consultórios em um estado só para facilitar a busca
  const [todosConsultorios, setTodosConsultorios] = useState([]);
  const [consultoriosRecomendados, setConsultoriosRecomendados] = useState([]);
  const [consultoriosVisitados, setConsultoriosVisitados] = useState([]);
  const [dataHoje, setDataHoje] = useState("");

  const [alertConfig, setAlertConfig] = useState({ 
    visible: false, 
    title: "", 
    message: "", 
    onConfirm: null as (() => void) | null 
  });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const hoje = new Date();
    setDataHoje(`${diasSemana[hoje.getDay()]} ${hoje.getDate()} de ${meses[hoje.getMonth()]}`);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarDadosIniciais();
    }, [])
  );

  const showCustomAlert = (title: string, message: string, onConfirm?: () => void) => {
    setAlertConfig({ visible: true, title, message, onConfirm: onConfirm || null });
  };

  const closeCustomAlert = () => {
    if (alertConfig.onConfirm) alertConfig.onConfirm();
    setAlertConfig({ ...alertConfig, visible: false });
  };

  const carregarDadosIniciais = async () => {
    try {
      const usuarioRaw = await AsyncStorage.getItem("dadosUsuario");
      if (!usuarioRaw) {
        showCustomAlert("Acesso Negado", "Logue para acessar.", () => router.replace("/login"));
        return;
      }
      
      const user = JSON.parse(usuarioRaw);
      const nomeCompleto = user.nome_usuario || user.nome || "Usuário";
      setUsuario({ nome: nomeCompleto.split(' ')[0], id: user.id });

      const resAgendamentos = await fetch(`${API_URL}/agendamentos`);
      const agendamentos = await resAgendamentos.json();
      const meuAgendamento = agendamentos.find((a: any) => a.usuario_id === user.id);
      
      if (meuAgendamento) {
        try {
            const dataLimpa = meuAgendamento.data.substring(0, 10);
            const [anoStr, mesStr, diaStr] = dataLimpa.split('-');
            const dataObj = new Date(Number(anoStr), Number(mesStr) - 1, Number(diaStr));
            const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            const nomeMes = meses[dataObj.getMonth()];

            setAgendamentoAtual({
                id: meuAgendamento.id,
                status: "Confirmado",
                servico: meuAgendamento.nome_servico || "Serviço",
                consultorio: meuAgendamento.consultorio_nome || "Consultório",
                dataCompleta: `${String(dataObj.getDate()).padStart(2, '0')} de ${nomeMes}`,
                mes: nomeMes ? nomeMes.toUpperCase() : "MÊS",
                dia: dataObj.getDate(),
                hora: meuAgendamento.hora,
                valor: meuAgendamento.preco ? `R$ ${Number(meuAgendamento.preco).toFixed(2)}` : "Não informado"
            });
        } catch (e) { console.error(e); }
      } else {
        setAgendamentoAtual(null);
      }

      const resConsultorios = await fetch(`${API_URL}/consultorios`);
      const consultorios = await resConsultorios.json();
      consultorios.sort((a: any, b: any) => a.id - b.id);

      setTodosConsultorios(consultorios);

      const recomendados: any[] = [];
      const visitados: any[] = [];
      consultorios.forEach((c: any, index: number) => {
        if (index % 3 === 0) recomendados.push(c);
        else if (index % 3 === 1) visitados.push(c);
      });
      setConsultoriosRecomendados(recomendados);
      setConsultoriosVisitados(visitados);

    } catch (error) {
      console.error(error);
      showCustomAlert("Erro de Conexão", "Não foi possível conectar ao servidor.");
    }
  };

  const cancelarReserva = async () => {
    if (!agendamentoAtual) return;
    try {
      const response = await fetch(`${API_URL}/agendamentos/${agendamentoAtual.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error("Falha ao cancelar na API");
      setAgendamentoAtual(null);
      setModalVisible(false);
      showCustomAlert("Sucesso", "Sua reserva foi cancelada com sucesso!");
    } catch (error) {
      showCustomAlert("Erro", "Não foi possível cancelar a reserva.");
    }
  };

  const irParaReserva = async (consultorio: any) => {
    try {
      await AsyncStorage.setItem('consultorioSelecionado', JSON.stringify(consultorio));
      router.push({ pathname: '/reserva', params: { id: consultorio.id } });
    } catch (error) { console.error(error); }
  };

  // --- LÓGICA DE FILTRAGEM ---
  const consultoriosFiltrados = todosConsultorios.filter((c: any) => 
    c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.endereco.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <LinearGradient colors={["#0a1f1a", "#0f172a"]} style={styles.gradient}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/")}>
          <ChevronLeft color="#00E676" size={32} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image source={logoApp} style={styles.logo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Agendamento</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/perfil")}>
          <Image source={perfilIcon} style={styles.perfilImg} resizeMode="cover" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, paddingBottom: 40 }}>
          
          <View style={styles.greetingSection}>
            <Text style={styles.greetingTitle}>Olá, {usuario.nome}</Text>
            <Text style={styles.dateText}>{dataHoje}</Text>

            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nome ou endereço..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery} // Atualiza o estado da busca
              />
              <TouchableOpacity style={styles.searchButton}>
                <Search color="#fff" size={20} />
              </TouchableOpacity>
            </View>
          </View>

          {/* RENDERIZAÇÃO CONDICIONAL: Se houver busca, mostra resultados. Se não, mostra o layout normal. */}
          {searchQuery.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Resultados para "{searchQuery}"</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselContainer}>
                {consultoriosFiltrados.length > 0 ? (
                  consultoriosFiltrados.map((item: any) => (
                    <View key={item.id} style={styles.clinicCard}>
                      <Image source={item.imagem ? { uri: item.imagem } : imgConsultorio} style={styles.clinicImage} />
                      <View style={styles.clinicCardContent}>
                        <Text style={styles.clinicCardTitle}>{item.nome}</Text>
                        <Text style={styles.clinicCardAddress} numberOfLines={2}>{item.endereco}</Text>
                        <TouchableOpacity style={styles.bookButton} onPress={() => irParaReserva(item)}>
                          <Text style={styles.bookButtonText}>Reservar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={{ color: "#94a3b8", marginLeft: 20 }}>Nenhum consultório encontrado.</Text>
                )}
              </ScrollView>
            </View>
          ) : (
            <>
              {/* Layout Normal: Próximo Agendamento */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Seu Próximo Agendamento</Text>
                {agendamentoAtual ? (
                  <TouchableOpacity style={styles.appointmentCard} activeOpacity={0.8} onPress={() => setModalVisible(true)}>
                    <View style={styles.appointmentLeft}>
                      <View style={styles.statusBadge}><Text style={styles.statusText}>● {agendamentoAtual.status}</Text></View>
                      <Text style={styles.appointmentService}>{agendamentoAtual.servico}</Text>
                      <Text style={styles.appointmentClinic}>{agendamentoAtual.consultorio}</Text>
                    </View>
                    <View style={styles.appointmentRight}>
                      <Text style={styles.appointmentMonth}>{agendamentoAtual.mes}</Text>
                      <Text style={styles.appointmentDay}>{agendamentoAtual.dia}</Text>
                      <Text style={styles.appointmentTime}>{agendamentoAtual.hora}</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                   <View style={[styles.appointmentCard, { justifyContent: 'center', paddingVertical: 40 }]}>
                     <Text style={{ color: '#94a3b8', fontSize: 16 }}>Você não possui reservas no momento.</Text>
                   </View>
                )}
              </View>

              {/* Recomendados */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Consultórios Disponíveis</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselContainer}>
                  {consultoriosRecomendados.map((item: any) => (
                    <View key={item.id} style={styles.clinicCard}>
                      <Image source={item.imagem ? { uri: item.imagem } : imgConsultorio} style={styles.clinicImage} />
                      <View style={styles.clinicCardContent}>
                        <Text style={styles.clinicCardTitle}>{item.nome}</Text>
                        <Text style={styles.clinicCardAddress} numberOfLines={2}>{item.endereco}</Text>
                        <TouchableOpacity style={styles.bookButton} onPress={() => irParaReserva(item)}>
                          <Text style={styles.bookButtonText}>Reservar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
              
              {/* Mais Visitados */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Mais Visitados</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselContainer}>
                  {consultoriosVisitados.map((item: any) => (
                    <View key={`visited-${item.id}`} style={styles.clinicCard}>
                      <Image source={item.imagem ? { uri: item.imagem } : imgConsultorio} style={styles.clinicImage} />
                      <View style={styles.clinicCardContent}>
                        <Text style={styles.clinicCardTitle}>{item.nome}</Text>
                        <Text style={styles.clinicCardAddress} numberOfLines={2}>{item.endereco}</Text>
                        <TouchableOpacity style={styles.bookButton} onPress={() => irParaReserva(item)}>
                          <Text style={styles.bookButtonText}>Reservar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </>
          )}

        </Animated.View>
      </ScrollView>

      {/* Modal Verificar Reserva */}
      {agendamentoAtual && (
        <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlaySidebar}>
            <View style={styles.modalContentSidebar}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Verificar Reserva</Text>
                <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                  <X color="#ef4444" size={24} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Image source={imgConsultorio} style={styles.modalMapImage} />
                <View style={styles.modalStatusBadge}><Text style={styles.modalStatusText}>● {agendamentoAtual.status}</Text></View>
                <View style={styles.modalDetailsContainer}>
                  <Text style={styles.modalDetailsTitle}>{agendamentoAtual.servico}</Text>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Data</Text><Text style={styles.detailValue}>{agendamentoAtual.dataCompleta}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Horário</Text><Text style={styles.detailValue}>{agendamentoAtual.hora}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Consultório</Text><Text style={styles.detailValue}>{agendamentoAtual.consultorio}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Valor</Text><Text style={styles.detailValue}>{agendamentoAtual.valor}</Text></View>
                </View>
                <TouchableOpacity style={styles.cancelButton} activeOpacity={0.8} onPress={cancelarReserva}>
                  <Text style={styles.cancelButtonText}>Cancelar Reserva</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Alerta Customizado */}
      <Modal visible={alertConfig.visible} transparent animationType="fade">
        <View style={styles.modalOverlayAlert}>
          <View style={styles.alertBox}>
            <AlertCircle color={alertConfig.title === "Sucesso" ? "#00E676" : "#EF4444"} size={40} style={{ marginBottom: 15 }} />
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
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: "rgba(10, 31, 26, 0.95)",
  },
  backButton: {
    padding: 5,
    marginLeft: -5,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 30,
    height: 30,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  perfilImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#00E676",
  },
  container: {
    flex: 1,
  },
  greetingSection: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
  },
  greetingTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  dateText: {
    fontSize: 16,
    color: "#94a3b8",
    marginBottom: 25,
  },
  searchContainer: {
    flexDirection: "row",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "rgba(30, 41, 59, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(0, 230, 118, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: "#00E676",
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginHorizontal: 20,
    marginBottom: 15,
  },
  appointmentCard: {
    marginHorizontal: 20,
    backgroundColor: "rgba(0, 230, 118, 0.1)",
    borderWidth: 2,
    borderColor: "#00E676",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  appointmentLeft: {
    flex: 1,
    gap: 5,
  },
  statusBadge: {
    backgroundColor: "rgba(0, 230, 118, 0.2)",
    borderWidth: 1,
    borderColor: "#00E676",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    marginBottom: 5,
  },
  statusText: {
    color: "#00E676",
    fontSize: 12,
    fontWeight: "bold",
  },
  appointmentService: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  appointmentClinic: {
    fontSize: 14,
    color: "#94a3b8",
  },
  appointmentRight: {
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(0, 230, 118, 0.15)",
    borderRadius: 16,
    padding: 15,
    alignItems: "center",
    minWidth: 100,
  },
  appointmentMonth: {
    fontSize: 12,
    color: "#00E676",
    fontWeight: "bold",
    letterSpacing: 1,
  },
  appointmentDay: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
    marginVertical: 2,
  },
  appointmentTime: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "600",
  },
  carouselContainer: {
    paddingHorizontal: 20,
    gap: 15,
  },
  clinicCard: {
    width: 260,
    backgroundColor: "rgba(30, 41, 59, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(0, 230, 118, 0.15)",
    borderRadius: 16,
    overflow: "hidden",
  },
  clinicImage: {
    width: "100%",
    height: 140,
    backgroundColor: "#1e293b",
  },
  clinicCardContent: {
    padding: 15,
  },
  clinicCardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  clinicCardAddress: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 15,
    minHeight: 35,
  },
  bookButton: {
    backgroundColor: "#00E676",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  bookButtonText: {
    color: "#0D332D",
    fontWeight: "bold",
    fontSize: 15,
  },
  modalOverlaySidebar: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContentSidebar: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(0, 230, 118, 0.2)",
    padding: 25,
    height: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalMapImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 15,
  },
  modalStatusBadge: {
    backgroundColor: "rgba(0, 230, 118, 0.2)",
    borderWidth: 1,
    borderColor: "#00E676",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  modalStatusText: {
    color: "#00E676",
    fontSize: 12,
    fontWeight: "bold",
  },
  modalDetailsContainer: {
    marginBottom: 30,
  },
  modalDetailsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  detailLabel: {
    color: "#94a3b8",
    fontSize: 15,
  },
  detailValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlayAlert: {
    flex: 1,
    backgroundColor: "rgba(10, 31, 26, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  alertBox: {
    width: "85%",
    backgroundColor: "rgba(15, 23, 42, 0.98)",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
  },
  alertMessage: {
    fontSize: 15,
    color: "#bafdbc",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 20,
  },
  alertButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  alertButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Animated,
  Modal,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MapPin,
  Clock,
  Phone,
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  X,
  Copy,
  Info,
  CheckCircle2,
  AlertCircle
} from "lucide-react-native";
import * as Clipboard from 'expo-clipboard';

const { width } = Dimensions.get("window");

const imgConsultorio = require("@/assets/images/imgReserva.png");
const imgMap = require("@/assets/images/Lugar que fica consultorio.jpg");

// IMPORTANTE: Ajuste para o IP da sua API
const API_URL = 'http://192.168.11.255:3000';

export default function DetalhesReserva() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); 
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Estados de Dados
  const [consultorio, setConsultorio] = useState<any>(null);
  const [servicos, setServicos] = useState<any[]>([]);
  const [usuario, setUsuario] = useState<any>(null);

  // Estados de Fluxo do Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  
  // Estados do Calendário
  const [mesAtual, setMesAtual] = useState(new Date());

  // Estado do Alerta Customizado
  const [alertConfig, setAlertConfig] = useState({ 
    visible: false, 
    title: "", 
    message: "", 
    onConfirm: null as (() => void) | null 
  });

  // --- Efeito apenas para Animação de Entrada ---
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // --- BUSCA DE DADOS COM FOCO ---
  useFocusEffect(
    useCallback(() => {
      // Limpar os estados ao entrar/voltar na tela para não "piscar" os dados do consultório anterior
      setConsultorio(null);
      setServicos([]);
      setModalVisible(false);
      setSelectedService(null);
      setSelectedDate(null);
      setSelectedTime(null);
      setHorariosDisponiveis([]);
      setMesAtual(new Date()); // Reseta o calendário para o mês atual

      carregarDados();
    }, [id])
  );

  // --- ALERTA CUSTOMIZADO ---
  const showCustomAlert = (title: string, message: string, onConfirm?: () => void) => {
    setAlertConfig({ visible: true, title, message, onConfirm: onConfirm || null });
  };
  
  const closeCustomAlert = () => {
    if (alertConfig.onConfirm) alertConfig.onConfirm();
    setAlertConfig({ ...alertConfig, visible: false });
  };

  const carregarDados = async () => {
    try {
      const usuarioRaw = await AsyncStorage.getItem("dadosUsuario");
      if (!usuarioRaw) {
        showCustomAlert("Acesso Negado", "Faça login para reservar.", () => router.replace("/login"));
        return;
      }
      setUsuario(JSON.parse(usuarioRaw));

      let consultorioId = id;
      if (!consultorioId) {
         const consultorioLocal = await AsyncStorage.getItem("consultorioSelecionado");
         if (consultorioLocal) consultorioId = JSON.parse(consultorioLocal).id;
      }

      if (!consultorioId) return; // Se não tiver ID nenhum, não faz nada

      const response = await fetch(`${API_URL}/consultorios/${consultorioId}`);
      if (!response.ok) throw new Error("Erro ao buscar consultório");
      
      const data = await response.json();
      setConsultorio(data.consultorio);
      setServicos(data.servicos);

    } catch (error: any) {
      showCustomAlert("Erro", "Erro ao carregar dados do consultório.");
    }
  };

  const copiarTelefone = async () => {
    if(consultorio && consultorio.telefone) {
      await Clipboard.setStringAsync(consultorio.telefone);
      showCustomAlert("Copiado!", "Número de telefone copiado para a área de transferência.");
    }
  };

  // --- LÓGICA DO CALENDÁRIO (DIAS) ---
  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  const mudarMes = (direcao: number) => {
    const novaData = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + direcao, 1);
    setMesAtual(novaData);
    setSelectedDate(null);
    setSelectedTime(null);
    setHorariosDisponiveis([]);
  };

  const getDiasDoMes = () => {
    const ano = mesAtual.getFullYear();
    const mes = mesAtual.getMonth();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const dias = [];
    for (let i = 1; i <= diasNoMes; i++) dias.push(i);
    return dias;
  };

  // --- LÓGICA DE HORÁRIOS ---
  const selecionarDia = (dia: number) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataSelecionadaObj = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), dia);
    
    if (dataSelecionadaObj < hoje) {
      showCustomAlert("Atenção", "Esta data já passou. Selecione um dia válido.");
      return;
    }

    setSelectedDate(dia);
    setSelectedTime(null);
    const diaSemanaIndex = dataSelecionadaObj.getDay();
    gerarHorariosDisponiveis(diaSemanaIndex);
  };

  const gerarHorariosDisponiveis = (diaSemanaIndex: number) => {
    if (!consultorio || !consultorio.horarios_funcionamento) return;

    const diasMap = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    const chaveDia = diasMap[diaSemanaIndex];
    const horarioDia = consultorio.horarios_funcionamento[chaveDia];

    if (!horarioDia || horarioDia.toLowerCase() === 'fechado' || !horarioDia.includes(' - ')) {
      setHorariosDisponiveis([]);
      return;
    }

    const [inicio, fim] = horarioDia.split(' - ');
    const [horaInicio, minutoInicio] = inicio.split(':').map(Number);
    const [horaFim, minutoFim] = fim.split(':').map(Number);

    let horaAtual = new Date();
    horaAtual.setHours(horaInicio, minutoInicio, 0, 0);
    const horaLimite = new Date();
    horaLimite.setHours(horaFim, minutoFim, 0, 0);

    const listaHorarios = [];
    while (horaAtual <= horaLimite) {
      listaHorarios.push(horaAtual.toTimeString().substring(0, 5));
      horaAtual.setMinutes(horaAtual.getMinutes() + 45); 
    }

    setHorariosDisponiveis(listaHorarios);
  };

  // --- CONFIRMAR RESERVA ---
  const formatarDataISO = (dia: number) => {
    const ano = mesAtual.getFullYear();
    const mes = String(mesAtual.getMonth() + 1).padStart(2, '0');
    const diaStr = String(dia).padStart(2, '0');
    return `${ano}-${mes}-${diaStr}`;
  };

  const confirmarReserva = async () => {
    if (!selectedDate || !selectedTime) {
      showCustomAlert("Atenção", "Por favor, selecione uma data e um horário.");
      return;
    }
    
    try {
      // 1. Verifica se já tem consulta
      const checkRes = await fetch(`${API_URL}/agendamentos`);
      const agendamentos = await checkRes.json();
      const agendamentoExistente = agendamentos.find((a: any) => a.usuario_id === usuario.id);

      if (agendamentoExistente) {
        setModalVisible(false);
        setTimeout(() => {
          showCustomAlert("Atenção", "Você já possui uma reserva ativa.");
        }, 500);
        return;
      }

      // 2. Prepara os dados
      const agendamento = {
        usuario_id: usuario.id,
        consultorio_id: consultorio.id,
        servico_id: selectedService.id,
        data: formatarDataISO(selectedDate),
        hora: selectedTime,
        preco: Number(selectedService.preco)
      };

      // 3. Envia para o Banco
      const response = await fetch(`${API_URL}/agendamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agendamento)
      });

      const data = await response.json(); // Tenta ler como JSON direto

      if (response.ok) {
        setModalVisible(false);
        setTimeout(() => {
          showCustomAlert("Sucesso", "Sua reserva foi confirmada!", () => {
            router.replace("/(tabs)/Agendamento"); // Caminho exato da sua aba
          });
        }, 500);
      } else {
        throw new Error(data.error || "Erro ao salvar");
      }

    } catch (error: any) {
      console.error(error);
      showCustomAlert("Erro", error.message);
    }
  };

  const abrirModalReserva = (servico: any) => {
    setSelectedService(servico);
    setSelectedDate(null);
    setSelectedTime(null);
    setHorariosDisponiveis([]);
    setModalVisible(true);
  };

  if (!consultorio) {
    return (
      <LinearGradient colors={["#0a1f1a", "#0f172a"]} style={[styles.gradient, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: "#00E676", fontSize: 18 }}>Carregando dados...</Text>
      </LinearGradient>
    );
  }

  // Mapeamento dos dias para exibição formatada
  const diasDaSemanaDisplay = [
    { key: "segunda", label: "Segunda-feira" },
    { key: "terca", label: "Terça-feira" },
    { key: "quarta", label: "Quarta-feira" },
    { key: "quinta", label: "Quinta-feira" },
    { key: "sexta", label: "Sexta-feira" },
    { key: "sabado", label: "Sábado" },
    { key: "domingo", label: "Domingo" },
  ];

  return (
    <LinearGradient colors={["#0a1f1a", "#0f172a"]} style={styles.gradient}>
      
      {/* Cabeçalho Voltar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/(tabs)/Agendamento")} style={styles.backButton}>
          <ChevronLeft color="#00E676" size={32} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fazer Reserva</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <Animated.View style={{ opacity: fadeAnim }}>
          
          {/* Imagem e Info do Consultório */}
          <View style={styles.clinicHero}>
            <Image source={consultorio.imagem ? { uri: consultorio.imagem } : imgConsultorio} style={styles.heroImage} />
            <View style={styles.clinicHeaderInfo}>
              <Text style={styles.clinicName}>{consultorio.nome}</Text>
              <View style={styles.locationRow}>
                <MapPin color="#00E676" size={16} />
                <Text style={styles.clinicAddress}>{consultorio.endereco}</Text>
              </View>
            </View>
          </View>

          {/* Seção Sobre e Horários */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Informações</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.contactRow}>
                <View>
                  <Text style={styles.infoLabel}>Telefone</Text>
                  <Text style={styles.infoValue}>{consultorio.telefone || "Não informado"}</Text>
                </View>
                <TouchableOpacity style={styles.copyButton} onPress={copiarTelefone}>
                  <Copy color="#00E676" size={18} />
                  <Text style={styles.copyText}>Copiar</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.aboutRow}>
                <Info color="#00E676" size={20} style={{ marginTop: 2 }} />
                <Text style={styles.aboutText}>{consultorio.descricao || "Clínica especializada Nutrivida."}</Text>
              </View>

              <View style={styles.divider} />

              <Text style={styles.infoLabel}>Horários de Funcionamento</Text>
              {diasDaSemanaDisplay.map((dia) => (
                <View key={dia.key} style={styles.scheduleRow}>
                  <Text style={styles.scheduleDay}>{dia.label}</Text>
                  <Text style={styles.scheduleTime}>
                    {consultorio.horarios_funcionamento?.[dia.key] || "Fechado"}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Lista de Serviços */}
          <View style={styles.servicesSection}>
            <Text style={styles.sectionTitle}>Serviços Disponíveis</Text>
            
            {servicos.map((servico) => (
              <View key={servico.id} style={styles.serviceCard}>
                <View style={styles.serviceContent}>
                  <Text style={styles.serviceName}>{servico.nome_servico || servico.nome}</Text>
                  <Text style={styles.serviceDesc} numberOfLines={2}>
                    {servico.descricao || "Sem descrição."}
                  </Text>
                  <Text style={styles.servicePrice}>
                    R$ {parseFloat(servico.preco).toFixed(2)}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.bookButton}
                  onPress={() => abrirModalReserva(servico)}
                >
                  <Text style={styles.bookButtonText}>Reservar</Text>
                </TouchableOpacity>
              </View>
            ))}

            {servicos.length === 0 && (
              <Text style={{ color: "#94a3b8", textAlign: "center", marginTop: 20 }}>Nenhum serviço disponível.</Text>
            )}
          </View>

        </Animated.View>
      </ScrollView>

      {/* --- MODAL DE DATA E HORA --- */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Escolher Data e Hora</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <X color="#ef4444" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              
              {/* Calendário Simplificado (Dias) */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={[styles.modalSectionTitle, { marginBottom: 0 }]}>
                   {nomesMeses[mesAtual.getMonth()]} {mesAtual.getFullYear()}
                </Text>
                <View style={{ flexDirection: 'row', gap: 15, paddingRight: 5 }}>
                   <TouchableOpacity onPress={() => mudarMes(-1)}>
                     <ChevronLeft color="#00E676" size={24} />
                   </TouchableOpacity>
                   <TouchableOpacity onPress={() => mudarMes(1)}>
                     <ChevronRight color="#00E676" size={24} />
                   </TouchableOpacity>
                </View>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
                {getDiasDoMes().map((dia) => {
                  const isSelected = selectedDate === dia;
                  return (
                    <TouchableOpacity
                      key={dia}
                      style={[styles.dayCard, isSelected && styles.dayCardSelected]}
                      onPress={() => selecionarDia(dia)}
                    >
                      <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                        {dia}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Horários */}
              <Text style={styles.modalSectionTitle}>Horários Disponíveis</Text>
              <View style={styles.timesGrid}>
                {selectedDate ? (
                  horariosDisponiveis.length > 0 ? (
                    horariosDisponiveis.map((hora) => {
                      const isSelected = selectedTime === hora;
                      return (
                        <TouchableOpacity
                          key={hora}
                          style={[styles.timeCard, isSelected && styles.timeCardSelected]}
                          onPress={() => setSelectedTime(hora)}
                        >
                          <Text style={[styles.timeText, isSelected && styles.timeTextSelected]}>
                            {hora}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <Text style={{ color: "#ef4444" }}>Sem horários ou fechado neste dia.</Text>
                  )
                ) : (
                  <Text style={{ color: "#94a3b8" }}>Selecione um dia primeiro.</Text>
                )}
              </View>

              {/* Resumo da Consulta */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>{selectedService?.nome_servico || selectedService?.nome}</Text>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Data</Text>
                  <Text style={styles.summaryValue}>
                    {selectedDate ? `${selectedDate} de ${nomesMeses[mesAtual.getMonth()]}` : "Selecione"}
                  </Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Horário</Text>
                  <Text style={styles.summaryValue}>
                    {selectedTime || "Selecione"}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Consultório</Text>
                  <Text style={styles.summaryValue}>{consultorio.nome}</Text>
                </View>

                <View style={[styles.summaryRow, { borderBottomWidth: 0, marginTop: 10 }]}>
                  <Text style={styles.summaryLabel}>Total</Text>
                  <Text style={styles.summaryPrice}>
                    R$ {parseFloat(selectedService?.preco || 0).toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Botão Confirmar */}
              <TouchableOpacity 
                style={[
                  styles.confirmBtn, 
                  (!selectedDate || !selectedTime) && { opacity: 0.5 }
                ]}
                onPress={confirmarReserva}
                activeOpacity={0.8}
              >
                <CheckCircle2 color="#0D332D" size={24} />
                <Text style={styles.confirmBtnText}>Confirmar Agendamento</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* --- ALERTA CUSTOMIZADO ESTILIZADO --- */}
      <Modal visible={alertConfig.visible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
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
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  clinicHero: {
    marginBottom: 20,
  },
  heroImage: {
    width: "100%",
    height: 220,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  clinicHeaderInfo: {
    padding: 20,
    marginTop: -30,
    marginHorizontal: 20,
    backgroundColor: "#0f172a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 230, 118, 0.2)",
    elevation: 10,
  },
  clinicName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  clinicAddress: {
    color: "#94a3b8",
    fontSize: 14,
    flex: 1,
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  servicesSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
  },
  infoCard: {
    backgroundColor: "rgba(30, 41, 59, 0.4)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 230, 118, 0.15)",
  },
  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 230, 118, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#00E676",
  },
  copyText: {
    color: "#00E676",
    fontWeight: "600",
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginVertical: 15,
  },
  aboutRow: {
    flexDirection: "row",
    gap: 10,
  },
  aboutText: {
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  scheduleDay: {
    color: "#94a3b8",
    fontSize: 14,
  },
  scheduleTime: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  serviceCard: {
    backgroundColor: "rgba(30, 41, 59, 0.4)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 230, 118, 0.15)",
  },
  serviceContent: {
    marginBottom: 15,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 6,
  },
  serviceDesc: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 10,
  },
  servicePrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#00E676",
  },
  bookButton: {
    backgroundColor: "rgba(0, 230, 118, 0.1)",
    borderWidth: 1,
    borderColor: "#00E676",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  bookButtonText: {
    color: "#00E676",
    fontWeight: "bold",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalContent: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 25,
    height: "90%",
    borderWidth: 1,
    borderColor: "rgba(0, 230, 118, 0.3)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
    marginTop: 10,
  },
  daysScroll: {
    marginBottom: 20,
  },
  dayCard: {
    width: 60,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  dayCardSelected: {
    backgroundColor: "#00E676",
    borderColor: "#00E676",
  },
  dayText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  dayTextSelected: {
    color: "#0D332D",
  },
  timesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 25,
  },
  timeCard: {
    width: (width - 70) / 3,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  timeCardSelected: {
    backgroundColor: "#00E676",
    borderColor: "#00E676",
  },
  timeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  timeTextSelected: {
    color: "#0D332D",
  },
  summaryCard: {
    backgroundColor: "rgba(0, 230, 118, 0.1)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 230, 118, 0.3)",
    marginBottom: 25,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  summaryLabel: {
    color: "#94a3b8",
    fontSize: 14,
  },
  summaryValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  summaryPrice: {
    color: "#00E676",
    fontSize: 22,
    fontWeight: "bold",
  },
  confirmBtn: {
    backgroundColor: "#00E676",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 18,
    marginBottom: 20,
  },
  confirmBtnText: {
    color: "#0D332D",
    fontSize: 16,
    fontWeight: "bold",
  },
  alertOverlay: {
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
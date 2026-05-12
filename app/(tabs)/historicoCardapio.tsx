import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, FlatList,
  ActivityIndicator, TouchableOpacity, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, ChevronUp, ChevronLeft, History, Calendar, Clock, ShoppingBag } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.0.109:3000';
const DIAS = ['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];

export default function HistoricoCardapio() {
  const [cardapios, setCardapios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardapioAberto, setCardapioAberto] = useState<number | null>(null);
  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  const [refeicaoAberta, setRefeicaoAberta] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function buscar() {
      try {
        const raw = await AsyncStorage.getItem('dadosUsuario');
        if (!raw) return;
        const usuario = JSON.parse(raw);
        const res = await fetch(`${API_URL}/salvarCardapio/usuario/${usuario.id}`);
        const json = await res.json();
        setCardapios(Array.isArray(json) ? json : []);
      } catch (e) {
        console.log('Erro:', e);
      } finally {
        setLoading(false);
      }
    }
    buscar();
  }, []);

  if (loading) {
    return (
      <LinearGradient colors={['#0a1f1a', '#0f172a']} style={styles.center}>
        <ActivityIndicator size="large" color="#00E676" />
        <Text style={styles.loadingText}>Carregando histórico...</Text>
      </LinearGradient>
    );
  }

  if (!cardapios.length) {
    return (
      <LinearGradient colors={['#0a1f1a', '#0f172a']} style={styles.center}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnAbs}>
          <ChevronLeft color="#00E676" size={28} />
        </TouchableOpacity>
        <History color="#00E676" size={48} />
        <Text style={styles.emptyTitle}>Nenhum cardápio ainda</Text>
        <Text style={styles.emptyText}>Gere seu primeiro cardápio personalizado!</Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/cardapio')}>
          <LinearGradient colors={['#00E676', '#00C853']} style={styles.emptyBtnGrad}>
            <Text style={styles.emptyBtnText}>Gerar Cardápio</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0a1f1a', '#0f172a']} style={styles.gradient}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color="#00E676" size={28} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerRow}>
            <History color="#00E676" size={20} />
            <Text style={styles.headerTitle}>Histórico</Text>
          </View>
          <Text style={styles.headerSub}>{cardapios.length} plano{cardapios.length !== 1 ? 's' : ''} gerado{cardapios.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={cardapios}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          let cardapio: any = {};
          try { cardapio = JSON.parse(item.cardapio_texto); } catch { return null; }

          const aberto = cardapioAberto === item.id;
          const dataFormatada = item.criado_em
            ? new Date(item.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';

          const totalCalorias = cardapio.refeicoes?.reduce((acc: number, dia: any) =>
            acc + (dia.refeicoes?.reduce((a: number, r: any) => a + (r.calorias || 0), 0) || 0), 0) || 0;

          return (
            <View style={styles.card}>
              {/* Badge de índice */}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>#{cardapios.length - index}</Text>
              </View>

              {/* Card Header */}
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setCardapioAberto(aberto ? null : item.id)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={aberto ? ['#064e3b', '#0f2d1e'] : ['#0f2d1e', '#0a1f1a']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.cardHeaderGrad}
                >
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.cardIcon}>
                      <ShoppingBag color="#00E676" size={18} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardNome} numberOfLines={1}>
                        {cardapio.nome_cardapio || cardapio.name || 'Plano Alimentar'}
                      </Text>
                      <View style={styles.cardMeta}>
                        <Calendar color="#bafdbc" size={11} />
                        <Text style={styles.cardMetaText}>{dataFormatada}</Text>
                        <Text style={styles.cardMetaDot}>·</Text>
                        <Text style={styles.cardMetaText}>{cardapio.refeicoes?.length || 0} dias</Text>
                        {totalCalorias > 0 && (
                          <>
                            <Text style={styles.cardMetaDot}>·</Text>
                            <Text style={styles.cardMetaText}>~{Math.round(totalCalorias / (cardapio.refeicoes?.length || 1))} kcal/dia</Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                  {aberto ? <ChevronUp color="#00E676" size={18} /> : <ChevronDown color="#bafdbc" size={18} />}
                </LinearGradient>
              </TouchableOpacity>

              {/* Info chips */}
              {aberto && (
                <View style={styles.chips}>
                  {cardapio.objective && <View style={styles.chip}><Text style={styles.chipText}>🎯 {cardapio.objective}</Text></View>}
                  {cardapio.alergia && cardapio.alergia !== 'Nenhuma' && <View style={styles.chip}><Text style={styles.chipText}>⚠️ {cardapio.alergia}</Text></View>}
                  {cardapio.weight && <View style={styles.chip}><Text style={styles.chipText}>⚖️ {cardapio.weight}kg</Text></View>}
                </View>
              )}

              {/* Dias */}
              {aberto && cardapio.refeicoes?.map((dia: any, diaIdx: number) => {
                const diaKey = `${item.id}-${diaIdx}`;
                const diaExp = diaAberto === diaKey;
                const calDia = dia.refeicoes?.reduce((a: number, r: any) => a + (r.calorias || 0), 0) || 0;

                return (
                  <View key={diaIdx} style={styles.diaContainer}>
                    <TouchableOpacity
                      style={styles.diaTouchable}
                      onPress={() => setDiaAberto(diaExp ? null : diaKey)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.diaBullet, diaExp && styles.diaBulletActive]} />
                      <Text style={[styles.diaNome, diaExp && styles.diaNomeActive]}>
                        {DIAS[diaIdx] || dia.nome || `Dia ${diaIdx + 1}`}
                      </Text>
                      {calDia > 0 && <Text style={styles.diaKcal}>{calDia} kcal</Text>}
                      {diaExp ? <ChevronUp color="#00E676" size={14} /> : <ChevronDown color="#bafdbc" size={14} />}
                    </TouchableOpacity>

                    {/* Refeições */}
                    {diaExp && dia.refeicoes?.map((ref: any, refIdx: number) => {
                      const refKey = `${diaKey}-${refIdx}`;
                      const refExp = refeicaoAberta === refKey;

                      return (
                        <View key={refIdx} style={styles.refCard}>
                          <TouchableOpacity
                            style={styles.refHeader}
                            onPress={() => setRefeicaoAberta(refExp ? null : refKey)}
                            activeOpacity={0.8}
                          >
                            <View style={styles.refIconBg}>
                              <Clock color="#00E676" size={12} />
                            </View>
                            <Text style={styles.refNome}>{ref.nome}</Text>
                            <Text style={styles.refHorario}>{ref.horario}</Text>
                            {ref.calorias > 0 && <Text style={styles.refKcal}>{ref.calorias} kcal</Text>}
                            {refExp ? <ChevronUp color="#00E676" size={12} /> : <ChevronDown color="#bafdbc" size={12} />}
                          </TouchableOpacity>

                          {refExp && (
                            <View style={styles.alimentosList}>
                              {ref.alimentos?.map((alimento: string, aIdx: number) => (
                                <View key={aIdx} style={styles.alimentoRow}>
                                  <View style={[
                                    styles.alimentoBullet,
                                    alimento.toLowerCase().startsWith('tempero:') && styles.alimentoBulletTempero
                                  ]} />
                                  <Text style={[
                                    styles.alimentoText,
                                    alimento.toLowerCase().startsWith('tempero:') && styles.alimentoTempero
                                  ]}>{alimento}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })}

              {aberto && <View style={styles.cardFooter}><View style={styles.footerLine} /></View>}
            </View>
          );
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 30 },
  loadingText: { color: '#bafdbc', fontSize: 15, fontWeight: '500' },

  // Empty
  backBtnAbs: { position: 'absolute', top: 55, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,230,118,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(0,230,118,0.3)' },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 12 },
  emptyText: { color: '#bafdbc', fontSize: 14, textAlign: 'center' },
  emptyBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 20, width: '70%' },
  emptyBtnGrad: { paddingVertical: 14, alignItems: 'center' },
  emptyBtnText: { color: '#0D332D', fontWeight: '700', fontSize: 16 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 55, paddingBottom: 16, backgroundColor: 'rgba(10,31,26,0.95)', borderBottomWidth: 1, borderBottomColor: 'rgba(0,230,118,0.2)' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,230,118,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(0,230,118,0.3)' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: '#bafdbc', fontSize: 12 },

  // List
  list: { padding: 16, paddingBottom: 40, gap: 14 },

  // Card
  card: { backgroundColor: 'rgba(15,23,42,0.95)', borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(0,230,118,0.2)', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  badge: { position: 'absolute', top: 12, right: 52, zIndex: 10, backgroundColor: 'rgba(0,230,118,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)' },
  badgeText: { color: '#00E676', fontSize: 10, fontWeight: '700' },
  cardHeader: { borderRadius: 18, overflow: 'hidden' },
  cardHeaderGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,230,118,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(0,230,118,0.3)' },
  cardNome: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  cardMetaText: { color: '#bafdbc', fontSize: 11 },
  cardMetaDot: { color: '#bafdbc', fontSize: 11 },

  // Chips
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  chip: { backgroundColor: 'rgba(0,230,118,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,230,118,0.15)' },
  chipText: { color: '#bafdbc', fontSize: 11, fontWeight: '500' },

  // Dia
  diaContainer: { marginHorizontal: 12, marginTop: 8, backgroundColor: 'rgba(0,230,118,0.04)', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,230,118,0.1)', marginBottom: 2 },
  diaTouchable: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  diaBullet: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(0,230,118,0.3)', borderWidth: 1.5, borderColor: 'rgba(0,230,118,0.4)' },
  diaBulletActive: { backgroundColor: '#00E676', borderColor: '#00E676' },
  diaNome: { color: '#bafdbc', fontSize: 14, fontWeight: '600', flex: 1 },
  diaNomeActive: { color: '#fff' },
  diaKcal: { color: '#00E676', fontSize: 11, fontWeight: '600', marginRight: 4 },

  // Refeição
  refCard: { marginHorizontal: 10, marginBottom: 8, backgroundColor: 'rgba(15,23,42,0.8)', borderRadius: 10, overflow: 'hidden', borderLeftWidth: 2.5, borderLeftColor: '#00E676' },
  refHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  refIconBg: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,230,118,0.12)', justifyContent: 'center', alignItems: 'center' },
  refNome: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
  refHorario: { color: '#bafdbc', fontSize: 11 },
  refKcal: { color: '#00E676', fontSize: 11, fontWeight: '600' },

  // Alimentos
  alimentosList: { paddingHorizontal: 14, paddingBottom: 12, gap: 5 },
  alimentoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  alimentoBullet: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#00E676', marginTop: 7, flexShrink: 0 },
  alimentoBulletTempero: { backgroundColor: '#f59e0b' },
  alimentoText: { flex: 1, color: '#d1fae5', fontSize: 12, lineHeight: 18 },
  alimentoTempero: { color: '#f59e0b', fontStyle: 'italic' },

  // Footer
  cardFooter: { paddingVertical: 12, alignItems: 'center' },
  footerLine: { width: 40, height: 3, borderRadius: 2, backgroundColor: 'rgba(0,230,118,0.25)' },
});
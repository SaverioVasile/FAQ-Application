import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { fetchSubmissions, resendSubmissionEmail } from '../services/api';

export default function SubmissionsScreen() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionWarning, setActionWarning] = useState(false);
  const [actionError, setActionError] = useState('');
  const [resendingId, setResendingId] = useState(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    setActionError('');
    try {
      const data = await fetchSubmissions();
      setSubmissions(data);
    } catch {
      setError('Impossibile caricare le sottomissioni. Controlla la connessione al backend.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Ricarica ogni volta che la tab diventa attiva
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  async function handleResendEmail(submissionId) {
    setResendingId(submissionId);
    setActionMessage('');
    setActionWarning(false);
    setActionError('');
    try {
      const data = await resendSubmissionEmail(submissionId);
      setActionMessage(data?.message || 'Reinvio completato.');
      setActionWarning(data?.emailSent === false);
      await loadData();
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Errore durante il reinvio della mail.');
    } finally {
      setResendingId(null);
    }
  }

  function renderItem({ item }) {
    const date = new Date(item.submittedAt).toLocaleString('it-IT');
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardId}>Submission #{item.id}</Text>
          <View style={[styles.badge, item.emailSent ? styles.badgeGreen : styles.badgeGray]}>
            <Text style={[styles.badgeText, item.emailSent ? styles.badgeTextGreen : styles.badgeTextGray]}>
              {item.emailSent ? 'Email ✓' : 'Email —'}
            </Text>
          </View>
        </View>
        <Text style={styles.email}>{item.patientEmail}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.meta}>{item.respondentType}</Text>
          <Text style={styles.score}>Punteggio: {item.totalScore}</Text>
          <Text style={styles.meta}>{date}</Text>
        </View>
        <TouchableOpacity
          style={[styles.resendButton, resendingId === item.id && styles.resendButtonDisabled]}
          onPress={() => handleResendEmail(item.id)}
          disabled={resendingId === item.id}
        >
          <Text style={styles.resendButtonText}>
            {resendingId === item.id ? 'Reinvio...' : 'Reinvia PDF'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={submissions}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor="#4f46e5"
          />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.header}>Storico sottomissioni</Text>
            {actionMessage ? (
              <View style={actionWarning ? styles.warningBox : styles.successBox}>
                <Text style={actionWarning ? styles.warningText : styles.successText}>{actionMessage}</Text>
              </View>
            ) : null}
            {actionError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{actionError}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {error || 'Nessuna sottomissione trovata.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const INDIGO = '#4f46e5';
const SLATE_900 = '#0f172a';
const SLATE_600 = '#475569';
const SLATE_100 = '#f1f5f9';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SLATE_100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: SLATE_600, fontSize: 14 },
  list: { padding: 16, paddingBottom: 32 },
  header: { fontSize: 20, fontWeight: '700', color: SLATE_900, marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardId: { fontSize: 13, fontWeight: '600', color: SLATE_600 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeGray: { backgroundColor: '#f1f5f9' },
  badgeText: { fontSize: 12, fontWeight: '500' },
  badgeTextGreen: { color: '#15803d' },
  badgeTextGray: { color: '#94a3b8' },
  email: { fontSize: 15, fontWeight: '600', color: SLATE_900, marginBottom: 8 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  meta: { fontSize: 12, color: SLATE_600 },
  score: { fontSize: 12, fontWeight: '700', color: INDIGO },
  resendButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  resendButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  resendButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  successText: { fontSize: 13, color: '#15803d' },
  warningBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  warningText: { fontSize: 13, color: '#b45309' },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { fontSize: 13, color: '#b91c1c' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: SLATE_600, fontSize: 14, textAlign: 'center' },
});


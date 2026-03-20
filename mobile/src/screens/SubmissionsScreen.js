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
import {
  fetchSubmissions,
  resendSubmissionEmail,
  fetchSesVerificationStatus,
  extractApiMessage,
} from '../services/api';
import { addDebugLog } from '../services/debugLog';

export default function SubmissionsScreen({ navigation, sesAdminAvailable, setPendingSubmission, setAdminDraftEmail }) {
  const [submissions, setSubmissions] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionWarning, setActionWarning] = useState(false);
  const [actionError, setActionError] = useState('');
  const [resendingId, setResendingId] = useState(null);
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(submissions.length / ITEMS_PER_PAGE));
  const pagedSubmissions = submissions.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    setActionError('');
    try {
      const data = await fetchSubmissions();
      setSubmissions(data);
      setPage((prev) => {
        const maxPage = Math.max(1, Math.ceil(data.length / ITEMS_PER_PAGE));
        return Math.min(prev, maxPage);
      });
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

  async function handleResendEmail(item) {
    const submissionId = item.id;
    const email = item.patientEmail;

    setResendingId(submissionId);
    setActionMessage('');
    setActionWarning(false);
    setActionError('');

    if (sesAdminAvailable) {
      try {
        const status = await fetchSesVerificationStatus(email);
        if (status?.status !== 'success') {
          setPendingSubmission({ id: submissionId, email });
          setAdminDraftEmail(email);
          setActionWarning(true);
          setActionMessage(
            status?.status === 'pending'
              ? 'Verifica SES ancora pendente per questo indirizzo. Completare la verifica e riprovare.'
              : 'Indirizzo non verificato su SES. Aprire la tab Admin per gestire la verifica.',
          );
          addDebugLog('Resend blocked by SES status', { submissionId, email, status: status?.status });
          navigation.navigate('Admin');
          setResendingId(null);
          return;
        }
      } catch (err) {
        const message = extractApiMessage(err, 'Impossibile verificare lo stato SES.');
        setActionError(message);
        addDebugLog('SES status check failed before resend', { submissionId, email, message });
        setResendingId(null);
        return;
      }
    }

    try {
      const data = await resendSubmissionEmail(submissionId);
      setActionMessage(data?.message || 'Reinvio completato.');
      setActionWarning(data?.emailSent === false);
      if (data?.emailSent === false && sesAdminAvailable) {
        setPendingSubmission({ id: submissionId, email });
        setAdminDraftEmail(email);
      } else {
        setPendingSubmission(null);
      }
      await loadData();
    } catch (err) {
      const message = extractApiMessage(err, 'Errore durante il reinvio della mail.');
      setActionError(message);
      addDebugLog('Resend failed', { submissionId, email, message });
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
          onPress={() => handleResendEmail(item)}
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
        data={pagedSubmissions}
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
        ListFooterComponent={
          submissions.length > ITEMS_PER_PAGE ? (
            <View style={styles.paginationBox}>
              <Text style={styles.paginationText}>Pagina {page} di {totalPages}</Text>
              <View style={styles.paginationActions}>
                <TouchableOpacity
                  style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <Text style={[styles.pageButtonText, page === 1 && styles.pageButtonTextDisabled]}>Precedente</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <Text style={[styles.pageButtonText, page === totalPages && styles.pageButtonTextDisabled]}>Successiva</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null
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
  paginationBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  paginationText: {
    fontSize: 12,
    color: SLATE_600,
    marginBottom: 8,
  },
  paginationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  pageButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  pageButtonDisabled: {
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  pageButtonText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '700',
  },
  pageButtonTextDisabled: {
    color: '#94a3b8',
  },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: SLATE_600, fontSize: 14, textAlign: 'center' },
});


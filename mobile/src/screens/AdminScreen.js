import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  requestSesEmailVerification,
  fetchSesVerificationStatus,
  resendSubmissionEmail,
  extractApiMessage,
} from '../services/api';
import { addDebugLog } from '../services/debugLog';

export default function AdminScreen({ sesAdminAvailable, pendingSubmission, setPendingSubmission, adminDraftEmail, setAdminDraftEmail }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [verificationRawStatus, setVerificationRawStatus] = useState('');

  React.useEffect(() => {
    if (adminDraftEmail) {
      setEmail(adminDraftEmail);
      setAdminDraftEmail('');
      setMessage('');
      setError('');
    }
  }, [adminDraftEmail, setAdminDraftEmail]);

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function resetStatus() {
    setVerificationStatus('');
    setVerificationRawStatus('');
  }

  async function refreshStatus() {
    if (!email || !isValidEmail(email)) {
      setError('Inserisci un indirizzo email valido.');
      return;
    }

    setIsCheckingStatus(true);
    setError('');
    setMessage('');
    try {
      const status = await fetchSesVerificationStatus(email);
      setVerificationStatus(status?.status || 'unknown');
      setVerificationRawStatus(status?.rawStatus || 'UNKNOWN');
      addDebugLog('Admin status refresh', { email, status: status?.status, rawStatus: status?.rawStatus });
    } catch (err) {
      const apiMessage = extractApiMessage(err, 'Errore durante il recupero dello stato verifica.');
      setError(apiMessage);
      addDebugLog('Admin status refresh error', {
        email,
        status: err?.response?.status || 'NO_RESPONSE',
        message: apiMessage,
      });
    } finally {
      setIsCheckingStatus(false);
    }
  }

  async function handleVerify() {
    if (!email || !isValidEmail(email)) {
      setError("Inserisci un indirizzo email valido.");
      return;
    }

    setIsVerifying(true);
    setMessage('');
    setError('');
    resetStatus();

    try {
      addDebugLog('Admin verify submit', { email });
      const res = await requestSesEmailVerification(email);
      setMessage(
        res.message ||
          'Richiesta di verifica inviata. Controlla la casella email del destinatario.',
      );
      addDebugLog('Admin verify success', { email, message: res?.message || '' });
      await refreshStatus();
    } catch (err) {
      const apiMessage = extractApiMessage(err, 'Errore durante la richiesta di verifica.');
      addDebugLog('Admin verify error', {
        email,
        status: err?.response?.status || 'NO_RESPONSE',
        message: apiMessage,
      });
      setError(apiMessage);
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResendPending() {
    if (!pendingSubmission?.id) {
      return;
    }

    setIsResending(true);
    setError('');
    setMessage('');
    try {
      const response = await resendSubmissionEmail(pendingSubmission.id);
      setMessage(response?.message || 'Reinvio completato.');
      if (response?.emailSent) {
        setPendingSubmission(null);
      }
      addDebugLog('Admin pending resend', {
        submissionId: pendingSubmission.id,
        emailSent: response?.emailSent,
      });
    } catch (err) {
      const apiMessage = extractApiMessage(err, 'Errore durante il reinvio del report.');
      setError(apiMessage);
      addDebugLog('Admin pending resend error', {
        submissionId: pendingSubmission.id,
        message: apiMessage,
      });
    } finally {
      setIsResending(false);
    }
  }

  const canResendPending = verificationStatus === 'success' && Boolean(pendingSubmission?.id);

  const statusMessage = React.useMemo(() => {
    switch (verificationStatus) {
      case 'success':
        return 'Indirizzo verificato su SES.';
      case 'pending':
        return 'Verifica SES pendente. Attendere il click sul link ricevuto via email.';
      case 'not-requested':
        return 'Nessuna richiesta di verifica inviata per questo indirizzo.';
      case 'failed':
        return 'Verifica SES fallita. Inviare una nuova richiesta.';
      case 'temporary-failure':
        return 'Verifica SES temporaneamente fallita. Riprovare piu tardi.';
      default:
        return '';
    }
  }, [verificationStatus]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {!sesAdminAvailable ? (
            <View style={styles.card}>
              <Text style={styles.title}>Admin — Verifica indirizzi email SES</Text>
              <Text style={styles.description}>
                Funzionalita non disponibile con la configurazione mail corrente. Impostare SES come provider e attivare l'invio mail.
              </Text>
            </View>
          ) : (
            <>
          <View style={styles.card}>
            <Text style={styles.title}>Admin — Verifica indirizzi email SES</Text>
            <Text style={styles.description}>
              Inserisci un indirizzo email per cui inviare la richiesta di verifica SES. L'utente
              dovrà aprire l'email inviata da AWS e cliccare sul link per completare la verifica.
            </Text>

            <Text style={styles.label}>Email da verificare</Text>
            <TextInput
              style={[styles.input, error && !message ? styles.inputError : null]}
              value={email}
              onChangeText={(val) => {
                setEmail(val);
                setAdminDraftEmail(val);
                setError('');
                setMessage('');
                resetStatus();
              }}
              placeholder="email-da-verificare@example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.button, (isVerifying || !email) && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={isVerifying || !email}
              activeOpacity={0.8}
            >
              {isVerifying ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Invia richiesta verifica</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, (isCheckingStatus || !email) && styles.buttonDisabled]}
              onPress={refreshStatus}
              disabled={isCheckingStatus || !email}
              activeOpacity={0.8}
            >
              {isCheckingStatus ? (
                <ActivityIndicator color="#334155" size="small" />
              ) : (
                <Text style={styles.secondaryButtonText}>Aggiorna stato verifica</Text>
              )}
            </TouchableOpacity>

            {statusMessage ? (
              <View style={styles.statusBox}>
                <Text style={styles.statusText}>{statusMessage}</Text>
                {verificationRawStatus ? <Text style={styles.statusRaw}>Stato SES: {verificationRawStatus}</Text> : null}
              </View>
            ) : null}

            {pendingSubmission?.id ? (
              <View style={styles.pendingBox}>
                <Text style={styles.pendingText}>
                  E presente un questionario gia compilato per {pendingSubmission.email}.
                </Text>
                <TouchableOpacity
                  style={[styles.button, (!canResendPending || isResending) && styles.buttonDisabled]}
                  onPress={handleResendPending}
                  disabled={!canResendPending || isResending}
                  activeOpacity={0.8}
                >
                  {isResending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Invia report gia compilato</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}

            {message ? (
              <View style={styles.alertSuccess}>
                <Text style={styles.alertSuccessText}>✅ {message}</Text>
              </View>
            ) : null}

            {error ? (
              <View style={styles.alertError}>
                <Text style={styles.alertErrorText}>⚠️ {error}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Come funziona</Text>
            <Text style={styles.infoText}>
              1. Inserisci l'email che vuoi abilitare come mittente o destinatario su AWS SES.{'\n\n'}
              2. AWS invierà una email di verifica all'indirizzo indicato.{'\n\n'}
              3. L'utente dovrà cliccare il link nella email ricevuta per completare la verifica.{'\n\n'}
              4. Solo dopo la verifica l'indirizzo potrà ricevere email dal sistema.
            </Text>
          </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const SLATE_900 = '#0f172a';
const SLATE_700 = '#334155';
const SLATE_600 = '#475569';
const SLATE_100 = '#f1f5f9';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SLATE_100 },
  scroll: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: SLATE_900,
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: SLATE_600,
    lineHeight: 20,
    marginBottom: 20,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: SLATE_700,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: SLATE_900,
    backgroundColor: '#f8fafc',
    marginBottom: 14,
  },
  inputError: {
    borderColor: '#ef4444',
  },

  button: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    backgroundColor: '#f8fafc',
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  statusBox: {
    marginTop: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
  },
  statusText: {
    fontSize: 13,
    color: '#334155',
  },
  statusRaw: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
  },
  pendingBox: {
    marginTop: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
  },
  pendingText: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 10,
  },

  alertSuccess: {
    marginTop: 14,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  alertSuccessText: {
    fontSize: 13,
    color: '#15803d',
    lineHeight: 18,
  },
  alertError: {
    marginTop: 14,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  alertErrorText: {
    fontSize: 13,
    color: '#b91c1c',
    lineHeight: 18,
  },

  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: SLATE_900,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
    color: SLATE_600,
    lineHeight: 20,
  },
});


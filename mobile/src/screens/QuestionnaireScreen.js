import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { faqQuestions, scoreLegend } from '../constants/questions';
import { submitQuestionnaire, extractApiMessage } from '../services/api';
import { addDebugLog } from '../services/debugLog';

const RESPONDENT_TYPES = [
  { value: 'PAZIENTE', label: 'Paziente' },
  { value: 'CAREGIVER', label: 'Caregiver' },
  { value: 'ALTRO', label: 'Altro' },
];

function isSesUnverifiedMessage(value) {
  const normalized = String(value || '').toLowerCase();
  return normalized.includes('not verified') || normalized.includes('indirizzo email non verificato');
}

export default function QuestionnaireScreen({ navigation, sesAdminAvailable, setPendingSubmission, setAdminDraftEmail }) {
  const [patientEmail, setPatientEmail] = useState('');
  const [respondentType, setRespondentType] = useState('CAREGIVER');
  const [respondentOther, setRespondentOther] = useState('');
  const [answers, setAnswers] = useState(Array(10).fill(null));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [showLegend, setShowLegend] = useState(false);

  const totalPreview = useMemo(
    () => answers.reduce((acc, v) => acc + (v === null ? 0 : v), 0),
    [answers],
  );

  const canSubmit = useMemo(() => {
    if (!patientEmail || answers.some((v) => v === null)) return false;
    if (respondentType === 'ALTRO' && !respondentOther.trim()) return false;
    return true;
  }, [patientEmail, answers, respondentType, respondentOther]);

  function handleAnswerSelect(questionIndex, score) {
    setAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = score;
      return next;
    });
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(patientEmail)) {
      setError('Inserisci un indirizzo email valido.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setWarning('');
    setResult(null);

    try {
      const payload = {
        respondentType,
        respondentOther: respondentType === 'ALTRO' ? respondentOther : null,
        patientEmail,
        answers,
      };
      const data = await submitQuestionnaire(payload);
      setResult(data);
      if (data?.emailSent === false) {
        const warningMessage = data?.message || 'Questionario salvato, ma invio email non completato.';
        setWarning(warningMessage);

        if (sesAdminAvailable && isSesUnverifiedMessage(warningMessage)) {
          setPendingSubmission({ id: data?.submissionId || null, email: payload.patientEmail });
          setAdminDraftEmail(payload.patientEmail);
          addDebugLog('Questionnaire requires SES verification', {
            submissionId: data?.submissionId,
            email: payload.patientEmail,
          });
          navigation.navigate('Admin');
        }
      } else {
        setPendingSubmission(null);
      }
      // reset form
      setPatientEmail('');
      setRespondentType('CAREGIVER');
      setRespondentOther('');
      setAnswers(Array(10).fill(null));
    } catch (err) {
      const message = extractApiMessage(err, 'Errore durante la sottomissione.');
      setError(message);

      if (sesAdminAvailable && isSesUnverifiedMessage(message)) {
        setPendingSubmission({ id: null, email: patientEmail });
        setAdminDraftEmail(patientEmail);
        addDebugLog('Questionnaire submit error requires SES verification', { email: patientEmail, message });
        navigation.navigate('Admin');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.card}>
            <Text style={styles.title}>Questionario FAQ</Text>
            <Text style={styles.subtitle}>Functional Activities Questionnaire (Pfeffer, 1982)</Text>
            <TouchableOpacity
              onPress={() => setShowLegend((v) => !v)}
              style={styles.legendToggle}
            >
              <Text style={styles.legendToggleText}>
                {showLegend ? 'Nascondi scala punteggio ▲' : 'Mostra scala punteggio ▼'}
              </Text>
            </TouchableOpacity>
            {showLegend && (
              <View style={styles.legendBox}>
                {scoreLegend.map((item, i) => (
                  <Text key={i} style={styles.legendItem}>• {item}</Text>
                ))}
              </View>
            )}
          </View>

          {/* Dati paziente */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Dati del paziente</Text>

            <Text style={styles.label}>Email paziente *</Text>
            <TextInput
              style={styles.input}
              value={patientEmail}
              onChangeText={setPatientEmail}
              placeholder="nome@email.it"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Soggetto *</Text>
            <View style={styles.buttonGroup}>
              {RESPONDENT_TYPES.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.typeButton, respondentType === value && styles.typeButtonActive]}
                  onPress={() => setRespondentType(value)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      respondentType === value && styles.typeButtonTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {respondentType === 'ALTRO' && (
              <>
                <Text style={styles.label}>Specifica *</Text>
                <TextInput
                  style={styles.input}
                  value={respondentOther}
                  onChangeText={setRespondentOther}
                  placeholder="Specifica il tipo di soggetto"
                  placeholderTextColor="#94a3b8"
                />
              </>
            )}
          </View>

          {/* Domande */}
          {faqQuestions.map((question, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.questionText}>
                <Text style={styles.questionNumber}>{index + 1}. </Text>
                {question}
              </Text>
              <View style={styles.scoreRow}>
                {[0, 1, 2, 3, 4, 5].map((score) => (
                  <TouchableOpacity
                    key={score}
                    style={[
                      styles.scoreButton,
                      answers[index] === score && styles.scoreButtonActive,
                    ]}
                    onPress={() => handleAnswerSelect(index, score)}
                  >
                    <Text
                      style={[
                        styles.scoreButtonText,
                        answers[index] === score && styles.scoreButtonTextActive,
                      ]}
                    >
                      {score}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Footer / Submit */}
          <View style={styles.card}>
            <Text style={styles.previewText}>
              Punteggio attuale:{' '}
              <Text style={styles.previewScore}>{totalPreview}</Text>
            </Text>

            {error !== '' && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠ {error}</Text>
              </View>
            )}

            {warning !== '' && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>⚠ {warning}</Text>
              </View>
            )}

            {result && (
              <View style={result.emailSent ? styles.successBox : styles.warningBox}>
                <Text style={result.emailSent ? styles.successText : styles.warningText}>
                  {result.emailSent ? '✓' : '⚠'} {result.message}
                </Text>
                <Text style={result.emailSent ? styles.successDetail : styles.warningDetail}>
                  ID: {result.submissionId} | Punteggio: {result.totalScore}
                </Text>
                <Text style={result.emailSent ? styles.successDetail : styles.warningDetail}>
                  Email inviata: {result.emailSent ? 'Sì' : 'No'}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!canSubmit || isSubmitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Invia questionario</Text>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const INDIGO = '#4f46e5';
const SLATE_900 = '#0f172a';
const SLATE_700 = '#334155';
const SLATE_600 = '#475569';
const SLATE_300 = '#cbd5e1';
const SLATE_100 = '#f1f5f9';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SLATE_100 },
  scroll: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: { fontSize: 20, fontWeight: '700', color: SLATE_900 },
  subtitle: { fontSize: 13, color: SLATE_600, marginTop: 4 },
  legendToggle: { marginTop: 10 },
  legendToggleText: { fontSize: 13, color: INDIGO, fontWeight: '500' },
  legendBox: { marginTop: 8 },
  legendItem: { fontSize: 12, color: SLATE_600, marginBottom: 3 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: SLATE_900, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '500', color: SLATE_700, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: SLATE_300,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: SLATE_900,
  },
  buttonGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeButton: {
    borderWidth: 1,
    borderColor: SLATE_300,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  typeButtonActive: { backgroundColor: INDIGO, borderColor: INDIGO },
  typeButtonText: { fontSize: 13, color: SLATE_700 },
  typeButtonTextActive: { color: '#fff', fontWeight: '600' },
  questionText: { fontSize: 14, color: SLATE_700, lineHeight: 20 },
  questionNumber: { fontWeight: '700', color: SLATE_900 },
  scoreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  scoreButton: {
    width: 46,
    height: 46,
    borderWidth: 1,
    borderColor: SLATE_300,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreButtonActive: { backgroundColor: INDIGO, borderColor: INDIGO },
  scoreButtonText: { fontSize: 14, color: SLATE_700, fontWeight: '500' },
  scoreButtonTextActive: { color: '#fff', fontWeight: '700' },
  previewText: { fontSize: 14, color: SLATE_700, marginBottom: 12 },
  previewScore: { fontWeight: '700', color: SLATE_900 },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { fontSize: 13, color: '#b91c1c' },
  warningBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  warningText: { fontSize: 13, color: '#b45309' },
  warningDetail: { fontSize: 12, color: '#92400e', marginTop: 4 },
  successBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  successText: { fontSize: 13, color: '#15803d', fontWeight: '600' },
  successDetail: { fontSize: 12, color: '#166534', marginTop: 4 },
  submitButton: {
    backgroundColor: INDIGO,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: SLATE_300 },
  submitButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});


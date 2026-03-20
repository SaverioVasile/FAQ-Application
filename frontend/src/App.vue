<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { faqQuestions, scoreLegend } from './constants/questions'
import {
  fetchSubmissions,
  submitQuestionnaire,
  resendSubmissionEmail,
  requestSesEmailVerification,
  fetchSesVerificationStatus,
  fetchMailConfig
} from './services/api'

const form = reactive({
  respondentType: 'CAREGIVER',
  respondentOther: '',
  patientEmail: '',
  answers: Array(10).fill('')
})

const isSubmitting = ref(false)
const errorMessage = ref('')
const warningMessage = ref('')
const successMessage = ref('')
const result = ref(null)
const submissions = ref([])
const submissionsPage = ref(1)
const submissionsPerPage = 5

const adminEmail = ref('')
const adminMessage = ref('')
const adminError = ref('')
const adminVerificationStatus = ref('')
const adminVerificationRawStatus = ref('')
const adminVerificationCheckedEmail = ref('')
const isAdminSubmitting = ref(false)
const isAdminStatusLoading = ref(false)
const sesAdminAvailable = ref(false)
const showAdminModal = ref(false)
const resendStatus = ref('')
const resendStatusWarning = ref(false)
const resendError = ref('')
const resendLoadingId = ref(null)
const pendingSubmissionId = ref(null)
const pendingSubmissionEmail = ref('')
const isAdminResending = ref(false)

const totalPreview = computed(() =>
  form.answers.reduce((acc, value) => acc + (value === '' ? 0 : Number(value)), 0)
)

const canSubmit = computed(() => {
  if (!form.patientEmail || form.answers.some((value) => value === '')) {
    return false
  }
  if (form.respondentType === 'ALTRO' && !form.respondentOther.trim()) {
    return false
  }
  return true
})

const showSesAdmin = computed(() => sesAdminAvailable.value)
const totalSubmissionPages = computed(() => Math.max(1, Math.ceil(submissions.value.length / submissionsPerPage)))
const paginatedSubmissions = computed(() => {
  const start = (submissionsPage.value - 1) * submissionsPerPage
  const end = start + submissionsPerPage
  return submissions.value.slice(start, end)
})

function logSesDebug(event, details = {}) {
  console.log('[SES Admin]', event, details)
}

function isSesUnverifiedMessage(value) {
  if (!value) return false
  const normalized = String(value).toLowerCase()
  return normalized.includes('email address is not verified') || normalized.includes('not verified')
}

function resetAdminVerificationState() {
  adminVerificationStatus.value = ''
  adminVerificationRawStatus.value = ''
  adminVerificationCheckedEmail.value = ''
}

function resetAdminState({ closeModal = false, clearPending = true } = {}) {
  adminEmail.value = ''
  adminMessage.value = ''
  adminError.value = ''
  isAdminSubmitting.value = false
  isAdminStatusLoading.value = false
  isAdminResending.value = false
  resetAdminVerificationState()
  if (clearPending) {
    pendingSubmissionId.value = null
    pendingSubmissionEmail.value = ''
  }
  if (closeModal) {
    showAdminModal.value = false
  }
}

function closeAdminModal() {
  resetAdminState({ closeModal: true, clearPending: true })
}

function openEmptyAdminModal() {
  resetAdminState({ closeModal: false, clearPending: true })
  showAdminModal.value = true
}

function setPendingSubmission(submissionId, email) {
  pendingSubmissionId.value = submissionId ?? null
  pendingSubmissionEmail.value = email ?? ''
}

async function loadSesVerificationStatus(email) {
  const normalizedEmail = email?.trim()
  if (!normalizedEmail) {
    resetAdminVerificationState()
    return null
  }

  isAdminStatusLoading.value = true
  try {
    const status = await fetchSesVerificationStatus(normalizedEmail)
    adminVerificationStatus.value = status?.status || 'unknown'
    adminVerificationRawStatus.value = status?.rawStatus || 'UNKNOWN'
    adminVerificationCheckedEmail.value = normalizedEmail
    logSesDebug('Verification status loaded', status)
    return status
  } catch (error) {
    resetAdminVerificationState()
    const message = error?.response?.data?.message || 'Impossibile recuperare lo stato verifica SES.'
    adminError.value = message
    logSesDebug('Verification status failed', {
      email: normalizedEmail,
      status: error?.response?.status,
      message
    })
    return null
  } finally {
    isAdminStatusLoading.value = false
  }
}

async function openAdminModalForSesIssue({ email, submissionId, message, source }) {
  if (!showSesAdmin.value || !isSesUnverifiedMessage(message) || !email) {
    return false
  }

  resetAdminState({ closeModal: false, clearPending: false })
  adminEmail.value = email
  setPendingSubmission(submissionId, email)

  const status = await loadSesVerificationStatus(email)
  const shouldOpen = Boolean(status) && status.status !== 'success'

  if (!shouldOpen) {
    if (status?.status === 'success') {
      resetAdminState({ closeModal: true, clearPending: true })
    }
    return false
  }

  showAdminModal.value = true
  logSesDebug('Opening SES admin modal', { message, email, submissionId, source, verificationStatus: status?.status })
  return true
}

function onAdminEmailInput(event) {
  const value = typeof event === 'string' ? event : event?.target?.value || ''
  adminEmail.value = value
  adminMessage.value = ''
  adminError.value = ''
  resetAdminVerificationState()
}

async function refreshAdminVerificationStatus() {
  adminMessage.value = ''
  adminError.value = ''
  await loadSesVerificationStatus(adminEmail.value)
}

async function loadSubmissions() {
  try {
    submissions.value = await fetchSubmissions()
    if (submissionsPage.value > totalSubmissionPages.value) {
      submissionsPage.value = totalSubmissionPages.value
    }
  } catch {
    submissions.value = []
    submissionsPage.value = 1
  }
}

function goToPreviousSubmissionsPage() {
  submissionsPage.value = Math.max(1, submissionsPage.value - 1)
}

function goToNextSubmissionsPage() {
  submissionsPage.value = Math.min(totalSubmissionPages.value, submissionsPage.value + 1)
}

async function loadMailConfig() {
  try {
    const config = await fetchMailConfig()
    sesAdminAvailable.value = Boolean(config?.sesAdminAvailable)
    logSesDebug('Mail config loaded', {
      provider: config?.mailProvider,
      enabled: config?.mailEnabled,
      sesAdminAvailable: sesAdminAvailable.value
    })
  } catch {
    // Fallback sicuro: nasconde la sezione admin SES se il check config fallisce.
    sesAdminAvailable.value = false
    logSesDebug('Mail config load failed')
  }
}

async function onSubmit() {
  isSubmitting.value = true
  errorMessage.value = ''
  warningMessage.value = ''
  successMessage.value = ''
  resendStatus.value = ''
  resendStatusWarning.value = false
  resendError.value = ''
  result.value = null

  try {
    const payload = {
      respondentType: form.respondentType,
      respondentOther: form.respondentType === 'ALTRO' ? form.respondentOther : null,
      patientEmail: form.patientEmail,
      answers: form.answers.map((value) => Number(value))
    }

    result.value = await submitQuestionnaire(payload)
    if (result.value?.emailSent === false) {
      setPendingSubmission(result.value?.submissionId, payload.patientEmail)
      warningMessage.value = result.value?.message || 'Questionario salvato, ma invio email non completato.'
      await openAdminModalForSesIssue({
        email: payload.patientEmail,
        submissionId: result.value?.submissionId,
        message: warningMessage.value,
        source: 'submit'
      })
    } else {
      resetAdminState({ closeModal: true, clearPending: true })
      successMessage.value = result.value.message
    }

    form.patientEmail = ''
    form.respondentType = 'CAREGIVER'
    form.respondentOther = ''
    form.answers = Array(10).fill('')

    await loadSubmissions()
  } catch (error) {
    const message = error?.response?.data?.message || 'Errore durante la sottomissione.'
    errorMessage.value = message
    logSesDebug('Submit failed', {
      status: error?.response?.status,
      message,
      patientEmail: form.patientEmail
    })
    await openAdminModalForSesIssue({
      email: form.patientEmail,
      submissionId: null,
      message,
      source: 'submit-error'
    })
  } finally {
    isSubmitting.value = false
  }
}

async function onResendEmail(item) {
  const submissionId = item.id
  const recipientEmail = item.patientEmail

  resetAdminState({ closeModal: true, clearPending: true })
  resendLoadingId.value = submissionId
  resendStatus.value = ''
  resendStatusWarning.value = false
  resendError.value = ''

  const verificationStatus = await loadSesVerificationStatus(recipientEmail)
  if (verificationStatus && verificationStatus.status !== 'success') {
    await openAdminModalForSesIssue({
      email: recipientEmail,
      submissionId,
      message: 'Email address is not verified',
      source: 'resend-precheck'
    })
    resendStatus.value = verificationStatus.status === 'pending'
      ? 'Verifica SES ancora pendente per questo indirizzo. Completare la verifica e poi riprovare il reinvio.'
      : 'Indirizzo non ancora verificato su SES. Aprire il popup admin per inviare o controllare la richiesta di verifica.'
    resendStatusWarning.value = true
    resendLoadingId.value = null
    return
  }

  try {
    const res = await resendSubmissionEmail(submissionId)
    if (res?.emailSent === false) {
      resendStatus.value = res?.message || 'Reinvio eseguito, ma invio email non completato.'
      resendStatusWarning.value = true
      await openAdminModalForSesIssue({
        email: recipientEmail,
        submissionId,
        message: resendStatus.value,
        source: 'resend-result'
      })
    } else {
      resendStatus.value = res?.message || 'Email reinviata con successo.'
      resendStatusWarning.value = false
      if (pendingSubmissionId.value === submissionId) {
        resetAdminState({ closeModal: true, clearPending: true })
      }
    }
    await loadSubmissions()
  } catch (error) {
    const message = error?.response?.data?.message || 'Errore durante il reinvio della mail.'
    resendError.value = message
    logSesDebug('Resend failed', {
      status: error?.response?.status,
      submissionId,
      message
    })
    await openAdminModalForSesIssue({
      email: recipientEmail,
      submissionId,
      message,
      source: 'resend-error'
    })
  } finally {
    resendLoadingId.value = null
  }
}

async function resendPendingSubmissionFromAdmin() {
  if (!pendingSubmissionId.value) {
    return
  }

  isAdminResending.value = true
  adminError.value = ''

  try {
    logSesDebug('Admin resend pending submission', {
      submissionId: pendingSubmissionId.value,
      email: pendingSubmissionEmail.value
    })
    const res = await resendSubmissionEmail(pendingSubmissionId.value)
    await loadSubmissions()

    if (res?.emailSent === false) {
      adminError.value = res?.message || 'Invio non completato. Verificare l\'email SES e riprovare.'
      resendStatus.value = adminError.value
      resendStatusWarning.value = true
    } else {
      const sentMessage = res?.message || 'Report inviato con successo usando il questionario gia compilato.'
      adminMessage.value = sentMessage
      resendStatus.value = sentMessage
      resendStatusWarning.value = false
      resetAdminState({ closeModal: true, clearPending: true })
    }
  } catch (error) {
    const message = error?.response?.data?.message || 'Errore durante l\'invio del report gia compilato.'
    adminError.value = message
    resendError.value = message
    logSesDebug('Admin resend pending submission failed', {
      status: error?.response?.status,
      submissionId: pendingSubmissionId.value,
      message
    })
  } finally {
    isAdminResending.value = false
  }
}

async function onAdminRequestVerification() {
  if (!adminEmail.value) return

  isAdminSubmitting.value = true
  adminMessage.value = ''
  adminError.value = ''

  try {
    const currentAdminEmail = adminEmail.value.trim()
    logSesDebug('Sending verify request', { email: currentAdminEmail })
    const res = await requestSesEmailVerification(currentAdminEmail)
    adminMessage.value = res.message || 'Richiesta di verifica inviata. Controlla la casella email del destinatario.'
    logSesDebug('Verify request completed', { email: currentAdminEmail, response: res })
    await loadSesVerificationStatus(currentAdminEmail)
  } catch (error) {
    const message = error?.response?.data?.message || 'Errore durante la richiesta di verifica.'
    adminError.value = message
    logSesDebug('Verify request failed', {
      status: error?.response?.status,
      email: adminEmail.value,
      message,
      payload: error?.response?.data
    })
  } finally {
    isAdminSubmitting.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadSubmissions(), loadMailConfig()])
})

const canResendPendingSubmission = computed(() => adminVerificationStatus.value === 'success' && Boolean(pendingSubmissionId.value))
const adminVerificationMessage = computed(() => {
  switch (adminVerificationStatus.value) {
    case 'success':
      return 'Indirizzo verificato su SES. Il report gia compilato puo essere reinviato.'
    case 'pending':
      return 'Verifica SES pendente. AWS ha gia inviato l\'email di conferma: occorre cliccare il link ricevuto prima del reinvio.'
    case 'not-requested':
      return 'Nessuna richiesta di verifica SES trovata per questo indirizzo.'
    case 'failed':
      return 'La verifica SES risulta fallita. Conviene inviare una nuova richiesta di verifica.'
    case 'temporary-failure':
      return 'SES segnala una verifica temporaneamente fallita. Conviene aggiornare lo stato o inviare una nuova richiesta.'
    default:
      return ''
  }
})
</script>

<template>
  <main class="min-h-screen bg-slate-100 py-8 px-4">
    <div class="mx-auto max-w-5xl space-y-6">
      <section class="rounded-xl bg-white p-6 shadow-sm">
        <h1 class="text-2xl font-semibold text-slate-900">Questionario FAQ</h1>
        <p class="mt-2 text-sm text-slate-600">
          Compila tutte le 10 domande usando la scala 0-5, poi invia il questionario.
        </p>
        <ul class="mt-4 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
          <li v-for="legend in scoreLegend" :key="legend">{{ legend }}</li>
        </ul>
      </section>

      <section class="rounded-xl bg-white p-6 shadow-sm">
        <form class="space-y-6" @submit.prevent="onSubmit">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="text-sm font-medium text-slate-700">
              Email paziente
              <input
                v-model="form.patientEmail"
                type="email"
                required
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="nome@email.it"
              />
            </label>

            <label class="text-sm font-medium text-slate-700">
              Compilatore
              <select
                v-model="form.respondentType"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="PAZIENTE">Paziente</option>
                <option value="CAREGIVER">Caregiver</option>
                <option value="ALTRO">Altro</option>
              </select>
            </label>
          </div>

          <label v-if="form.respondentType === 'ALTRO'" class="block text-sm font-medium text-slate-700">
            Specifica "Altro"
            <input
              v-model="form.respondentOther"
              type="text"
              required
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </label>

          <div class="space-y-3">
            <article
              v-for="(question, index) in faqQuestions"
              :key="question"
              class="rounded-lg border border-slate-200 p-4"
            >
              <p class="text-sm text-slate-800"><strong>{{ index + 1 }}.</strong> {{ question }}</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <label
                  v-for="score in [0, 1, 2, 3, 4, 5]"
                  :key="`${index}-${score}`"
                  class="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-1 text-sm"
                >
                  <input
                    v-model="form.answers[index]"
                    type="radio"
                    :name="`q-${index}`"
                    :value="String(score)"
                    required
                  />
                  {{ score }}
                </label>
              </div>
            </article>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm font-medium text-slate-700">Punteggio (preview): {{ totalPreview }}</p>
            <button
              type="submit"
              :disabled="!canSubmit || isSubmitting"
              class="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {{ isSubmitting ? 'Invio in corso...' : 'Invia questionario' }}
            </button>
          </div>
        </form>

        <p v-if="errorMessage" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ errorMessage }}</p>
        <p v-if="warningMessage" class="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{{ warningMessage }}</p>
        <p v-if="successMessage" class="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{{ successMessage }}</p>

        <div v-if="result" class="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
          <p><strong>ID sottomissione:</strong> {{ result.submissionId }}</p>
          <p><strong>Punteggio totale:</strong> {{ result.totalScore }}</p>
          <p><strong>Email inviata:</strong> {{ result.emailSent ? 'Si' : 'No' }}</p>
        </div>
      </section>

      <section class="rounded-xl bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900">Ultime sottomissioni</h2>
        <div class="mt-3 overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead class="border-b border-slate-200 text-slate-600">
              <tr>
                <th class="py-2 pr-4">ID</th>
                <th class="py-2 pr-4">Email</th>
                <th class="py-2 pr-4">Compilatore</th>
                <th class="py-2 pr-4">Totale</th>
                <th class="py-2 pr-4">Email inviata</th>
                <th class="py-2 pr-4">Data</th>
                <th class="py-2 pr-4">Azioni</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in paginatedSubmissions" :key="item.id" class="border-b border-slate-100">
                <td class="py-2 pr-4">{{ item.id }}</td>
                <td class="py-2 pr-4">{{ item.patientEmail }}</td>
                <td class="py-2 pr-4">{{ item.respondentType }}</td>
                <td class="py-2 pr-4">{{ item.totalScore }}</td>
                <td class="py-2 pr-4">{{ item.emailSent ? 'Si' : 'No' }}</td>
                <td class="py-2 pr-4">{{ new Date(item.submittedAt).toLocaleString('it-IT') }}</td>
                <td class="py-2 pr-4">
                  <button
                    type="button"
                    class="rounded-md bg-slate-800 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                    :disabled="resendLoadingId === item.id"
                    @click="onResendEmail(item)"
                  >
                    {{ resendLoadingId === item.id ? 'Reinvio...' : 'Reinvia PDF' }}
                  </button>
                </td>
              </tr>
              <tr v-if="submissions.length === 0">
                <td colspan="7" class="py-4 text-slate-500">Nessuna sottomissione disponibile.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="submissions.length > submissionsPerPage" class="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
          <p>Pagina {{ submissionsPage }} di {{ totalSubmissionPages }}</p>
          <div class="flex items-center gap-2">
            <button
              type="button"
              :disabled="submissionsPage === 1"
              class="rounded-md border border-slate-300 px-3 py-1 font-medium text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
              @click="goToPreviousSubmissionsPage"
            >
              Precedente
            </button>
            <button
              type="button"
              :disabled="submissionsPage === totalSubmissionPages"
              class="rounded-md border border-slate-300 px-3 py-1 font-medium text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
              @click="goToNextSubmissionsPage"
            >
              Successiva
            </button>
          </div>
        </div>
        <p
          v-if="resendStatus"
          class="mt-3 rounded-lg px-3 py-2 text-sm"
          :class="resendStatusWarning ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'"
        >
          {{ resendStatus }}
        </p>
        <p v-if="resendError" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ resendError }}
        </p>
      </section>

      <button
        v-if="showSesAdmin"
        type="button"
        class="fixed bottom-6 right-6 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg"
        @click="openEmptyAdminModal"
      >
        Admin SES
      </button>

      <div
        v-if="showSesAdmin && showAdminModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      >
        <section class="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
          <div class="flex items-start justify-between gap-3">
            <h2 class="text-lg font-semibold text-slate-900">Admin - Verifica indirizzi email SES</h2>
            <button type="button" class="text-sm text-slate-500" @click="closeAdminModal">Chiudi</button>
          </div>
          <p class="mt-2 text-sm text-slate-600">
            Inserisci un indirizzo email per cui inviare la richiesta di verifica SES. L'utente dovrà aprire l'email
            inviata da AWS e cliccare sul link per completare la verifica.
          </p>

          <div v-if="adminVerificationMessage || isAdminStatusLoading" class="mt-3 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <p v-if="isAdminStatusLoading">Controllo stato verifica SES in corso...</p>
            <template v-else>
              <p>
                {{ adminVerificationMessage }}
                <span v-if="adminVerificationCheckedEmail" class="font-medium text-slate-800">
                  ({{ adminVerificationCheckedEmail }})
                </span>
              </p>
              <p v-if="adminVerificationRawStatus" class="mt-1 text-xs text-slate-500">
                Stato SES: {{ adminVerificationRawStatus }}
              </p>
            </template>
          </div>

          <form class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center" @submit.prevent="onAdminRequestVerification">
            <input
              v-model="adminEmail"
              @input="onAdminEmailInput"
              type="email"
              required
              class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="email-da-verificare@example.com"
            />
            <button
              type="submit"
              :disabled="isAdminSubmitting"
              class="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {{ isAdminSubmitting ? 'Invio richiesta...' : 'Invia richiesta verifica' }}
            </button>
            <button
              type="button"
              :disabled="isAdminStatusLoading || !adminEmail"
              class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
              @click="refreshAdminVerificationStatus"
            >
              {{ isAdminStatusLoading ? 'Aggiornamento...' : 'Aggiorna stato' }}
            </button>
          </form>

          <div v-if="pendingSubmissionId" class="mt-3 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <p>
              E presente un questionario gia compilato per <strong>{{ pendingSubmissionEmail }}</strong>.
            </p>
            <p v-if="adminVerificationStatus === 'pending'" class="mt-2 text-amber-700">
              La verifica per questo utente risulta ancora pendente su SES.
            </p>
            <button
              type="button"
              :disabled="isAdminResending || !canResendPendingSubmission"
              class="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              @click="resendPendingSubmissionFromAdmin"
            >
              {{ isAdminResending ? 'Invio report...' : 'Invia report gia compilato' }}
            </button>
          </div>

          <p v-if="adminMessage" class="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {{ adminMessage }}
          </p>
          <p v-if="adminError" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {{ adminError }}
          </p>
        </section>
      </div>
    </div>
  </main>
</template>


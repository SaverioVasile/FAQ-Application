<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { faqQuestions, scoreLegend } from './constants/questions'
import { fetchSubmissions, submitQuestionnaire, requestSesEmailVerification } from './services/api'

const form = reactive({
  respondentType: 'CAREGIVER',
  respondentOther: '',
  patientEmail: '',
  answers: Array(10).fill('')
})

const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const result = ref(null)
const submissions = ref([])

const adminEmail = ref('')
const adminMessage = ref('')
const adminError = ref('')
const isAdminSubmitting = ref(false)

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

async function loadSubmissions() {
  try {
    submissions.value = await fetchSubmissions()
  } catch {
    submissions.value = []
  }
}

async function onSubmit() {
  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  result.value = null

  try {
    const payload = {
      respondentType: form.respondentType,
      respondentOther: form.respondentType === 'ALTRO' ? form.respondentOther : null,
      patientEmail: form.patientEmail,
      answers: form.answers.map((value) => Number(value))
    }

    result.value = await submitQuestionnaire(payload)
    successMessage.value = result.value.message

    form.patientEmail = ''
    form.respondentType = 'CAREGIVER'
    form.respondentOther = ''
    form.answers = Array(10).fill('')

    await loadSubmissions()
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || 'Errore durante la sottomissione.'
  } finally {
    isSubmitting.value = false
  }
}

async function onAdminRequestVerification() {
  if (!adminEmail.value) return

  isAdminSubmitting.value = true
  adminMessage.value = ''
  adminError.value = ''

  try {
    const res = await requestSesEmailVerification(adminEmail.value)
    adminMessage.value = res.message || 'Richiesta di verifica inviata. Controlla la casella email del destinatario.'
  } catch (error) {
    adminError.value = error?.response?.data?.message || 'Errore durante la richiesta di verifica.'
  } finally {
    isAdminSubmitting.value = false
  }
}

onMounted(loadSubmissions)
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
        <p v-if="successMessage" class="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{{ successMessage }}</p>

        <div v-if="result" class="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
          <p><strong>ID sottomissione:</strong> {{ result.submissionId }}</p>
          <p><strong>Punteggio totale:</strong> {{ result.totalScore }}</p>
          <p><strong>Email inviata:</strong> {{ result.emailSent ? 'Si' : 'No' }}</p>
        </div>
      </section>

      <section class="rounded-xl bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900">Ultime sottomissioni (bonus)</h2>
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
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in submissions" :key="item.id" class="border-b border-slate-100">
                <td class="py-2 pr-4">{{ item.id }}</td>
                <td class="py-2 pr-4">{{ item.patientEmail }}</td>
                <td class="py-2 pr-4">{{ item.respondentType }}</td>
                <td class="py-2 pr-4">{{ item.totalScore }}</td>
                <td class="py-2 pr-4">{{ item.emailSent ? 'Si' : 'No' }}</td>
                <td class="py-2 pr-4">{{ new Date(item.submittedAt).toLocaleString('it-IT') }}</td>
              </tr>
              <tr v-if="submissions.length === 0">
                <td colspan="6" class="py-4 text-slate-500">Nessuna sottomissione disponibile.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="rounded-xl bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900">Admin - Verifica indirizzi email SES</h2>
        <p class="mt-2 text-sm text-slate-600">
          Inserisci un indirizzo email per cui inviare la richiesta di verifica SES. L'utente dovrà aprire l'email
          inviata da AWS e cliccare sul link per completare la verifica.
        </p>

        <form class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center" @submit.prevent="onAdminRequestVerification">
          <input
            v-model="adminEmail"
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
        </form>

        <p v-if="adminMessage" class="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {{ adminMessage }}
        </p>
        <p v-if="adminError" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ adminError }}
        </p>
      </section>
    </div>
  </main>
</template>


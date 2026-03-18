import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || ''
})

export async function submitQuestionnaire(payload) {
  const { data } = await api.post('/api/submissions', payload)
  return data
}

export async function fetchSubmissions() {
  const { data } = await api.get('/api/submissions')
  return data
}

export async function requestSesEmailVerification(email) {
  const { data } = await api.post('/api/admin/ses-verify-email', { email })
  return data
}



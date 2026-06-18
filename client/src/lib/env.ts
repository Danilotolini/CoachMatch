const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
const cognitoClientId = import.meta.env.VITE_COGNITO_CLIENT_ID
// O App Client do treinador na Cognito ainda exige client secret, então ele é
// obrigatório. Vite inlina VITE_* no bundle, então isto fica legível em produção
// — dívida conhecida até migrarmos o pool do coach para PKCE-only (igual ao do aluno).
const cognitoClientSecret = import.meta.env.VITE_COGNITO_CLIENT_SECRET
const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN
const cognitoStudentClientId = import.meta.env.VITE_COGNITO_STUDENT_CLIENT_ID
const cognitoStudentDomain = import.meta.env.VITE_COGNITO_STUDENT_DOMAIN

if (!apiBaseUrl) throw new Error('VITE_API_BASE_URL is not defined. Check .env.local')
if (!cognitoClientId) throw new Error('VITE_COGNITO_CLIENT_ID is not defined. Check .env.local')
if (!cognitoDomain) throw new Error('VITE_COGNITO_DOMAIN is not defined. Check .env.local')
if (!cognitoClientSecret) {
  throw new Error('VITE_COGNITO_CLIENT_SECRET is not defined. Check .env.local')
}
if (!cognitoStudentClientId) {
  throw new Error('VITE_COGNITO_STUDENT_CLIENT_ID is not defined. Check .env.local')
}
if (!cognitoStudentDomain) {
  throw new Error('VITE_COGNITO_STUDENT_DOMAIN is not defined. Check .env.local')
}

export const env = {
  apiBaseUrl,
  cognitoClientId,
  cognitoClientSecret,
  cognitoDomain,
  cognitoStudentClientId,
  cognitoStudentDomain,
} as const

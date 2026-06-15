const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
const cognitoClientId = import.meta.env.VITE_COGNITO_CLIENT_ID
const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN
const cognitoStudentClientId = import.meta.env.VITE_COGNITO_STUDENT_CLIENT_ID
const cognitoStudentDomain = import.meta.env.VITE_COGNITO_STUDENT_DOMAIN ?? cognitoDomain

if (!apiBaseUrl) throw new Error('VITE_API_BASE_URL is not defined. Check .env.local')
if (!cognitoClientId) throw new Error('VITE_COGNITO_CLIENT_ID is not defined. Check .env.local')
if (!cognitoDomain) throw new Error('VITE_COGNITO_DOMAIN is not defined. Check .env.local')
if (!cognitoStudentClientId) {
  throw new Error('VITE_COGNITO_STUDENT_CLIENT_ID is not defined. Check .env.local')
}
if (!cognitoStudentDomain) {
  throw new Error('VITE_COGNITO_STUDENT_DOMAIN is not defined. Check .env.local')
}

export const env = {
  apiBaseUrl,
  cognitoClientId,
  cognitoDomain,
  cognitoStudentClientId,
  cognitoStudentDomain,
} as const

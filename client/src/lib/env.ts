const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
const cognitoClientId = import.meta.env.VITE_COGNITO_CLIENT_ID
const cognitoClientSecret = import.meta.env.VITE_COGNITO_CLIENT_SECRET
const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN
const cognitoStudentClientId =
  import.meta.env.VITE_COGNITO_STUDENT_CLIENT_ID ?? '3rjn45koljliioocd5usijdv9s'
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

// SECURITY: Vite inlines VITE_* env vars at build time, so anything stored
// in cognitoClientSecret will end up readable inside the production bundle.
// To eliminate this risk, configure the Cognito App Client WITHOUT a secret
// (PKCE alone is sufficient for SPAs) and remove VITE_COGNITO_CLIENT_SECRET
// from .env.local. The OAuth code below will then run with PKCE only.
export const env = {
  apiBaseUrl,
  cognitoClientId,
  cognitoClientSecret: cognitoClientSecret ?? null,
  cognitoDomain,
  cognitoStudentClientId,
  cognitoStudentDomain,
} as const

/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_MOCKING?: 'enabled' | 'disabled'
  readonly VITE_COGNITO_CLIENT_ID: string
  readonly VITE_COGNITO_CLIENT_SECRET?: string
  readonly VITE_COGNITO_DOMAIN: string
  readonly VITE_COGNITO_STUDENT_CLIENT_ID?: string
  readonly VITE_COGNITO_STUDENT_DOMAIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

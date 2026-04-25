/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_COGNITO_CLIENT_ID: string
  readonly VITE_COGNITO_CLIENT_SECRET?: string
  readonly VITE_COGNITO_DOMAIN: string
  readonly VITE_COGNITO_REDIRECT_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

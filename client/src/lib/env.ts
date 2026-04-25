const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

if (!apiBaseUrl) {
  throw new Error('VITE_API_BASE_URL is not defined. Check .env.local or .env')
}

export const env = {
  apiBaseUrl,
} as const

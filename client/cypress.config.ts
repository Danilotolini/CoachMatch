import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    // O app é mobile-first: o viewport de celular exercita o layout principal.
    viewportWidth: 390,
    viewportHeight: 844,
    video: true,
  },
})

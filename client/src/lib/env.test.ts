import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('env', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('usa o domínio do coach como fallback para o domínio do aluno', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'coach-client')
    vi.stubEnv('VITE_COGNITO_CLIENT_SECRET', '')
    vi.stubEnv('VITE_COGNITO_DOMAIN', 'coach.example.com')
    vi.stubEnv('VITE_COGNITO_STUDENT_CLIENT_ID', 'student-client')
    vi.stubEnv('VITE_COGNITO_STUDENT_DOMAIN', '')

    const { env } = await import('./env.ts')

    expect(env.cognitoStudentDomain).toBe('coach.example.com')
    expect(env.cognitoClientSecret).toBeNull()
  })

  it('lança erro quando falta a configuração obrigatória do domínio do aluno e do coach', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'coach-client')
    vi.stubEnv('VITE_COGNITO_CLIENT_SECRET', '')
    vi.stubEnv('VITE_COGNITO_DOMAIN', '')
    vi.stubEnv('VITE_COGNITO_STUDENT_CLIENT_ID', 'student-client')
    vi.stubEnv('VITE_COGNITO_STUDENT_DOMAIN', '')

    await expect(import('./env.ts')).rejects.toThrow(
      'VITE_COGNITO_DOMAIN is not defined. Check .env.local',
    )
  })
})

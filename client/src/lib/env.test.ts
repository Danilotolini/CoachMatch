import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('env', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('exige o domínio do aluno e não cai no domínio do coach', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'coach-client')
    vi.stubEnv('VITE_COGNITO_CLIENT_SECRET', 'coach-secret')
    vi.stubEnv('VITE_COGNITO_DOMAIN', 'coach.example.com')
    vi.stubEnv('VITE_COGNITO_STUDENT_CLIENT_ID', 'student-client')
    vi.stubEnv('VITE_COGNITO_STUDENT_DOMAIN', '')

    await expect(import('./env.ts')).rejects.toThrow(
      'VITE_COGNITO_STUDENT_DOMAIN is not defined. Check .env.local',
    )
  })

  it('exige o client secret do coach', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'coach-client')
    vi.stubEnv('VITE_COGNITO_CLIENT_SECRET', '')
    vi.stubEnv('VITE_COGNITO_DOMAIN', 'coach.example.com')
    vi.stubEnv('VITE_COGNITO_STUDENT_CLIENT_ID', 'student-client')
    vi.stubEnv('VITE_COGNITO_STUDENT_DOMAIN', 'student.example.com')

    await expect(import('./env.ts')).rejects.toThrow(
      'VITE_COGNITO_CLIENT_SECRET is not defined. Check .env.local',
    )
  })

  it('expõe o domínio do aluno e o secret do coach quando configurados', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'coach-client')
    vi.stubEnv('VITE_COGNITO_CLIENT_SECRET', 'coach-secret')
    vi.stubEnv('VITE_COGNITO_DOMAIN', 'coach.example.com')
    vi.stubEnv('VITE_COGNITO_STUDENT_CLIENT_ID', 'student-client')
    vi.stubEnv('VITE_COGNITO_STUDENT_DOMAIN', 'student.example.com')

    const { env } = await import('./env.ts')

    expect(env.cognitoStudentDomain).toBe('student.example.com')
    expect(env.cognitoClientSecret).toBe('coach-secret')
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

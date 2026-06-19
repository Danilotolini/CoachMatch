import type { ClientGender, ClientGoal } from '@/types/api'

export interface ParqQuestion {
  id: string
  text: string
  /** Rótulo curto para exibir o item de forma resumida (ex.: na visão do treino). */
  short: string
}

/** Questionário PAR-Q (Physical Activity Readiness Questionnaire). */
export const PARQ: ParqQuestion[] = [
  {
    id: 'heart',
    text: 'Algum médico já disse que você tem uma condição cardíaca e que só deveria fazer atividade física sob orientação?',
    short: 'Condição cardíaca diagnosticada',
  },
  {
    id: 'chest_pain',
    text: 'Você sente dor no peito ao realizar atividade física?',
    short: 'Dor no peito ao se exercitar',
  },
  {
    id: 'dizziness',
    text: 'No último mês, você teve tontura ou perdeu o equilíbrio por causa de tontura?',
    short: 'Tontura ou perda de equilíbrio',
  },
  {
    id: 'bone_joint',
    text: 'Você tem algum problema ósseo ou articular que pode piorar com mudança na sua atividade física?',
    short: 'Problema ósseo ou articular',
  },
  {
    id: 'medication',
    text: 'Você toma medicação para pressão arterial ou problema cardíaco?',
    short: 'Medicação para pressão/coração',
  },
]

export const GENDER_LABELS: Record<ClientGender, string> = {
  F: 'Mulher',
  M: 'Homem',
  NB: 'Não-binário',
  NA: 'Prefere não dizer',
}

export const GOAL_LABELS: Record<ClientGoal, string> = {
  WEIGHT_LOSS: 'Emagrecimento',
  HYPERTROPHY: 'Hipertrofia',
  CONDITIONING: 'Condicionamento',
  REHAB: 'Reabilitação',
  PERFORMANCE: 'Performance',
}

/** Idade em anos a partir de uma data ISO (YYYY-MM-DD); null se ausente/inválida. */
export function ageFromBirthDate(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDelta = now.getMonth() - birth.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) age -= 1
  return age
}

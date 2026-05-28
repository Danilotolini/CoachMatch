import { create } from 'zustand'
import type { CoachMePayload, Gym } from '@/types/api'

export type Territory = 'GYMS' | 'HOME_SERVICE'

export interface OnboardingFormState {
  phone: string
  instagram: string
  cref: string
  specialties: string[]
  territory: Territory
  gym: string | null
  gymName: string | null
  radius: number
}

type FormErrors = Partial<Record<keyof OnboardingFormState, string>>

interface OnboardingStore {
  form: OnboardingFormState
  errors: FormErrors
  specialtySearch: string
  gymSearch: string
  setSpecialtySearch: (value: string) => void
  setGymSearch: (value: string) => void
  update: <K extends keyof OnboardingFormState>(key: K, value: OnboardingFormState[K]) => void
  updatePhone: (value: string) => void
  updateInstagram: (value: string) => void
  updateCref: (value: string) => void
  toggleSpecialty: (label: string) => void
  selectGym: (gym: Gym) => void
  clearGym: () => void
  setGymError: (message: string) => void
  validate: () => boolean
  reset: () => void
}

const initialForm: OnboardingFormState = {
  phone: '',
  instagram: '',
  cref: '',
  specialties: [],
  territory: 'GYMS',
  gym: null,
  gymName: null,
  radius: 10,
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function maskInstagram(value: string): string {
  return value
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 30)
}

function maskCref(value: string): string {
  const normalized = value.toUpperCase().replace(/[^0-9A-Z]/g, '')
  const digits = normalized.replace(/\D/g, '').slice(0, 6)
  const letters = normalized.replace(/[^A-Z]/g, '')
  const category = /[GP]/.exec(letters)?.[0] ?? ''
  const state = letters.replace(/[GP]/g, '').slice(0, 2)

  if (digits.length < 6) return digits
  if (!category) return `${digits}-`
  if (!state) return `${digits}-${category}/`
  return `${digits}-${category}/${state}`
}

function validateForm(form: OnboardingFormState): FormErrors {
  const errors: FormErrors = {}
  const phoneDigits = onlyDigits(form.phone)

  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    errors.phone = 'Informe um telefone com DDD.'
  }

  if (form.instagram && !/^[a-z0-9._]{1,30}$/.test(form.instagram)) {
    errors.instagram = 'Use apenas letras, números, ponto e underline.'
  }

  if (!/^\d{6}-[GP]\/[A-Z]{2}$/.test(form.cref)) {
    errors.cref = 'Use o formato 000000-G/SP.'
  }

  if (form.specialties.length === 0) {
    errors.specialties = 'Selecione pelo menos uma especialidade.'
  } else if (form.specialties.length > 3) {
    errors.specialties = 'Selecione no máximo 3 especialidades.'
  }

  if (form.territory === 'GYMS' && !form.gym) {
    errors.gym = 'Selecione uma academia da lista.'
  }

  if (form.territory === 'HOME_SERVICE' && (form.radius < 10 || form.radius > 50)) {
    errors.radius = 'Escolha um raio entre 10 e 50 km.'
  }

  return errors
}

function clearError(errors: FormErrors, key: keyof OnboardingFormState): FormErrors {
  const next: FormErrors = {}
  Object.entries(errors).forEach(([errorKey, error]) => {
    if (errorKey !== key && error) {
      next[errorKey as keyof OnboardingFormState] = error
    }
  })
  return next
}

export function createCoachPayload(
  form: OnboardingFormState,
  authName: string | null,
): CoachMePayload {
  return {
    ...(authName ? { name: authName } : {}),
    phone: onlyDigits(form.phone),
    instagram: form.instagram ? `@${form.instagram}` : undefined,
    cref: form.cref,
    specialties: form.specialties,
    territory: form.territory,
    gyms: form.territory === 'GYMS' && form.gym ? [form.gym] : [],
    serviceRadius: form.territory === 'HOME_SERVICE' ? form.radius : undefined,
  }
}

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  form: initialForm,
  errors: {},
  specialtySearch: '',
  gymSearch: '',
  setSpecialtySearch: (value) => {
    set({ specialtySearch: value })
  },
  setGymSearch: (value) => {
    set({ gymSearch: value })
  },
  update: (key, value) => {
    set((state) => ({
      form: { ...state.form, [key]: value },
      errors: clearError(state.errors, key),
    }))
  },
  updatePhone: (value) => {
    get().update('phone', maskPhone(value))
  },
  updateInstagram: (value) => {
    get().update('instagram', maskInstagram(value))
  },
  updateCref: (value) => {
    get().update('cref', maskCref(value))
  },
  toggleSpecialty: (label) => {
    set((state) => {
      const specialties = state.form.specialties.includes(label)
        ? state.form.specialties.filter((specialty) => specialty !== label)
        : state.form.specialties.length >= 3
          ? state.form.specialties
          : [...state.form.specialties, label]

      return {
        form: { ...state.form, specialties },
        errors: clearError(state.errors, 'specialties'),
      }
    })
  },
  selectGym: (gym) => {
    set((state) => ({
      form: { ...state.form, gym: gym.id, gymName: gym.name },
      gymSearch: gym.name,
      errors: clearError(state.errors, 'gym'),
    }))
  },
  clearGym: () => {
    set((state) => ({
      form: { ...state.form, gym: null, gymName: null },
      errors: clearError(state.errors, 'gym'),
    }))
  },
  setGymError: (message) => {
    set((state) => ({ errors: { ...state.errors, gym: message } }))
  },
  validate: () => {
    const errors = validateForm(get().form)
    set({ errors })
    return Object.keys(errors).length === 0
  },
  reset: () => {
    set({ form: initialForm, errors: {}, specialtySearch: '', gymSearch: '' })
  },
}))

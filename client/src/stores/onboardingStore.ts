import { create } from 'zustand'
import { maskCref } from '@/lib/cref'
import { maskInstagram, maskPhone, onlyDigits } from '@/lib/formatters'
import type { CoachProfile, CoachUpdatePayload, Gym, WorkLocation } from '@/types/api'

export interface SelectedGym {
  id: string
  name: string
  city: string
  state: string
  neighborhood: string
}

export interface OnboardingFormState {
  name: string
  phone: string
  instagram: string
  cref: string
  specialties: string[]
  gyms: SelectedGym[]
  videoKey: string | null
}

type FormErrorKey = keyof OnboardingFormState
type FormErrors = Partial<Record<FormErrorKey, string>>

interface OnboardingStore {
  form: OnboardingFormState
  errors: FormErrors
  specialtySearch: string
  setSpecialtySearch: (value: string) => void
  update: <K extends keyof OnboardingFormState>(key: K, value: OnboardingFormState[K]) => void
  updateName: (value: string) => void
  updatePhone: (value: string) => void
  updateInstagram: (value: string) => void
  updateCref: (value: string) => void
  toggleSpecialty: (label: string) => void
  addGym: (gym: Gym) => void
  removeGym: (gymId: string) => void
  setGymError: (message: string) => void
  setVideoKey: (key: string | null) => void
  validate: () => boolean
  reset: () => void
}

const initialForm: OnboardingFormState = {
  name: '',
  phone: '',
  instagram: '',
  cref: '',
  specialties: [],
  gyms: [],
  videoKey: null,
}

function validateForm(form: OnboardingFormState): FormErrors {
  const errors: FormErrors = {}
  const phoneDigits = onlyDigits(form.phone)

  if (form.name.trim().length < 2) {
    errors.name = 'Informe seu nome completo.'
  }

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
  }

  if (form.gyms.length === 0) {
    errors.gyms = 'Selecione pelo menos uma academia parceira.'
  }

  return errors
}

function clearError(errors: FormErrors, key: FormErrorKey): FormErrors {
  const next: FormErrors = {}
  Object.entries(errors).forEach(([errorKey, error]) => {
    if (errorKey !== key && error) {
      next[errorKey as keyof OnboardingFormState] = error
    }
  })
  return next
}

function buildWorkLocation(form: OnboardingFormState): WorkLocation[] {
  return form.gyms.map((gym) => ({
    type: 'GYM',
    gymId: gym.id,
  }))
}

export function buildCoachUpdatePayload(form: OnboardingFormState): CoachUpdatePayload {
  const profile: Partial<CoachProfile> = {
    name: form.name.trim(),
    phone: onlyDigits(form.phone),
    instagram: form.instagram ? `@${form.instagram}` : '',
    cref: form.cref,
    specialties: form.specialties,
    profile_video: !!form.videoKey,
  }

  return {
    profile,
    work_location: buildWorkLocation(form),
  }
}

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  form: initialForm,
  errors: {},
  specialtySearch: '',
  setSpecialtySearch: (value) => {
    set({ specialtySearch: value })
  },
  update: (key, value) => {
    set((state) => ({
      form: { ...state.form, [key]: value },
      errors: clearError(state.errors, key),
    }))
  },
  updateName: (value) => {
    get().update('name', value)
  },
  updatePhone: (value) => {
    get().update('phone', maskPhone(value))
  },
  updateInstagram: (value) => {
    get().update('instagram', maskInstagram(value))
  },
  updateCref: (value) => {
    get().update('cref', maskCref(value, get().form.cref))
  },
  toggleSpecialty: (label) => {
    set((state) => {
      const specialties = state.form.specialties.includes(label)
        ? state.form.specialties.filter((specialty) => specialty !== label)
        : [...state.form.specialties, label]

      return {
        form: { ...state.form, specialties },
        errors: clearError(state.errors, 'specialties'),
      }
    })
  },
  addGym: (gym) => {
    set((state) => {
      if (state.form.gyms.some((selected) => selected.id === gym.gymId)) {
        return state
      }
      const next: SelectedGym = {
        id: gym.gymId,
        name: gym.name,
        city: gym.city,
        state: gym.state,
        neighborhood: gym.neighborhood,
      }
      return {
        form: { ...state.form, gyms: [...state.form.gyms, next] },
        errors: clearError(state.errors, 'gyms'),
      }
    })
  },
  removeGym: (gymId) => {
    set((state) => ({
      form: {
        ...state.form,
        gyms: state.form.gyms.filter((gym) => gym.id !== gymId),
      },
      errors: clearError(state.errors, 'gyms'),
    }))
  },
  setGymError: (message) => {
    set((state) => ({ errors: { ...state.errors, gyms: message } }))
  },
  setVideoKey: (key) => {
    set((state) => ({
      form: { ...state.form, videoKey: key },
      errors: clearError(state.errors, 'videoKey'),
    }))
  },
  validate: () => {
    const errors = validateForm(get().form)
    set({ errors })
    return Object.keys(errors).length === 0
  },
  reset: () => {
    set({ form: initialForm, errors: {}, specialtySearch: '' })
  },
}))

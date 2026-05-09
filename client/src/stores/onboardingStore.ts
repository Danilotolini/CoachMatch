import { create } from 'zustand'
import type { CoachProfile, CoachUpdatePayload, Gym, WorkLocation } from '@/types/api'

export interface SelectedGym {
  id: string
  name: string
  city: string
  state: string
  neighborhood: string
  coordinates: { lat: number; lng: number }
}

export interface HomeArea {
  id: string
  state: string
  city: string
  neighborhoods: string[]
}

export interface OnboardingFormState {
  phone: string
  instagram: string
  cref: string
  specialties: string[]
  gyms: SelectedGym[]
  homeAreas: HomeArea[]
  videoKey: string | null
}

type FormErrorKey = keyof OnboardingFormState | 'workLocation'
type FormErrors = Partial<Record<FormErrorKey, string>>

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
  addGym: (gym: Gym) => void
  removeGym: (gymId: string) => void
  setGymError: (message: string) => void
  addHomeArea: (area: Omit<HomeArea, 'id'>) => void
  removeHomeArea: (id: string) => void
  setVideoKey: (key: string | null) => void
  validate: () => boolean
  reset: () => void
}

const initialForm: OnboardingFormState = {
  phone: '',
  instagram: '',
  cref: '',
  specialties: [],
  gyms: [],
  homeAreas: [],
  videoKey: null,
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

function formatCref(normalized: string): string {
  let digits = ''
  let category = ''
  let state = ''
  for (const ch of normalized) {
    if (digits.length < 6 && ch >= '0' && ch <= '9') digits += ch
    else if (!category && (ch === 'G' || ch === 'P')) category = ch
    else if (category && state.length < 2 && ch >= 'A' && ch <= 'Z') state += ch
  }
  let result = digits
  if (category) result += `-${category}`
  if (state) result += `/${state}`
  return result
}

function maskCref(value: string, previous: string): string {
  let normalized = value.toUpperCase().replace(/[^0-9A-Z]/g, '')
  const previousClean = previous.replace(/[^0-9A-Z]/g, '')

  // Se só um separador foi apagado, remove também o caractere de conteúdo anterior
  // a ele — caso contrário o formatador re-inseriria o separador.
  if (value.length < previous.length && normalized === previousClean) {
    let i = 0
    while (i < value.length && value[i] === previous[i]) i++
    const cleanIdx = previous.slice(0, i).replace(/[^0-9A-Z]/g, '').length - 1
    if (cleanIdx >= 0) {
      normalized = normalized.slice(0, cleanIdx) + normalized.slice(cleanIdx + 1)
    }
  }

  return formatCref(normalized)
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

  if (form.gyms.length === 0 && form.homeAreas.length === 0) {
    errors.workLocation =
      'Selecione ao menos uma academia parceira ou adicione uma área de Atendimento Externo.'
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
  const gymEntries: WorkLocation[] = form.gyms.map((gym) => ({
    type: 'GYM',
    gymId: gym.id,
  }))
  const homeEntries: WorkLocation[] = form.homeAreas.map((area) => ({
    type: 'HOME_SERVICE',
    coverage: {
      city: area.city,
      state: area.state,
      neighborhoods: area.neighborhoods,
    },
  }))
  return [...gymEntries, ...homeEntries]
}

export function buildCoachUpdatePayload(
  form: OnboardingFormState,
  authName: string | null,
): CoachUpdatePayload {
  const profile: Partial<CoachProfile> = {
    phone: onlyDigits(form.phone),
    instagram: form.instagram ? `@${form.instagram}` : '',
    cref: form.cref,
    specialties: form.specialties,
    profile_video: !!form.videoKey,
  }
  if (authName) profile.name = authName

  return {
    profile,
    work_location: buildWorkLocation(form),
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
    get().update('cref', maskCref(value, get().form.cref))
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
        coordinates: gym.coordinates,
      }
      return {
        form: { ...state.form, gyms: [...state.form.gyms, next] },
        gymSearch: '',
        errors: clearError(clearError(state.errors, 'gyms'), 'workLocation'),
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
  addHomeArea: (area) => {
    set((state) => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `area-${String(Date.now())}-${String(Math.random()).slice(2, 8)}`
      const next: HomeArea = { id, ...area }
      return {
        form: { ...state.form, homeAreas: [...state.form.homeAreas, next] },
        errors: clearError(state.errors, 'workLocation'),
      }
    })
  },
  removeHomeArea: (id) => {
    set((state) => ({
      form: {
        ...state.form,
        homeAreas: state.form.homeAreas.filter((area) => area.id !== id),
      },
    }))
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
    set({ form: initialForm, errors: {}, specialtySearch: '', gymSearch: '' })
  },
}))

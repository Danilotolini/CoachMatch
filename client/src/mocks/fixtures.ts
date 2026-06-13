import type { Coach, Gym, Specialty } from '@/types/api'

const NOW = '2026-04-18T10:00:00Z'

export const initialCoach: Coach = {
  coachId: 'mock-coach-id',
  email: 'mock@coachmatch.app',
  status: 'ONBOARDING_PROFILE',
  visibility: 'VISIBLE',
  profile: {
    name: '',
    phone: null,
    specialties: [],
    cref: '',
    instagram: '',
    profile_video: false,
  },
  work_location: [],
  createdAt: NOW,
  updatedAt: NOW,
}

export const specialties: Specialty[] = [
  { id: 'MUSCULATION', label: 'Musculação' },
  { id: 'CROSSFIT', label: 'CrossFit' },
  { id: 'FUNCTIONAL', label: 'Funcional' },
  { id: 'PILATES', label: 'Pilates' },
  { id: 'YOGA', label: 'Yoga' },
  { id: 'RUNNING', label: 'Corrida' },
  { id: 'SWIMMING', label: 'Natação' },
  { id: 'FIGHTING', label: 'Lutas' },
  { id: 'REHAB', label: 'Reabilitação' },
  { id: 'WEIGHT_LOSS', label: 'Emagrecimento' },
  { id: 'HYPERTROPHY', label: 'Hipertrofia' },
  { id: 'MOBILITY', label: 'Mobilidade' },
]

export const gyms: Gym[] = [
  {
    gymId: 'gym_smartfit_paulista',
    name: 'Smart Fit Paulista',
    address: 'Av. Paulista, 1000',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Bela Vista',
    coordinates: { lat: -23.5613, lng: -46.6565 },
  },
  {
    gymId: 'gym_bluefit_pinheiros',
    name: 'Bluefit Pinheiros',
    address: 'R. dos Pinheiros, 500',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Pinheiros',
    coordinates: { lat: -23.5662, lng: -46.6818 },
  },
  {
    gymId: 'gym_bodytech_vilaolimpia',
    name: 'Bodytech Vila Olímpia',
    address: 'R. Olimpíadas, 200',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Vila Olímpia',
    coordinates: { lat: -23.5953, lng: -46.6864 },
  },
  {
    gymId: 'gym_selfit_moema',
    name: 'Selfit Moema',
    address: 'Av. Ibirapuera, 2000',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Moema',
    coordinates: { lat: -23.6043, lng: -46.6669 },
  },
  {
    gymId: 'gym_companhia_atletica_jardins',
    name: 'Companhia Atlética Jardins',
    address: 'R. Haddock Lobo, 1500',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Jardim Paulista',
    coordinates: { lat: -23.5614, lng: -46.6649 },
  },
]

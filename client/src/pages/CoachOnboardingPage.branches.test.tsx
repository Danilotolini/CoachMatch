import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import CoachOnboardingPage from './CoachOnboardingPage'
import { useOnboardingStore } from '@/stores/onboardingStore'

const mockNavigate = vi.fn()
const mockUpdateCoachMutate = vi.fn()
const mockVideoMutate = vi.fn()

let mockAuthEmail: string | null = 'coach@coachmatch.app'
let mockSpecialtiesData: { data: Array<{ id: string; label: string }> } | undefined = {
  data: [{ id: 'MUSCULATION', label: 'Musculação' }],
}
let mockVideoState = {
  isPending: false,
  progress: 0,
  isError: false,
}

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/lib/auth', () => ({
  getAuthUser: () => ({ email: mockAuthEmail }),
}))

vi.mock('@/hooks/useSpecialties', () => ({
  useSpecialties: () => ({ data: mockSpecialtiesData }),
}))

vi.mock('@/hooks/useCoachMe', () => ({
  useUpdateCoachMe: () => ({
    isPending: false,
    mutate: mockUpdateCoachMutate,
  }),
}))

vi.mock('@/hooks/useVideoUpload', () => ({
  useVideoUpload: () => ({
    mutate: mockVideoMutate,
    isPending: mockVideoState.isPending,
    progress: mockVideoState.progress,
    isError: mockVideoState.isError,
  }),
}))

vi.mock('@/components/onboarding/GymPicker', () => ({
  GymPicker: () => <div>Gym picker mock</div>,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <CoachOnboardingPage />
    </MemoryRouter>,
  )
}

describe('CoachOnboardingPage branch coverage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockUpdateCoachMutate.mockReset()
    mockVideoMutate.mockReset()
    mockAuthEmail = 'coach@coachmatch.app'
    mockSpecialtiesData = {
      data: [{ id: 'MUSCULATION', label: 'Musculação' }],
    }
    mockVideoState = {
      isPending: false,
      progress: 0,
      isError: false,
    }
    useOnboardingStore.getState().reset()
  })

  it('usa email e especialidades fallback quando os dados não chegam', () => {
    mockAuthEmail = null
    mockSpecialtiesData = undefined

    renderPage()

    expect(screen.getByDisplayValue('E-mail não informado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hipertrofia' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CrossFit' })).toBeInTheDocument()
  })

  it('atualiza o vídeo no sucesso e volta ao estado inicial no erro', async () => {
    mockVideoMutate.mockImplementationOnce((_file, options) => {
      options?.onSuccess?.('uploads/intro.mp4')
    })

    const { container, rerender } = renderPage()
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['video'], 'intro.mp4', { type: 'video/mp4' })

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText('Pronto: intro.mp4')).toBeInTheDocument()
    })
    expect(useOnboardingStore.getState().form.videoKey).toBe('uploads/intro.mp4')

    mockVideoMutate.mockImplementationOnce((_nextFile, options) => {
      options?.onError?.(new Error('upload failed'))
    })
    useOnboardingStore.getState().setVideoKey(null)

    rerender(
      <MemoryRouter>
        <CoachOnboardingPage />
      </MemoryRouter>,
    )

    const rerenderedFileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const nextFile = new File(['video'], 'erro.mp4', { type: 'video/mp4' })
    fireEvent.change(rerenderedFileInput, { target: { files: [nextFile] } })

    await waitFor(() => {
      expect(
        screen.getByText('Faça upload de um vídeo curto (até 60s) mostrando sua energia.'),
      ).toBeInTheDocument()
    })
  })

  it('mostra estados de upload pendente e erro', () => {
    mockVideoState = {
      isPending: true,
      progress: 42,
      isError: true,
    }

    renderPage()

    expect(screen.getByText('Enviando... 42%')).toBeInTheDocument()
    expect(screen.getByText('Falha no upload. Tente outro arquivo.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /concluir perfil/i })).toBeDisabled()
  })

  it('permite remover uma especialidade já selecionada pelo ícone do chip', async () => {
    useOnboardingStore.getState().toggleSpecialty('MUSCULATION')

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Remover Musculação' }))

    await waitFor(() => {
      expect(useOnboardingStore.getState().form.specialties).not.toContain('MUSCULATION')
    })
  })
})

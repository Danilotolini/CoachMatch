import { beforeEach, describe, expect, it } from 'vitest'
import type { Gym } from '@/types/api'
import { onlyDigits } from '@/lib/formatters'
import { buildCoachUpdatePayload, useOnboardingStore } from './onboardingStore'

const baseGym: Gym = {
  gymId: 'gym-1',
  name: 'Smart Fit Boa Viagem',
  address: 'Av. Boa Viagem, 1000',
  city: 'Recife',
  state: 'PE',
  neighborhood: 'Boa Viagem',
  coordinates: { lat: -8.12, lng: -34.9 },
}

beforeEach(() => {
  useOnboardingStore.getState().reset()
})

describe('onlyDigits', () => {
  it('remove tudo que não é dígito', () => {
    expect(onlyDigits('(81) 99999-1234')).toBe('81999991234')
    expect(onlyDigits('abc')).toBe('')
    expect(onlyDigits('')).toBe('')
  })
})

describe('updatePhone', () => {
  it('formata progressivamente conforme o usuário digita', () => {
    const { updatePhone } = useOnboardingStore.getState()

    updatePhone('8')
    expect(useOnboardingStore.getState().form.phone).toBe('8')

    updatePhone('81')
    expect(useOnboardingStore.getState().form.phone).toBe('81')

    updatePhone('8199')
    expect(useOnboardingStore.getState().form.phone).toBe('(81) 99')

    updatePhone('81999991')
    expect(useOnboardingStore.getState().form.phone).toBe('(81) 9999-91')

    updatePhone('8199999123')
    expect(useOnboardingStore.getState().form.phone).toBe('(81) 9999-9123')

    updatePhone('81999991234')
    expect(useOnboardingStore.getState().form.phone).toBe('(81) 99999-1234')
  })

  it('descarta dígitos além de 11', () => {
    useOnboardingStore.getState().updatePhone('81999991234999')
    expect(useOnboardingStore.getState().form.phone).toBe('(81) 99999-1234')
  })

  it('aceita entrada já formatada', () => {
    useOnboardingStore.getState().updatePhone('(81) 99999-1234')
    expect(useOnboardingStore.getState().form.phone).toBe('(81) 99999-1234')
  })
})

describe('updateInstagram', () => {
  it('remove @ inicial, baixa caixa e limita 30 caracteres', () => {
    useOnboardingStore.getState().updateInstagram('@MeuPerfil')
    expect(useOnboardingStore.getState().form.instagram).toBe('meuperfil')
  })

  it('mantém ponto e underline mas remove outros caracteres', () => {
    useOnboardingStore.getState().updateInstagram('user.name_01!@#')
    expect(useOnboardingStore.getState().form.instagram).toBe('user.name_01')
  })

  it('limita a 30 caracteres', () => {
    useOnboardingStore.getState().updateInstagram('a'.repeat(50))
    expect(useOnboardingStore.getState().form.instagram).toHaveLength(30)
  })
})

describe('updateCref', () => {
  it('formata para 000000-G/SP conforme o usuário digita', () => {
    const { updateCref } = useOnboardingStore.getState()

    updateCref('123456')
    expect(useOnboardingStore.getState().form.cref).toBe('123456')

    updateCref('123456G')
    expect(useOnboardingStore.getState().form.cref).toBe('123456-G')

    updateCref('123456GSP')
    expect(useOnboardingStore.getState().form.cref).toBe('123456-G/SP')
  })

  it('aceita também P como categoria', () => {
    useOnboardingStore.getState().updateCref('000111PRJ')
    expect(useOnboardingStore.getState().form.cref).toBe('000111-P/RJ')
  })

  it('ignora dígitos depois dos 6 primeiros', () => {
    useOnboardingStore.getState().updateCref('1234567890GSP')
    expect(useOnboardingStore.getState().form.cref).toBe('123456-G/SP')
  })

  it('apagar separador remove também o caractere de conteúdo anterior', () => {
    useOnboardingStore.getState().updateCref('123456-G/SP')
    expect(useOnboardingStore.getState().form.cref).toBe('123456-G/SP')

    // Usuário apaga o "/" → o "G" antes do separador também sai. O "S" sobra
    // mas é descartado por não ser categoria válida (G|P), restando "123456-P".
    useOnboardingStore.getState().updateCref('123456-GSP')
    expect(useOnboardingStore.getState().form.cref).toBe('123456-P')
  })
})

describe('toggleSpecialty', () => {
  it('adiciona quando ausente, remove quando presente', () => {
    const { toggleSpecialty } = useOnboardingStore.getState()

    toggleSpecialty('Musculação')
    expect(useOnboardingStore.getState().form.specialties).toEqual(['Musculação'])

    toggleSpecialty('Musculação')
    expect(useOnboardingStore.getState().form.specialties).toEqual([])
  })

  it('não impõe limite máximo de especialidades', () => {
    const { toggleSpecialty } = useOnboardingStore.getState()

    toggleSpecialty('A')
    toggleSpecialty('B')
    toggleSpecialty('C')
    toggleSpecialty('D')
    toggleSpecialty('E')

    expect(useOnboardingStore.getState().form.specialties).toEqual(['A', 'B', 'C', 'D', 'E'])
  })

  it('limpa erro de specialties ao alterar', () => {
    useOnboardingStore.getState().validate() // força erro
    expect(useOnboardingStore.getState().errors.specialties).toBeDefined()

    useOnboardingStore.getState().toggleSpecialty('Yoga')
    expect(useOnboardingStore.getState().errors.specialties).toBeUndefined()
  })
})

describe('addGym / removeGym', () => {
  it('adiciona uma academia e limpa erros relacionados', () => {
    useOnboardingStore.getState().setGymError('Erro qualquer')

    useOnboardingStore.getState().addGym(baseGym)

    const state = useOnboardingStore.getState()
    expect(state.form.gyms).toHaveLength(1)
    expect(state.form.gyms[0]).toMatchObject({
      id: 'gym-1',
      name: 'Smart Fit Boa Viagem',
      city: 'Recife',
    })
    expect(state.errors.gyms).toBeUndefined()
  })

  it('não duplica academia já adicionada', () => {
    useOnboardingStore.getState().addGym(baseGym)
    useOnboardingStore.getState().addGym(baseGym)

    expect(useOnboardingStore.getState().form.gyms).toHaveLength(1)
  })

  it('remove academia pelo id', () => {
    useOnboardingStore.getState().addGym(baseGym)
    useOnboardingStore.getState().removeGym('gym-1')

    expect(useOnboardingStore.getState().form.gyms).toEqual([])
  })

  it('setGymError armazena mensagem em errors.gyms', () => {
    useOnboardingStore.getState().setGymError('Localização inválida')
    expect(useOnboardingStore.getState().errors.gyms).toBe('Localização inválida')
  })
})

describe('setVideoKey', () => {
  it('atualiza a chave do vídeo', () => {
    useOnboardingStore.getState().setVideoKey('uploads/abc123.mp4')
    expect(useOnboardingStore.getState().form.videoKey).toBe('uploads/abc123.mp4')

    useOnboardingStore.getState().setVideoKey(null)
    expect(useOnboardingStore.getState().form.videoKey).toBeNull()
  })
})

describe('setSpecialtySearch', () => {
  it('atualiza o campo de busca de especialidades', () => {
    useOnboardingStore.getState().setSpecialtySearch('cross')

    expect(useOnboardingStore.getState().specialtySearch).toBe('cross')
  })
})

describe('validate', () => {
  it('retorna false e popula erros quando o form está vazio', () => {
    const ok = useOnboardingStore.getState().validate()
    const { errors } = useOnboardingStore.getState()

    expect(ok).toBe(false)
    expect(errors.name).toBeDefined()
    expect(errors.phone).toBeDefined()
    expect(errors.cref).toBeDefined()
    expect(errors.specialties).toBeDefined()
    expect(errors.gyms).toBeDefined()
    // instagram vazio é válido
    expect(errors.instagram).toBeUndefined()
  })

  it('exige telefone com 10 ou 11 dígitos', () => {
    useOnboardingStore.getState().updatePhone('8199999')
    useOnboardingStore.getState().validate()
    expect(useOnboardingStore.getState().errors.phone).toBeDefined()

    useOnboardingStore.getState().updatePhone('8199991234') // 10 dígitos
    useOnboardingStore.getState().validate()
    expect(useOnboardingStore.getState().errors.phone).toBeUndefined()
  })

  it('valida o formato do CREF', () => {
    useOnboardingStore.getState().update('cref', '123-XX')
    useOnboardingStore.getState().validate()
    expect(useOnboardingStore.getState().errors.cref).toBeDefined()

    useOnboardingStore.getState().update('cref', '123456-G/SP')
    useOnboardingStore.getState().validate()
    expect(useOnboardingStore.getState().errors.cref).toBeUndefined()
  })

  it('aceita qualquer quantidade ≥ 1 de especialidades', () => {
    useOnboardingStore.setState((state) => ({
      form: { ...state.form, specialties: ['A', 'B', 'C', 'D', 'E'] },
    }))
    useOnboardingStore.getState().validate()
    expect(useOnboardingStore.getState().errors.specialties).toBeUndefined()
  })

  it('aceita formulário completo (true) e zera os erros', () => {
    const store = useOnboardingStore.getState()
    store.updateName('João Silva')
    store.updatePhone('81999991234')
    store.updateCref('123456GSP')
    store.toggleSpecialty('Musculação')
    store.addGym(baseGym)

    const ok = useOnboardingStore.getState().validate()
    expect(ok).toBe(true)
    expect(useOnboardingStore.getState().errors).toEqual({})
  })

  it('exige pelo menos uma academia parceira', () => {
    const store = useOnboardingStore.getState()
    store.updatePhone('81999991234')
    store.updateCref('123456GSP')
    store.toggleSpecialty('Musculação')

    expect(useOnboardingStore.getState().validate()).toBe(false)
    expect(useOnboardingStore.getState().errors.gyms).toBeDefined()
  })

  it('valida instagram quando preenchido com caracteres inválidos', () => {
    // Bypassa a máscara para testar a regra de validação diretamente
    useOnboardingStore.setState((state) => ({
      form: { ...state.form, instagram: 'INVALIDO!' },
    }))
    useOnboardingStore.getState().validate()
    expect(useOnboardingStore.getState().errors.instagram).toBeDefined()
  })
})

describe('update / clearError', () => {
  it('limpa o erro do campo ao atualizá-lo', () => {
    useOnboardingStore.getState().validate()
    expect(useOnboardingStore.getState().errors.phone).toBeDefined()

    useOnboardingStore.getState().update('phone', '(81) 99999-1234')
    expect(useOnboardingStore.getState().errors.phone).toBeUndefined()
  })
})

describe('reset', () => {
  it('volta ao estado inicial', () => {
    const store = useOnboardingStore.getState()
    store.updatePhone('81999991234')
    store.toggleSpecialty('Musculação')
    store.addGym(baseGym)
    store.setSpecialtySearch('cross')
    store.setGymError('algo')

    store.reset()

    const state = useOnboardingStore.getState()
    expect(state.form).toEqual({
      name: '',
      phone: '',
      instagram: '',
      cref: '',
      specialties: [],
      gyms: [],
      photoKey: null,
      videoKey: null,
    })
    expect(state.errors).toEqual({})
    expect(state.specialtySearch).toBe('')
  })
})

describe('buildCoachUpdatePayload', () => {
  it('monta payload com profile e work_location a partir do form', () => {
    const store = useOnboardingStore.getState()
    store.updateName('João Silva')
    store.updatePhone('81999991234')
    store.updateInstagram('@meuperfil')
    store.update('cref', '123456-G/SP')
    store.toggleSpecialty('Musculação')
    store.addGym(baseGym)
    store.setPhotoKey('uploads/p.jpg')
    store.setVideoKey('uploads/v.mp4')

    const payload = buildCoachUpdatePayload(useOnboardingStore.getState().form)

    expect(payload.profile).toEqual({
      phone: '81999991234',
      instagram: '@meuperfil',
      cref: '123456-G/SP',
      specialties: ['Musculação'],
      photo_key: 'uploads/p.jpg',
      video_key: 'uploads/v.mp4',
      name: 'João Silva',
    })
    expect(payload.work_location).toEqual([{ type: 'GYM', gymId: 'gym-1' }])
  })

  it('usa o nome editável do form', () => {
    useOnboardingStore.getState().updateName('  João Silva  ')
    const payload = buildCoachUpdatePayload(useOnboardingStore.getState().form)
    expect(payload.profile?.name).toBe('João Silva')
  })

  it('deixa instagram vazio quando o form não tem handle', () => {
    const payload = buildCoachUpdatePayload(useOnboardingStore.getState().form)
    expect(payload.profile?.instagram).toBe('')
  })

  it('mantém photo_key/video_key nulos quando não há mídia', () => {
    const payload = buildCoachUpdatePayload(useOnboardingStore.getState().form)
    expect(payload.profile?.photo_key).toBeNull()
    expect(payload.profile?.video_key).toBeNull()
  })
})

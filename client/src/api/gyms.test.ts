import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fetchGyms } from './gyms'
import { server } from '@/mocks/server'
import { loginAs } from '@/test/session'

beforeEach(() => {
  loginAs('coach')
})

describe('gyms API', () => {
  it('normaliza resposta com items/id e mostra apenas academias active True', async () => {
    server.use(
      http.get('*/coach/gyms', () =>
        HttpResponse.json({
          items: [
            {
              id: 'gym_sp001',
              city: 'São Paulo',
              active: 'True',
              neighborhood: 'Bela Vista',
              address: 'Av. Paulista, 1000',
              name: 'Smart Fit Paulista',
              coordinates: { lng: -46.655881, lat: -23.561414 },
              state: 'SP',
            },
            {
              id: 'gym_sp002',
              city: 'São Paulo',
              active: 'False',
              neighborhood: 'Centro',
              address: 'R. Teste, 180',
              name: 'Academia Teste',
              coordinates: { lng: -48.5495, lat: -27.5966 },
              state: 'SP',
            },
            {
              id: 'gym_sp003',
              city: 'São Paulo',
              neighborhood: 'Consolação',
              address: 'R. Augusta, 2500',
              name: 'Academia sem active',
              coordinates: { lng: -46.66, lat: -23.557 },
              state: 'SP',
            },
          ],
          nextCursor: 'cursor-1',
        }),
      ),
    )

    const result = await fetchGyms({ search: 'smart fit' })

    expect(result.data).toEqual([
      {
        gymId: 'gym_sp001',
        city: 'São Paulo',
        neighborhood: 'Bela Vista',
        address: 'Av. Paulista, 1000',
        name: 'Smart Fit Paulista',
        coordinates: { lng: -46.655881, lat: -23.561414 },
        state: 'SP',
      },
    ])
    expect(result.nextCursor).toBe('cursor-1')
  })

  it('não aceita o envelope antigo com data/gymId', async () => {
    server.use(
      http.get('*/coach/gyms', () =>
        HttpResponse.json({
          data: [
            {
              gymId: 'gym_sp001',
              city: 'São Paulo',
              active: 'True',
              neighborhood: 'Bela Vista',
              address: 'Av. Paulista, 1000',
              name: 'Smart Fit Paulista',
              coordinates: { lng: -46.655881, lat: -23.561414 },
              state: 'SP',
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        }),
      ),
    )

    const result = await fetchGyms({ search: 'smart fit' })

    expect(result.data).toEqual([])
  })
})

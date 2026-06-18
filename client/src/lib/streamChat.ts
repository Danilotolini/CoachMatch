import { StreamChat } from 'stream-chat'
import { getChatToken } from '@/api/chat'
import type { Role } from '@/stores/sessionStore'
import type { ChatMessage } from '@/types/api'

/**
 * Conexão direta (WebSocket) ao Stream Chat, usada só para o realtime da thread
 * aberta. Listar/enviar/criar conversas continua via REST no backend — esta
 * camada apenas empurra eventos novos pro cache. Quando a conexão não está
 * disponível (ex.: ambiente de teste, falha de rede), `getChatClient` devolve
 * `null` e a UI cai no polling REST.
 */

interface StreamUser {
  id?: string
}

interface StreamRawMessage {
  id?: string
  text?: string
  user?: StreamUser | null
  created_at?: string | Date
  updated_at?: string | Date
  deleted_at?: string | Date | null
}

let connection: { role: Role; client: StreamChat } | null = null
let pending: Promise<StreamChat | null> | null = null

/**
 * O Stream abre um WebSocket real, que não existe sob happy-dom/MSW. Desabilitar
 * em teste mantém a suíte determinística (cai no polling) sem mockar o módulo.
 */
function realtimeEnabled(): boolean {
  return import.meta.env.MODE !== 'test'
}

export async function getChatClient(role: Role): Promise<StreamChat | null> {
  if (!realtimeEnabled()) return null
  if (connection?.role === role) return connection.client
  if (pending) return pending

  pending = (async () => {
    try {
      const first = await getChatToken(role)
      const client = StreamChat.getInstance(first.apiKey)

      // Troca de papel (coach↔aluno) reaproveita o singleton por apiKey: desconecta
      // o usuário anterior antes de conectar o novo.
      if (client.userID && client.userID !== first.userId) {
        await client.disconnectUser()
      }

      // Passa um provider pra renovar o token (TTL 24h) sem reconectar na mão,
      // reaproveitando o token já emitido na primeira chamada.
      let firstUse = true
      const tokenProvider = async () => {
        if (firstUse) {
          firstUse = false
          return first.token
        }
        return (await getChatToken(role)).token
      }

      await client.connectUser({ id: first.userId }, tokenProvider)
      connection = { role, client }
      return client
    } catch {
      return null
    } finally {
      pending = null
    }
  })()

  return pending
}

export async function disconnectChat(): Promise<void> {
  const current = connection
  connection = null
  if (current) {
    try {
      await current.client.disconnectUser()
    } catch {
      // desconexão best-effort
    }
  }
}

/** Converte uma mensagem do Stream pro formato exposto pela API REST. */
export function serializeStreamMessage(
  raw: StreamRawMessage | null | undefined,
): ChatMessage | null {
  if (!raw?.id) return null
  const toIso = (value: string | Date | null | undefined): string | undefined => {
    if (!value) return undefined
    return value instanceof Date ? value.toISOString() : value
  }
  const createdAt = toIso(raw.created_at)
  const updatedAt = toIso(raw.updated_at)
  return {
    id: raw.id,
    text: raw.text ?? '',
    userId: raw.user?.id ?? '',
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    deletedAt: raw.deleted_at ? (toIso(raw.deleted_at) ?? null) : null,
  }
}

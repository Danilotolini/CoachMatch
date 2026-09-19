import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../list-gyms/repository.js', () => ({
  listGyms: vi.fn(),
}));

import { handler } from '../list-gyms/handler.js';
import { listGyms } from '../list-gyms/index.js';
import { listGyms as listGymsRepository } from '../list-gyms/repository.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const rawGyms = [
  { gymId: 'gym-1', name: 'Academia A', address: 'Rua A', city: 'São Paulo', state: 'SP', neighborhood: 'Centro',   coordinates: { lat: -23, lng: -46 } },
  { gymId: 'gym-2', name: 'Academia B', address: 'Rua B', city: 'Rio de Janeiro', state: 'RJ', neighborhood: 'Lapa', coordinates: { lat: -22, lng: -43 } },
  { gymId: 'gym-3', name: 'Academia C', address: 'Rua C', city: 'Belo Horizonte', state: 'MG', neighborhood: 'Savassi', coordinates: { lat: -19, lng: -43 } },
];

// ─── Business Logic (index) ───────────────────────────────────────────────────
describe('list-gyms › index (listGyms)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna todas as academias quando não há filtro', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const result = await listGyms();

    expect(result.items).toHaveLength(3);
    expect(result.nextCursor).toBeNull();
  });

  it('filtra por nome (case-insensitive)', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const result = await listGyms({ search: 'academia a' });

    expect(result.items).toEqual([rawGyms[0]]);
  });

  it('filtra com uma única letra, sem mínimo de caracteres', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const result = await listGyms({ search: 'j' });

    expect(result.items).toEqual([rawGyms[1]]);
  });

  it('filtra por cidade quando o termo bate no campo city', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const result = await listGyms({ search: 'rio de janeiro' });

    expect(result.items).toEqual([rawGyms[1]]);
  });

  it('filtra por bairro quando o termo só bate no campo neighborhood', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const result = await listGyms({ search: 'savassi' });

    expect(result.items).toEqual([rawGyms[2]]);
  });

  it('ignora espaços nas pontas do termo de busca', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const result = await listGyms({ search: '  academia a  ' });

    expect(result.items).toEqual([rawGyms[0]]);
  });

  it('filtra por city exato', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const result = await listGyms({ city: 'São Paulo' });

    expect(result.items).toEqual([rawGyms[0]]);
  });

  it('city é case-insensitive', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const result = await listGyms({ city: 'SÃO PAULO' });

    expect(result.items).toEqual([rawGyms[0]]);
  });

  it('combina search e city — precisa satisfazer os dois, não é OR', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    // "centro" só bate no bairro de gym-1 (São Paulo); city aqui pede Rio de Janeiro.
    // Nenhuma academia satisfaz os dois filtros ao mesmo tempo.
    const result = await listGyms({ search: 'centro', city: 'Rio de Janeiro' });

    expect(result.items).toEqual([]);
  });

  it('pagina os resultados filtrados via cursor', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const firstPage = await listGyms({ limit: 1 });

    expect(firstPage.items).toEqual([rawGyms[0]]);
    expect(firstPage.nextCursor).not.toBeNull();

    const secondPage = await listGyms({ limit: 1, cursor: firstPage.nextCursor });
    expect(secondPage.items).toEqual([rawGyms[1]]);
    expect(secondPage.nextCursor).not.toBeNull();

    const thirdPage = await listGyms({ limit: 1, cursor: secondPage.nextCursor });
    expect(thirdPage.items).toEqual([rawGyms[2]]);
    expect(thirdPage.nextCursor).toBeNull();
  });

  it('cursor inválido/corrompido cai para a primeira página em vez de quebrar', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const garbageCursor = Buffer.from('not-a-number', 'utf8').toString('base64');

    const result = await listGyms({ cursor: garbageCursor });

    expect(result.items).toEqual(rawGyms);
  });
});

// ─── Handler ─────────────────────────────────────────────────────────────────
describe('list-gyms › handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna 200 com items onde gymId é renomeado para id', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const response = await handler({});

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.items[0].id).toBe('gym-1');
    expect(body.items[0].gymId).toBeUndefined();
    expect(body.items[1].id).toBe('gym-2');
  });

  it('nextCursor é null quando não há próxima página', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const response = await handler({});
    expect(JSON.parse(response.body).nextCursor).toBeNull();
  });

  it('repassa search da query string para a busca', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const response = await handler({
      queryStringParameters: { search: 'academia a' },
    });
    expect(JSON.parse(response.body).items).toHaveLength(1);
  });

  it('repassa city da query string para a busca', async () => {
    listGymsRepository.mockResolvedValue(rawGyms);
    const response = await handler({
      queryStringParameters: { city: 'Belo Horizonte' },
    });
    const body = JSON.parse(response.body);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe('gym-3');
  });

  it('usa limit 20 por padrão quando queryStringParameters está ausente', async () => {
    listGymsRepository.mockResolvedValue([]);
    const response = await handler({});
    expect(JSON.parse(response.body).items).toEqual([]);
  });

  it('retorna lista vazia quando não há academias', async () => {
    listGymsRepository.mockResolvedValue([]);
    const response = await handler({});
    expect(JSON.parse(response.body).items).toHaveLength(0);
  });

  it('retorna 500 em erros do repositório', async () => {
    listGymsRepository.mockRejectedValue(new Error('DynamoDB indisponível'));
    const result = await handler({});
    expect(result.statusCode).toBe(500);
  });
});

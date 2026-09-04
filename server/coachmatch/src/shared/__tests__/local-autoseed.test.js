import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../students/get-student/repository.js', () => ({ findStudentById: vi.fn() }));
vi.mock('../../coaches/get-coach/repository.js',    () => ({ findCoachById:   vi.fn() }));
vi.mock('../../students/create-student/index.js',   () => ({ createStudent:   vi.fn() }));
vi.mock('../../coaches/create-coach/index.js',      () => ({ createCoach:     vi.fn() }));

vi.mock('../logger.js', async (importOriginal) => ({
  ...(await importOriginal()),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { ensureLocalRecord } from '../local-autoseed.js';
import { findStudentById } from '../../students/get-student/repository.js';
import { findCoachById } from '../../coaches/get-coach/repository.js';
import { createStudent } from '../../students/create-student/index.js';
import { createCoach } from '../../coaches/create-coach/index.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SUB = '037c4a8a-6031-705c-e02f-8e45f93bd387';

const buildEvent = (claims = {}) => ({
  requestContext: {
    authorizer: {
      jwt: { claims: { sub: SUB, email: 'joao@exemplo.com', name: 'João', ...claims } },
    },
  },
});

const originalStage = process.env.STAGE;

describe('local-autoseed › ensureLocalRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STAGE = 'local';
  });

  afterEach(() => {
    if (originalStage === undefined) delete process.env.STAGE;
    else process.env.STAGE = originalStage;
  });

  it('é no-op fora da stage local', async () => {
    process.env.STAGE = 'dev';

    await ensureLocalRecord('student', buildEvent());

    expect(findStudentById).not.toHaveBeenCalled();
    expect(createStudent).not.toHaveBeenCalled();
  });

  it('ignora evento sem sub nas claims', async () => {
    await ensureLocalRecord('student', { requestContext: {} });

    expect(findStudentById).not.toHaveBeenCalled();
    expect(createStudent).not.toHaveBeenCalled();
  });

  it('não sobrescreve registro existente', async () => {
    findStudentById.mockResolvedValue({ studentId: SUB, status: 'ONBOARDING_HEALTH' });

    await ensureLocalRecord('student', buildEvent());

    expect(createStudent).not.toHaveBeenCalled();
  });

  it('cria o registro a partir das claims quando não existe', async () => {
    findStudentById.mockResolvedValue(null);

    await ensureLocalRecord('student', buildEvent());

    expect(createStudent).toHaveBeenCalledWith({
      sub: SUB,
      email: 'joao@exemplo.com',
      name: 'João',
    });
  });

  it('deriva name de given_name/family_name quando name não vem', async () => {
    findStudentById.mockResolvedValue(null);

    await ensureLocalRecord(
      'student',
      buildEvent({ name: undefined, given_name: 'João', family_name: 'Silva' })
    );

    expect(createStudent).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'João Silva' })
    );
  });

  it('usa o e-mail quando não há nenhum atributo de nome', async () => {
    findStudentById.mockResolvedValue(null);

    await ensureLocalRecord('student', buildEvent({ name: undefined }));

    expect(createStudent).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'joao@exemplo.com' })
    );
  });

  it('não propaga erro de criação — o handler segue para o 404 normal', async () => {
    findStudentById.mockResolvedValue(null);
    createStudent.mockRejectedValue(new Error('Atributos do Cognito inválidos'));

    await expect(ensureLocalRecord('student', buildEvent())).resolves.toBeUndefined();
  });

  it('usa o repositório de coach quando o papel é coach', async () => {
    findCoachById.mockResolvedValue(null);

    await ensureLocalRecord('coach', buildEvent());

    expect(createCoach).toHaveBeenCalledWith({
      sub: SUB,
      email: 'joao@exemplo.com',
      name: 'João',
    });
    expect(createStudent).not.toHaveBeenCalled();
  });
});

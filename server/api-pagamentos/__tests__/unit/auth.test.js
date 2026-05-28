// Mock CognitoJwtVerifier para evitar erros de config
jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: jest.fn().mockReturnValue({
      verify: jest.fn().mockResolvedValue({
        sub: 'user_123',
        email: 'user@example.com',
        'cognito:username': 'testuser',
        'cognito:groups': ['admin', 'coach'],
      }),
    }),
  },
}));

// Setar variáveis de ambiente antes de importar auth.js
process.env.COGNITO_USER_POOL_ID = 'us-east-1_XXXXXXXXX';
process.env.COGNITO_CLIENT_ID = 'test_client_id';

const { auth } = require('../../middlewares/auth');

describe('Middleware - Auth', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('Valid Token', () => {
    it('deve extrair payload do token e chamar next', async () => {
      req.headers.authorization = 'Bearer valid_token_123';

      await auth(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.email).toBe('user@example.com');
      expect(next).toHaveBeenCalled();
    });

    it('deve incluir sub, email e username no request', async () => {
      req.headers.authorization = 'Bearer token_with_groups';

      await auth(req, res, next);

      expect(req.user).toHaveProperty('sub', 'user_123');
      expect(req.user).toHaveProperty('email', 'user@example.com');
      expect(req.user).toHaveProperty('username', 'testuser');
      expect(req.user).toHaveProperty('groups');
    });

    it('deve setar groups como array vazio se não existir', async () => {
      const { CognitoJwtVerifier } = require('aws-jwt-verify');
      CognitoJwtVerifier.create().verify.mockResolvedValueOnce({
        sub: 'user_456',
        email: 'nogroups@test.com',
        'cognito:username': 'nogroups',
        // Sem 'cognito:groups'
      });

      req.headers.authorization = 'Bearer token_no_groups';

      await auth(req, res, next);

      expect(req.user.groups).toEqual([]);
    });

    it('deve setar groups quando fornecido', async () => {
      req.headers.authorization = 'Bearer token_with_groups';

      await auth(req, res, next);

      expect(Array.isArray(req.user.groups)).toBe(true);
      expect(req.user.groups.length).toBeGreaterThan(0);
    });
  });

  describe('Missing Authorization', () => {
    it('deve retornar 401 quando header não existe', async () => {
      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Token') }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('deve retornar 401 quando authorization não começa com Bearer', async () => {
      req.headers.authorization = 'Basic credentials123';

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('deve retornar 401 quando header está vazio', async () => {
      req.headers.authorization = '';

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Invalid Token', () => {
    it('deve retornar 401 quando verificação falha', async () => {
      const { CognitoJwtVerifier } = require('aws-jwt-verify');
      // Força erro na próxima chamada
      CognitoJwtVerifier.create().verify.mockRejectedValueOnce(
        new Error('Invalid token'),
      );

      req.headers.authorization = 'Bearer invalid_token';

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Token') }),
      );
    });

    it('deve retornar erro genérico para qualquer exceção de verificação', async () => {
      const { CognitoJwtVerifier } = require('aws-jwt-verify');
      CognitoJwtVerifier.create().verify.mockRejectedValueOnce(
        new Error('Connection error'),
      );

      req.headers.authorization = 'Bearer token';

      await auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Bearer Format Parsing', () => {
    it('deve extrair token corretamente depois de Bearer', async () => {
      req.headers.authorization = 'Bearer token_value_here';

      await auth(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

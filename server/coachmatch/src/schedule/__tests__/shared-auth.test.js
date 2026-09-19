import { describe, it, expect } from 'vitest';
import { getActorIdFromJwt } from '../shared/auth.js';
import { UnauthorizedException } from '../shared/exceptions.js';

describe('schedule/shared/auth', () => {
  it('extrai o sub do JWT do requestContext', () => {
    const event = { requestContext: { authorizer: { jwt: { claims: { sub: 'coach-123' } } } } };
    expect(getActorIdFromJwt(event)).toBe('coach-123');
  });

  it('lança UnauthorizedException quando não há sub', () => {
    expect(() => getActorIdFromJwt({})).toThrow(UnauthorizedException);
  });

  it('lança UnauthorizedException quando authorizer está ausente', () => {
    expect(() => getActorIdFromJwt({ requestContext: {} })).toThrow(UnauthorizedException);
  });
});

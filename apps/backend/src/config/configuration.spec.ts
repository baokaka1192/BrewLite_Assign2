import { assertProductionJwtSecret } from './configuration';

describe('assertProductionJwtSecret', () => {
  const strong = 'x'.repeat(32);

  it('allows a missing secret outside production', () => {
    expect(() => assertProductionJwtSecret({ NODE_ENV: 'development' })).not.toThrow();
    expect(() => assertProductionJwtSecret({ NODE_ENV: 'test' })).not.toThrow();
  });

  it('throws in production when JWT_SECRET is unset', () => {
    expect(() => assertProductionJwtSecret({ NODE_ENV: 'production' })).toThrow('JWT_SECRET must be set');
  });

  it.each(['change-me', 'dev-secret'])('throws in production for placeholder secret "%s"', (secret) => {
    expect(() => assertProductionJwtSecret({ NODE_ENV: 'production', JWT_SECRET: secret })).toThrow(
      'at least 32 characters',
    );
  });

  it('throws in production when JWT_SECRET is shorter than 32 characters', () => {
    expect(() =>
      assertProductionJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(31) }),
    ).toThrow('at least 32 characters');
  });

  it('accepts a strong secret in production', () => {
    expect(() => assertProductionJwtSecret({ NODE_ENV: 'production', JWT_SECRET: strong })).not.toThrow();
  });
});

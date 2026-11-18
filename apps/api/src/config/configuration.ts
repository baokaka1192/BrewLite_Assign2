const WEAK_SECRETS = ['change-me', 'dev-secret'];
const MIN_PRODUCTION_SECRET_LENGTH = 32;

/** Throws when production runs with a missing, placeholder or short JWT secret. */
export function assertProductionJwtSecret(env: NodeJS.ProcessEnv): void {
  if (env.NODE_ENV !== 'production') return;
  const secret = env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be set when NODE_ENV=production');
  }
  if (WEAK_SECRETS.includes(secret) || secret.length < MIN_PRODUCTION_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters and not a placeholder when NODE_ENV=production`,
    );
  }
}

export default () => {
  assertProductionJwtSecret(process.env);
  return {
    port: parseInt(process.env.PORT ?? '4000', 10),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    databaseUrl: process.env.DATABASE_URL,
    jwt: {
      // The dev fallback is only reachable outside production (checked above).
      secret: process.env.JWT_SECRET ?? 'dev-secret',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
    },
  };
};

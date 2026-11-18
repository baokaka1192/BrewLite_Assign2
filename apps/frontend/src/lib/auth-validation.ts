export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors = Partial<Record<'email' | 'password', string>>;

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return 'Email is required.';
  if (!EMAIL_RE.test(email)) return 'Enter a valid email address.';
  return undefined;
}

export function validateRegisterPassword(value: string): string | undefined {
  if (!value) return 'Password is required.';
  if (value.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (value.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters.`;
  return undefined;
}

export function validateLoginPassword(value: string): string | undefined {
  return value ? undefined : 'Password is required.';
}

export function validateRegister(input: { email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {};
  const email = validateEmail(input.email);
  const password = validateRegisterPassword(input.password);
  if (email) errors.email = email;
  if (password) errors.password = password;
  return errors;
}

export function validateLogin(input: { email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {};
  const email = validateEmail(input.email);
  const password = validateLoginPassword(input.password);
  if (email) errors.email = email;
  if (password) errors.password = password;
  return errors;
}

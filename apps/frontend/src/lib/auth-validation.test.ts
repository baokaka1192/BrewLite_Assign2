import { describe, expect, it } from 'vitest';
import {
  validateEmail,
  validateLogin,
  validateRegister,
  validateRegisterPassword,
} from './auth-validation';

describe('validateEmail', () => {
  it('requires a value', () => {
    expect(validateEmail('   ')).toBe('Email is required.');
  });

  it('accepts plausible addresses and rejects malformed ones', () => {
    expect(validateEmail(' jane@example.com ')).toBeUndefined();
    expect(validateEmail('jane@example')).toBe('Enter a valid email address.');
    expect(validateEmail('jane example@x.com')).toBe('Enter a valid email address.');
    expect(validateEmail('@example.com')).toBe('Enter a valid email address.');
  });
});

describe('validateRegisterPassword', () => {
  it('enforces 8 to 72 characters', () => {
    expect(validateRegisterPassword('')).toBe('Password is required.');
    expect(validateRegisterPassword('1234567')).toBe('Password must be at least 8 characters.');
    expect(validateRegisterPassword('12345678')).toBeUndefined();
    expect(validateRegisterPassword('a'.repeat(72))).toBeUndefined();
    expect(validateRegisterPassword('a'.repeat(73))).toBe('Password must be at most 72 characters.');
  });
});

describe('validateRegister', () => {
  it('returns no errors for valid input', () => {
    expect(validateRegister({ email: 'a@b.co', password: 'longenough' })).toEqual({});
  });

  it('returns field errors for both fields', () => {
    const errors = validateRegister({ email: 'nope', password: 'short' });
    expect(errors.email).toBe('Enter a valid email address.');
    expect(errors.password).toBe('Password must be at least 8 characters.');
  });
});

describe('validateLogin', () => {
  it('only requires a non-empty password (no length rule on login)', () => {
    expect(validateLogin({ email: 'a@b.co', password: 'x' })).toEqual({});
    expect(validateLogin({ email: 'a@b.co', password: '' })).toEqual({ password: 'Password is required.' });
  });
});

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hashSync: jest.fn(() => 'dummy-hash'),
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockedBcrypt = bcrypt as unknown as {
  hash: jest.Mock;
  compare: jest.Mock;
};

const storedUser = {
  id: 'u1',
  email: 'an@example.com',
  passwordHash: 'stored-hash',
  name: 'An',
  loyaltyPoints: 3,
};

describe('AuthService', () => {
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock } };
  let jwt: { signAsync: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = { user: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() } };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    service = new AuthService(
      new UsersService(prisma as unknown as PrismaService),
      jwt as unknown as JwtService,
    );
  });

  describe('register', () => {
    it('hashes the password with bcrypt and stores a normalized email', async () => {
      mockedBcrypt.hash.mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue({ ...storedUser, passwordHash: 'hashed' });

      const res = await service.register({ email: '  An@Example.COM ', password: 'secret123', name: 'An' });

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('secret123', 10);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'an@example.com' } });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'an@example.com', passwordHash: 'hashed', name: 'An' },
      });
      expect(res.accessToken).toBe('signed-token');
    });

    it('never returns the password hash', async () => {
      mockedBcrypt.hash.mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue({ ...storedUser, passwordHash: 'hashed' });

      const res = await service.register({ email: 'an@example.com', password: 'secret123' });

      expect(res.user).toEqual({ id: 'u1', email: 'an@example.com', name: 'An', loyaltyPoints: 3 });
      expect(JSON.stringify(res)).not.toContain('hashed');
    });

    it('signs a token with the user id as subject', async () => {
      mockedBcrypt.hash.mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue({ ...storedUser, passwordHash: 'hashed' });

      await service.register({ email: 'an@example.com', password: 'secret123' });

      expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u1', email: 'an@example.com' });
    });

    it('throws 409 when the email is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue(storedUser);

      await expect(service.register({ email: 'an@example.com', password: 'secret123' })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('maps a unique-constraint race to 409', async () => {
      mockedBcrypt.hash.mockResolvedValue('hashed');
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.register({ email: 'an@example.com', password: 'secret123' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('returns the user and a token when the password matches', async () => {
      prisma.user.findUnique.mockResolvedValue(storedUser);
      mockedBcrypt.compare.mockResolvedValue(true);

      const res = await service.login({ email: 'AN@example.com', password: 'secret123' });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'an@example.com' } });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('secret123', 'stored-hash');
      expect(res.accessToken).toBe('signed-token');
      expect(res.user.id).toBe('u1');
    });

    it('throws a generic 401 when the password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(storedUser);
      mockedBcrypt.compare.mockResolvedValue(false);

      await expect(service.login({ email: 'an@example.com', password: 'wrong-pass' })).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
    });

    it('throws the same generic 401 for an unknown email and still runs a bcrypt compare', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.compare.mockResolvedValue(false);

      await expect(service.login({ email: 'nobody@example.com', password: 'secret123' })).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
      expect(mockedBcrypt.compare).toHaveBeenCalledTimes(1);
    });
  });

  describe('me', () => {
    it('returns the public profile of the user', async () => {
      prisma.user.findUnique.mockResolvedValue(storedUser);

      await expect(service.me('u1')).resolves.toEqual({
        id: 'u1',
        email: 'an@example.com',
        name: 'An',
        loyaltyPoints: 3,
      });
    });

    it('throws 401 when the token subject no longer exists', async () => {
      await expect(service.me('ghost')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});

import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthUser } from './auth-user';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 10;
const INVALID_CREDENTIALS = 'Invalid email or password';
const EMAIL_TAKEN = 'Email already registered';
// Compared against when the email is unknown so both login failure paths do similar work.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', BCRYPT_ROUNDS);

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  loyaltyPoints: number;
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    loyaltyPoints: user.loyaltyPoints,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = normalizeEmail(dto.email);
    if (await this.users.findByEmail(email)) {
      throw new ConflictException(EMAIL_TAKEN);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    let user: User;
    try {
      user = await this.users.create({ email, passwordHash, name: dto.name });
    } catch (err) {
      // Lost a race with a concurrent register for the same email.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(EMAIL_TAKEN);
      }
      throw err;
    }
    return this.issueToken(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findByEmail(normalizeEmail(dto.email));
    const matches = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !matches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    return this.issueToken(user);
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return toPublicUser(user);
  }

  private async issueToken(user: User): Promise<AuthResponse> {
    const payload: Omit<AuthUser, 'id'> & { sub: string } = { sub: user.id, email: user.email };
    return {
      user: toPublicUser(user),
      accessToken: await this.jwt.signAsync(payload),
    };
  }
}

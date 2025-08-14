import { PrismaClient, User } from '@prisma/client';

export interface CreateUserData {
  email: string;
  name?: string;
  picture?: string;
  googleId: string;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  updateLastLogin(id: string): Promise<User>;
  createSession(userId: string, token: string, expiresAt: Date): Promise<UserSession>;
  findSessionByToken(token: string): Promise<UserSession | null>;
  deleteSession(token: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;
}

export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { googleId }
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id }
    });
  }

  async create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data: {
        ...data,
        lastLoginAt: new Date()
      }
    });
  }

  async updateLastLogin(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() }
    });
  }

  async createSession(userId: string, token: string, expiresAt: Date): Promise<UserSession> {
    return this.prisma.userSession.create({
      data: {
        userId,
        token,
        expiresAt
      }
    });
  }

  async findSessionByToken(token: string): Promise<UserSession | null> {
    return this.prisma.userSession.findUnique({
      where: { token },
      include: {
        user: true
      }
    }) as Promise<UserSession | null>;
  }

  async deleteSession(token: string): Promise<void> {
    await this.prisma.userSession.delete({
      where: { token }
    });
  }

  async deleteExpiredSessions(): Promise<void> {
    await this.prisma.userSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
  }
}

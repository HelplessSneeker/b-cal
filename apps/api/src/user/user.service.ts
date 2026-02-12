import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, User } from 'generated/prisma/client';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private prisma: PrismaService) {}

  async findOne(
    email: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User | null> {
    const client = tx ?? this.prisma;
    return client.user.findUnique({
      where: {
        email,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(
    data: {
      email: string;
      password: string;
      verificationToken: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const user = await client.user.create({
      data,
    });
    this.logger.log(`User created: ${user.id}`);
    return user;
  }

  async updateVerificationToken(id: string, verificationToken: string) {
    return this.prisma.user.update({
      where: { id },
      data: { verificationToken },
    });
  }

  async updateRefreshToken(
    id: string,
    refreshToken: string | null,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.user.update({
      where: { id },
      data: { refreshToken },
    });
  }

  async validateEmail(email: string, verificationToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.verificationToken !== verificationToken) {
      this.logger.error(`Email validation failed: invalid token for ${email}`);
      throw new BadRequestException('Invalid or expired token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: null,
        emailVerified: true,
      },
    });
  }

  async setPasswordResetToken(email: string, token: string) {
    await this.prisma.user.update({
      where: { email },
      data: {
        resetToken: token,
      },
    });
  }

  async changePassword(
    email: string,
    password: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const user = await this.findOne(email, tx);

    if (!user || !user.resetToken) {
      this.logger.error(
        `Password change failed: user not found or no reset token for ${email}`,
      );
      throw new BadRequestException('User not found');
    }

    await client.user.update({
      where: {
        id: user.id,
      },
      data: {
        password,
        resetToken: null,
      },
    });
  }

  async deleteUser(userId: string) {
    await this.prisma.user.delete({
      where: {
        id: userId,
      },
    });
  }
}

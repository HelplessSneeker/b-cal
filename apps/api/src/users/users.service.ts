import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from 'generated/prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
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

  async create(data: {
    email: string;
    password: string;
    verificationToken: string;
  }) {
    return this.prisma.user.create({
      data,
    });
  }

  async updateRefreshToken(id: string, refreshToken: string | null) {
    return this.prisma.user.update({
      where: { id },
      data: { refreshToken },
    });
  }

  async validateEmail(email: string, verificationToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.verificationToken !== verificationToken) {
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

  async changePassword(email: string, password: string) {
    const user = await this.findOne(email);

    if (!user || !user.resetToken) {
      throw new BadRequestException('User not found');
    }

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password,
        resetToken: null,
      },
    });
  }
}

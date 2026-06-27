import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getProfile(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const data: { fullName?: string; phoneNumber?: string | null } = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber === '' ? null : dto.phoneNumber;

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: id,
        action: 'UPDATE_PROFILE',
        module: 'users',
        targetId: id,
        description: `User ${updated.fullName} memperbarui profil sendiri`,
        metadata: { userId: id, fields: Object.keys(data) },
      },
    });

    const { passwordHash, ...result } = updated;
    return result;
  }

  async changeMyPassword(id: string, dto: ChangePasswordDto) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Password saat ini tidak sesuai');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Password baru harus berbeda dari password saat ini');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: id,
        action: 'CHANGE_PASSWORD',
        module: 'users',
        targetId: id,
        description: `User ${user.fullName} mengubah password sendiri`,
        metadata: {
          userId: id,
        },
      },
    });

    return { success: true };
  }
}

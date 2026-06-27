import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SystemRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { CacheService } from 'src/cache/cache.service';
import { InvitationsService } from 'src/invitations/invitations.service';
import { LicenseAccessService } from 'src/licenses/license-access.service';
import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { cacheKeys } from 'src/queue/queue.constants';
import { UsersService } from 'src/users/users.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TokenBlacklistService } from './token-blacklist.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly invitationsService: InvitationsService,
    private readonly licenseAccessService: LicenseAccessService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) { }

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const passwordConfirmation = dto.passwordConfirmation ?? dto.password_confirmation;
    if (passwordConfirmation && passwordConfirmation !== dto.password) {
      throw new BadRequestException('Konfirmasi password tidak cocok');
    }

    const fullName = dto.fullName ?? dto.full_name;
    if (!fullName) {
      throw new BadRequestException('Nama lengkap wajib diisi');
    }

    const phoneNumber = dto.phoneNumber ?? dto.phone_number;

    if (dto.inviteCode) {
      await this.invitationsService.assertInvitationCanBeAccepted(dto.inviteCode);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName,
        phoneNumber,
        role: SystemRole.MEMBER,
        status: UserStatus.ACTIVE,
      },
    });

    const authResponse = await this.buildAuthResponse(user);

    if (!dto.inviteCode) {
      return authResponse;
    }

    const acceptedInvitation = await this.invitationsService.acceptByCode(user.id, dto.inviteCode);
    return {
      ...authResponse,
      invitationAccepted: acceptedInvitation,
    };
  }

  async login(dto: LoginDto, ipAddress: string) {
    const rateKey = cacheKeys.loginAttempt(dto.email, ipAddress);
    const loginAttempts = await this.cacheService.get<number>(rateKey);
    if ((loginAttempts ?? 0) >= 5) {
      this.logger.warn(
        `Batas percobaan login tercapai untuk email=${dto.email} ip=${ipAddress}`,
      );
      throw new HttpException(
        'Terlalu banyak percobaan login. Silakan coba lagi nanti.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      this.logger.warn(`Login gagal: user tidak ditemukan untuk email=${dto.email} ip=${ipAddress}`);
      await this.cacheService.increment(rateKey, 15 * 60);
      throw new UnauthorizedException('Email tidak terdaftar');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      this.logger.warn(`Login gagal: password tidak cocok untuk email=${dto.email} ip=${ipAddress}`);
      await this.cacheService.increment(rateKey, 15 * 60);
      throw new UnauthorizedException('Password salah');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Akun Anda dinonaktifkan');
    }

    this.logger.log(`Login berhasil untuk email=${dto.email} ip=${ipAddress}`);
    await this.cacheService.del(rateKey);
    if (user.role === SystemRole.OWNER) {
      await this.licenseAccessService.ensureTrialLicense(user.id);
    }
    return this.buildAuthResponse(user);
  }

  async me(userId: string) {
    return this.usersService.getProfile(userId);
  }

  async refresh(token: string) {
    let payload: { sub: string; email: string; fullName: string };
    try {
      payload = this.jwtService.verify(token, { ignoreExpiration: true });
    } catch {
      throw new UnauthorizedException('Token tidak valid');
    }

    const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token sudah tidak dapat digunakan');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, fullName: true, phoneNumber: true, role: true, status: true, isSuperAdmin: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Akun tidak aktif atau tidak ditemukan');
    }

    return this.buildAuthResponse(user);
  }

  async logout(token: string) {
    const payload = this.jwtService.decode(token) as { exp?: number } | null;
    const expiresInSeconds = payload?.exp ? payload.exp - Math.floor(Date.now() / 1000) : 1;
    await this.tokenBlacklistService.blacklistToken(token, expiresInSeconds);

    return {
      success: true,
      message: 'Logout berhasil.',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      throw new NotFoundException('Email tidak terdaftar di aplikasi.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Akun terdaftar tetapi sedang tidak aktif.');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: hashedToken, passwordResetExpires: expires },
    });

    const frontendUrl =
      this.configService.get<string>('app.frontendUrl')
      || this.configService.get<string>('app.webUrl')
      || 'http://localhost:3002';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    try {
      await this.mailService.sendResetPasswordEmail({
        to: user.email,
        name: user.fullName,
        resetUrl,
        expiresMinutes: 60,
      });
    } catch {
      this.logger.error(`Gagal mengirim email reset ke ${user.email}`);
    }

    return { message: 'Link reset password akan dikirim ke email Anda.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const hashedToken = crypto.createHash('sha256').update(dto.token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() },
        status: UserStatus.ACTIVE,
      },
    });

    if (!user) {
      throw new BadRequestException('Link reset tidak valid atau sudah kedaluwarsa.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetToken: null, passwordResetExpires: null },
    });

    return { message: 'Password berhasil direset. Silakan login dengan password baru Anda.' };
  }

  private async buildAuthResponse(user: {
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string | null;
    role?: SystemRole;
    status?: UserStatus;
    isSuperAdmin?: boolean;
    passwordHash?: string;
  }) {
    const { passwordHash, ...safeUser } = user;
    const accessToken = await this.jwtService.signAsync({
      sub: safeUser.id,
      email: safeUser.email,
      fullName: safeUser.fullName,
    });

    return {
      accessToken,
      user: safeUser,
    };
  }
}

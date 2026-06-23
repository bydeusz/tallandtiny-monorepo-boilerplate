import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac, randomBytes, randomInt, randomUUID } from 'crypto';
import ms, { StringValue } from 'ms';
import {
  assertEmailDomainAllowed,
  comparePassword,
  generatePassword,
  hashPassword,
} from '../../common/utils';
import { PrismaService } from '../../prisma/prisma.service';
import { MAIL_JOB_SEND, QueueService } from '../queue';
import { UsersService } from '../users/users.service';
import { UserResponseDto } from '../users/dto';
import {
  AuthTokensResponseDto,
  LoginDto,
  MessageResponseDto,
  RegisterDto,
} from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

interface TokenUser {
  id: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly queueService: QueueService,
  ) {}

  async generateTokens(user: TokenUser): Promise<AuthTokensResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };
    const refreshToken = await this.createAndStoreRefreshToken(user.id);

    return {
      access_token: await this.jwtService.signAsync(payload),
      refresh_token: refreshToken,
    };
  }

  async validateToken(token: string): Promise<JwtPayload> {
    const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    const user = await this.usersService.findByEmail(payload.email);

    if (!user || user.id !== payload.sub) {
      throw new UnauthorizedException('Invalid token subject.');
    }

    return payload;
  }

  async login(loginDto: LoginDto): Promise<AuthTokensResponseDto> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await comparePassword(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.isActive) {
      throw new ForbiddenException(
        'Account is not activated. Please check your email.',
      );
    }

    if (user.mustChangePassword) {
      throw new ForbiddenException('PasswordResetRequired');
    }

    return this.generateTokens(user);
  }

  async register(registerDto: RegisterDto): Promise<MessageResponseDto> {
    this.validateEmailDomain(registerDto.email);

    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    const hashedPassword = await hashPassword(registerDto.password);

    const user = await this.prisma.user.create({
      data: {
        name: registerDto.name,
        surname: registerDto.surname,
        email: registerDto.email,
        password: hashedPassword,
        isActive: false,
      },
    });

    const activationCode = await this.createActivationCode(user.id);
    await this.sendActivationCodeEmail(
      user.email,
      `${user.name} ${user.surname}`.trim(),
      activationCode.code,
    );

    return {
      message:
        'Registration successful. Check your email for an activation code.',
    };
  }

  async activate(email: string, code: string): Promise<AuthTokensResponseDto> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid activation code.');
    }

    if (user.isActive) {
      throw new BadRequestException('Account is already activated.');
    }

    const now = new Date();
    const activationCode = await this.prisma.activationCode.findFirst({
      where: {
        userId: user.id,
        code,
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!activationCode) {
      throw new BadRequestException('Invalid or expired activation code.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { isActive: true },
      }),
      this.prisma.activationCode.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    await this.sendWelcomeEmail(
      user.email,
      `${user.name} ${user.surname}`.trim(),
    );

    return this.generateTokens(user);
  }

  async resendActivationCode(email: string): Promise<MessageResponseDto> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found.');
    }

    if (user.isActive) {
      throw new BadRequestException('Account is already activated.');
    }

    await this.prisma.activationCode.deleteMany({
      where: { userId: user.id },
    });

    const activationCode = await this.createActivationCode(user.id);
    await this.sendActivationCodeEmail(
      user.email,
      `${user.name} ${user.surname}`.trim(),
      activationCode.code,
    );

    return { message: 'A new activation code has been sent to your email.' };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokensResponseDto> {
    const refreshTokenRecord =
      await this.getValidRefreshTokenRecord(refreshToken);

    await this.prisma.refreshToken.update({
      where: { id: refreshTokenRecord.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens({
      id: refreshTokenRecord.user.id,
      email: refreshTokenRecord.user.email,
    });
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const refreshTokenRecord =
      await this.getValidRefreshTokenRecord(refreshToken);

    await this.prisma.refreshToken.update({
      where: { id: refreshTokenRecord.id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthTokensResponseDto> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const isCurrentPasswordValid = await comparePassword(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    const hashedPassword = await hashPassword(newPassword);
    await this.usersService.updatePassword(userId, hashedPassword, false);
    await this.revokeAllUserTokens(userId);
    await this.sendPasswordChangedEmail(
      user.email,
      `${user.name} ${user.surname}`.trim(),
    );

    return this.generateTokens(user);
  }

  async requestNewPassword(email: string): Promise<MessageResponseDto> {
    const message = {
      message:
        'If an account exists for this email, a new password has been sent.',
    };

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return message;
    }

    const temporaryPassword = generatePassword(16);
    const hashedPassword = await hashPassword(temporaryPassword);
    const temporaryPasswordExpiresAt = this.buildTemporaryPasswordExpiryDate();
    const resetUrl = this.buildResetPasswordUrl(user.email);

    await this.usersService.updatePassword(
      user.id,
      hashedPassword,
      true,
      temporaryPasswordExpiresAt,
    );
    await this.revokeAllUserTokens(user.id);
    await this.sendResetPasswordEmail(
      user.email,
      `${user.name} ${user.surname}`.trim(),
      temporaryPassword,
      resetUrl,
    );

    return message;
  }

  async resetPassword(
    email: string,
    temporaryPassword: string,
    newPassword: string,
  ): Promise<MessageResponseDto> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.mustChangePassword) {
      throw new BadRequestException('Invalid temporary password.');
    }

    if (
      !user.temporaryPasswordExpiresAt ||
      user.temporaryPasswordExpiresAt <= new Date()
    ) {
      throw new BadRequestException('Temporary password has expired.');
    }

    const isTemporaryPasswordValid = await comparePassword(
      temporaryPassword,
      user.password,
    );
    if (!isTemporaryPasswordValid) {
      throw new BadRequestException('Invalid temporary password.');
    }

    const hashedPassword = await hashPassword(newPassword);
    await this.usersService.updatePassword(
      user.id,
      hashedPassword,
      false,
      null,
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isActive: true },
    });
    await this.revokeAllUserTokens(user.id);
    await this.sendPasswordChangedEmail(
      user.email,
      `${user.name} ${user.surname}`.trim(),
    );

    return { message: 'Password has been reset successfully.' };
  }

  getCurrentUser(userId: string): Promise<UserResponseDto> {
    return this.usersService.findOne(userId);
  }

  async requestEmailChange(
    userId: string,
    newEmailRaw: string,
  ): Promise<MessageResponseDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const newEmail = newEmailRaw.trim().toLowerCase();

    if (newEmail === user.email.toLowerCase()) {
      throw new BadRequestException(
        'New email is the same as the current email.',
      );
    }

    this.validateEmailDomain(newEmail);

    const existing = await this.usersService.findByEmail(newEmail);
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    await this.prisma.emailChangeRequest.deleteMany({
      where: { userId: user.id },
    });

    const token = randomBytes(32).toString('hex');
    const expiresAt = this.buildEmailChangeExpiryDate();

    await this.prisma.emailChangeRequest.create({
      data: {
        userId: user.id,
        token,
        newEmail,
        expiresAt,
      },
    });

    const confirmUrl = this.buildEmailChangeConfirmUrl(token);
    const fullName = `${user.name} ${user.surname}`.trim();

    await this.sendEmailChangeConfirmationEmail(newEmail, fullName, confirmUrl);
    await this.sendEmailChangeNoticeEmail(user.email, fullName, newEmail);

    return {
      message:
        'Confirmation email sent. Check your new inbox to complete the change.',
    };
  }

  async confirmEmailChange(token: string): Promise<MessageResponseDto> {
    const request = await this.prisma.emailChangeRequest.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!request) {
      throw new BadRequestException('Invalid or expired confirmation token.');
    }

    if (request.expiresAt <= new Date()) {
      await this.prisma.emailChangeRequest.delete({
        where: { id: request.id },
      });
      throw new BadRequestException('Invalid or expired confirmation token.');
    }

    const inUse = await this.usersService.findByEmail(request.newEmail);
    if (inUse && inUse.id !== request.userId) {
      await this.prisma.emailChangeRequest.delete({
        where: { id: request.id },
      });
      throw new ConflictException('A user with this email already exists.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: request.userId },
        data: { email: request.newEmail },
      }),
      this.prisma.emailChangeRequest.deleteMany({
        where: { userId: request.userId },
      }),
    ]);

    await this.revokeAllUserTokens(request.userId);

    return { message: 'Email address has been updated. Please sign in again.' };
  }

  private validateEmailDomain(email: string): void {
    const allowedDomains =
      this.configService.get<string[]>('auth.allowedEmailDomains') ?? [];
    assertEmailDomainAllowed(email, allowedDomains);
  }

  private buildRefreshTokenExpiryDate(): Date {
    const expiration = this.configService.getOrThrow<string>(
      'jwt.refreshExpiration',
    );
    const ttl = ms(expiration as StringValue);

    if (typeof ttl !== 'number') {
      throw new InternalServerErrorException(
        'Invalid refresh token expiration.',
      );
    }

    return new Date(Date.now() + ttl);
  }

  private buildActivationCodeExpiryDate(): Date {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  private buildTemporaryPasswordExpiryDate(): Date {
    return new Date(Date.now() + 30 * 60 * 1000);
  }

  private buildEmailChangeExpiryDate(): Date {
    return new Date(Date.now() + 60 * 60 * 1000);
  }

  private buildEmailChangeConfirmUrl(token: string): string {
    const frontendUrl = this.configService.get<string>(
      'auth.frontendUrl',
      'http://localhost:3000',
    );
    const url = new URL('/email-change/confirm', frontendUrl);
    url.searchParams.set('token', token);
    return url.toString();
  }

  private async sendEmailChangeConfirmationEmail(
    email: string,
    name: string,
    confirmUrl: string,
  ): Promise<void> {
    await this.queueService.addMailJob(MAIL_JOB_SEND, {
      to: email,
      subject: 'Confirm your new email address',
      template: 'email-change-confirmation',
      context: {
        name,
        confirmUrl,
      },
    });
  }

  private async sendEmailChangeNoticeEmail(
    email: string,
    name: string,
    newEmail: string,
  ): Promise<void> {
    await this.queueService.addMailJob(MAIL_JOB_SEND, {
      to: email,
      subject: 'Email change requested',
      template: 'email-change-notice',
      context: {
        name,
        newEmail,
      },
    });
  }

  private generateActivationCode(): string {
    return randomInt(100000, 1_000_000).toString();
  }

  private async createActivationCode(userId: string) {
    return this.prisma.activationCode.create({
      data: {
        userId,
        code: this.generateActivationCode(),
        expiresAt: this.buildActivationCodeExpiryDate(),
      },
    });
  }

  private async sendActivationCodeEmail(
    email: string,
    name: string,
    code: string,
  ): Promise<void> {
    const activationUrl = this.buildActivationUrl(email, code);

    await this.queueService.addMailJob(MAIL_JOB_SEND, {
      to: email,
      subject: 'Activate your account',
      template: 'activation-code',
      context: {
        name,
        code,
        activationUrl,
      },
    });
  }

  private buildActivationUrl(email: string, _code: string): string {
    const frontendUrl = this.configService.get<string>(
      'auth.frontendUrl',
      'http://localhost:3000',
    );
    const url = new URL('/verify', frontendUrl);
    url.searchParams.set('email', email);
    return url.toString();
  }

  private buildResetPasswordUrl(email: string): string {
    const frontendUrl = this.configService.get<string>(
      'auth.frontendUrl',
      'http://localhost:3000',
    );
    const url = new URL('/reset-password/confirm', frontendUrl);
    url.searchParams.set('email', email);
    return url.toString();
  }

  private async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await this.queueService.addMailJob(MAIL_JOB_SEND, {
      to: email,
      subject: 'Welcome to the platform',
      template: 'welcome',
      context: {
        name,
      },
    });
  }

  private async sendPasswordChangedEmail(
    email: string,
    name: string,
  ): Promise<void> {
    await this.queueService.addMailJob(MAIL_JOB_SEND, {
      to: email,
      subject: 'Your password was changed',
      template: 'password-changed',
      context: {
        name,
      },
    });
  }

  private async sendResetPasswordEmail(
    email: string,
    name: string,
    temporaryPassword: string,
    resetUrl: string,
  ): Promise<void> {
    await this.queueService.addMailJob(MAIL_JOB_SEND, {
      to: email,
      subject: 'Your temporary password',
      template: 'reset-password',
      context: {
        name,
        temporaryPassword,
        resetUrl,
      },
    });
  }

  private parseRefreshToken(refreshToken: string): {
    tokenId: string;
    tokenSecret: string;
    signature: string;
  } {
    const [tokenId, tokenSecret, signature] = refreshToken.split('.');

    if (!tokenId || !tokenSecret || !signature) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    return { tokenId, tokenSecret, signature };
  }

  private async createAndStoreRefreshToken(userId: string): Promise<string> {
    const tokenId = randomUUID();
    const tokenSecret = randomBytes(32).toString('hex');
    const hashedTokenSecret = await hashPassword(tokenSecret);

    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        token: hashedTokenSecret,
        userId,
        expiresAt: this.buildRefreshTokenExpiryDate(),
      },
    });

    const signature = this.signRefreshTokenValue(tokenId, tokenSecret);
    return `${tokenId}.${tokenSecret}.${signature}`;
  }

  private async getValidRefreshTokenRecord(refreshToken: string) {
    const { tokenId, tokenSecret, signature } =
      this.parseRefreshToken(refreshToken);
    const expectedSignature = this.signRefreshTokenValue(tokenId, tokenSecret);
    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const refreshTokenRecord = await this.prisma.refreshToken.findUnique({
      where: { id: tokenId },
      include: {
        user: true,
      },
    });

    if (!refreshTokenRecord) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (refreshTokenRecord.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked.');
    }

    if (refreshTokenRecord.expiresAt <= new Date()) {
      await this.prisma.refreshToken.update({
        where: { id: refreshTokenRecord.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token has expired.');
    }

    const isRefreshTokenValid = await comparePassword(
      tokenSecret,
      refreshTokenRecord.token,
    );
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    return refreshTokenRecord;
  }

  private signRefreshTokenValue(tokenId: string, tokenSecret: string): string {
    const refreshSecret =
      this.configService.getOrThrow<string>('jwt.refreshSecret');

    return createHmac('sha256', refreshSecret)
      .update(`${tokenId}.${tokenSecret}`)
      .digest('hex');
  }
}

import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public } from '../../common/decorators';
import {
  ActivateDto,
  AuthTokensResponseDto,
  ChangePasswordDto,
  ConfirmEmailChangeDto,
  LoginDto,
  MessageResponseDto,
  RefreshTokenDto,
  ResetPasswordDto,
  RegisterDto,
  RequestEmailChangeDto,
  RequestNewPasswordDto,
  ResendActivationDto,
} from './dto';
import { UserResponseDto } from '../users/dto';
import { AuthService } from './auth.service';

@Controller('auth')
@ApiTags('Auth')
@ApiBearerAuth()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ operationId: 'AuthLogin' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto): Promise<AuthTokensResponseDto> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ operationId: 'AuthRegister' })
  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<MessageResponseDto> {
    const registrationEnabled = this.configService.get<boolean>(
      'auth.registrationEnabled',
    );

    if (!registrationEnabled) {
      throw new ForbiddenException('Registration is currently disabled.');
    }

    return this.authService.register(registerDto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ operationId: 'AuthActivate' })
  @Post('activate')
  @HttpCode(HttpStatus.OK)
  activate(@Body() activateDto: ActivateDto): Promise<AuthTokensResponseDto> {
    return this.authService.activate(activateDto.email, activateDto.code);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ operationId: 'AuthResendActivation' })
  @Post('resend-activation')
  @HttpCode(HttpStatus.OK)
  resendActivationCode(
    @Body() resendActivationDto: ResendActivationDto,
  ): Promise<MessageResponseDto> {
    return this.authService.resendActivationCode(resendActivationDto.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ operationId: 'AuthRequestNewPassword' })
  @Post('request-new-password')
  @HttpCode(HttpStatus.OK)
  requestNewPassword(
    @Body() requestNewPasswordDto: RequestNewPasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.requestNewPassword(requestNewPasswordDto.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ operationId: 'AuthResetPassword' })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<MessageResponseDto> {
    return this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.temporaryPassword,
      resetPasswordDto.newPassword,
    );
  }

  @Public()
  @ApiOperation({ operationId: 'AuthRefresh' })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthTokensResponseDto> {
    return this.authService.refreshTokens(refreshTokenDto.refresh_token);
  }

  @ApiOperation({ operationId: 'AuthLogout' })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<MessageResponseDto> {
    await this.authService.revokeRefreshToken(refreshTokenDto.refresh_token);
    return { message: 'Logged out.' };
  }

  @ApiOperation({ operationId: 'AuthChangePassword' })
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser('sub') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<AuthTokensResponseDto> {
    return this.authService.changePassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @ApiOperation({ operationId: 'AuthGetCurrentUser' })
  @Get('me')
  @HttpCode(HttpStatus.OK)
  me(@CurrentUser('sub') userId: string): Promise<UserResponseDto> {
    return this.authService.getCurrentUser(userId);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ operationId: 'AuthRequestEmailChange' })
  @Post('request-email-change')
  @HttpCode(HttpStatus.OK)
  requestEmailChange(
    @CurrentUser('sub') userId: string,
    @Body() dto: RequestEmailChangeDto,
  ): Promise<MessageResponseDto> {
    return this.authService.requestEmailChange(userId, dto.newEmail);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ operationId: 'AuthConfirmEmailChange' })
  @Post('confirm-email-change')
  @HttpCode(HttpStatus.OK)
  confirmEmailChange(
    @Body() dto: ConfirmEmailChangeDto,
  ): Promise<MessageResponseDto> {
    return this.authService.confirmEmailChange(dto.token);
  }
}

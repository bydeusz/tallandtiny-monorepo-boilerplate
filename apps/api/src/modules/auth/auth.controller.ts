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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public } from '../../common/decorators';
import { MessageResponseDto } from '../../common/dto';
import {
  ActivateDto,
  AuthTokensResponseDto,
  ChangePasswordDto,
  ConfirmEmailChangeDto,
  LoginDto,
  RefreshTokenDto,
  ResetPasswordDto,
  RegisterDto,
  RequestEmailChangeDto,
  RequestNewPasswordDto,
  ResendActivationDto,
} from './dto';
import { CurrentUserResponseDto } from '../users/dto/current-user-response.dto';
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
  @ApiOkResponse({ type: AuthTokensResponseDto })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto): Promise<AuthTokensResponseDto> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ operationId: 'AuthRegister' })
  @ApiCreatedResponse({ type: MessageResponseDto })
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
  @ApiOkResponse({ type: AuthTokensResponseDto })
  @Post('activate')
  @HttpCode(HttpStatus.OK)
  activate(@Body() activateDto: ActivateDto): Promise<AuthTokensResponseDto> {
    return this.authService.activate(activateDto.email, activateDto.code);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ operationId: 'AuthResendActivation' })
  @ApiOkResponse({ type: MessageResponseDto })
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
  @ApiOkResponse({ type: MessageResponseDto })
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
  @ApiOkResponse({ type: MessageResponseDto })
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
  @ApiOkResponse({ type: AuthTokensResponseDto })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthTokensResponseDto> {
    return this.authService.refreshTokens(refreshTokenDto.refresh_token);
  }

  @ApiOperation({ operationId: 'AuthLogout' })
  @ApiOkResponse({ type: MessageResponseDto })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<MessageResponseDto> {
    await this.authService.revokeRefreshToken(refreshTokenDto.refresh_token);
    return { message: 'Logged out.' };
  }

  @ApiOperation({ operationId: 'AuthChangePassword' })
  @ApiOkResponse({ type: AuthTokensResponseDto })
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
  @ApiOkResponse({ type: CurrentUserResponseDto })
  @Get('me')
  @HttpCode(HttpStatus.OK)
  me(@CurrentUser('sub') userId: string): Promise<CurrentUserResponseDto> {
    return this.authService.getCurrentUser(userId);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ operationId: 'AuthRequestEmailChange' })
  @ApiOkResponse({ type: MessageResponseDto })
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
  @ApiOkResponse({ type: MessageResponseDto })
  @Post('confirm-email-change')
  @HttpCode(HttpStatus.OK)
  confirmEmailChange(
    @Body() dto: ConfirmEmailChangeDto,
  ): Promise<MessageResponseDto> {
    return this.authService.confirmEmailChange(dto.token);
  }
}

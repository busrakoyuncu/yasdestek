import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  changePasswordSchema,
  loginSchema,
  type ChangePasswordInput,
  type LoginInput,
} from '@yasdestek/shared';
import type { CookieOptions, Response } from 'express';
import { CurrentUser } from '../common/current-user';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SESSION_COOKIE, SESSION_TTL_MS } from './auth.constants';
import {
  AllowPasswordChangePending,
  Public,
  SessionId,
} from './auth.decorators';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private readonly cookieOptions: CookieOptions;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    this.cookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.get('NODE_ENV') === 'production',
      path: '/',
    };
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CurrentUser> {
    const { sessionId, user } = await this.auth.login(body);
    res.cookie(SESSION_COOKIE, sessionId, {
      ...this.cookieOptions,
      maxAge: SESSION_TTL_MS,
    });
    return user;
  }

  @AllowPasswordChangePending()
  @Post('logout')
  @HttpCode(204)
  async logout(
    @SessionId() sessionId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(sessionId);
    res.clearCookie(SESSION_COOKIE, this.cookieOptions);
  }

  @AllowPasswordChangePending()
  @Post('change-password')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: CurrentUser,
    @SessionId() sessionId: string,
    @Body(new ZodValidationPipe(changePasswordSchema))
    body: ChangePasswordInput,
  ): Promise<void> {
    await this.auth.changePassword(user.id, sessionId, body);
  }

  @AllowPasswordChangePending()
  @Get('me')
  me(@CurrentUser() user: CurrentUser): CurrentUser {
    return user;
  }
}

import type { Response } from 'express';
import { Controller, Post, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthServiceController, AuthServiceControllerMethods, CurrentUser } from '@app/common';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { type User } from '../generated/prisma/client';

@Controller('auth')
@AuthServiceControllerMethods()
export class AuthController implements AuthServiceController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('/signin')
  async signIn(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) response: Response
  ) {
    await this.authService.signIn(user, response);
    response.send({ message: 'Signed in successfully' });
  }

  @UseGuards(JwtAuthGuard)
  async authenticate(data: any) {
    return {
      ...data.user,
      id: data.user.id
    }
  }
}

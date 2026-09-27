import { Controller, Post, Body } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AuthService } from './auth.service'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Scan บัตรพนักงานและ login' })
  login(@Body() body: { cardId: string; password: string }) {
    return this.authService.loginWithCard(body.cardId, body.password)
  }
}

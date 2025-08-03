import { Controller, Get, Post, Body } from '@nestjs/common'
import { AuthService } from './auth.service'
import { VerifyRequestDto } from 'src/api/auth/dto/verify-request.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Get('message')
  getMessage() {
    return this.authService.generateMessage()
  }

  @Post('verify')
  verifySignature(@Body() body: VerifyRequestDto) {
    return this.authService.verifySignature(body.message, body.signature, body.address)
  }
}

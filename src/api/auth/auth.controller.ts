import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { VerifyRequestDto } from 'src/api/auth/dto/verify-request.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {
    console.log('AuthController constructor called');
    console.log('authService:', this.authService);
  }
  @Get('message')
  getMessage() {
    console.log('getMessage called, authService:', this.authService);
    return this.authService.generateMessage();
  }

  @Post('verify')
  verifySignature(@Body() body: VerifyRequestDto) {
    return this.authService.verifySignature(
      body.message,
      body.signature,
      body.address,
    );
  }
}

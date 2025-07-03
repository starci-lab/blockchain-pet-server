import { registerAs } from '@nestjs/config';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthConfig } from './auth-config.type';
import validateConfig from 'src/utils/validate-config';

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  AUTH_ACCESS_SECRET: string;

  @IsString()
  @IsNotEmpty()
  AUTH_ACCESS_TOKEN_EXPIRES_IN: string;

  @IsString()
  @IsNotEmpty()
  AUTH_REFRESH_SECRET: string;

  @IsString()
  @IsNotEmpty()
  AUTH_REFRESH_TOKEN_EXPIRES_IN: string;
}

export default registerAs<AuthConfig>('auth', () => {
  console.info(`Register AuthConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    accessSecret: process.env.AUTH_ACCESS_SECRET!,
    accessExpires: process.env.AUTH_ACCESS_TOKEN_EXPIRES_IN!,
    refreshSecret: process.env.AUTH_REFRESH_SECRET!,
    refreshExpires: process.env.AUTH_REFRESH_TOKEN_EXPIRES_IN!,
  };
});

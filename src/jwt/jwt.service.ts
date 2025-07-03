import { Inject, Injectable, Logger } from '@nestjs/common'
import { JwtService as NestJwtService } from '@nestjs/jwt'
import { MODULE_OPTIONS_TOKEN } from 'src/jwt/jwt.module-definition'
import { JwtOptions } from 'src/jwt/jwt.types'

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name)
  constructor(
    private readonly jwtService: NestJwtService,
    @Inject(MODULE_OPTIONS_TOKEN) private readonly options: JwtOptions
  ) {}

  public async generateAuthCredentials(payload: { userId: string }) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.options.accessSecret,
        expiresIn: this.options.accessExpiresIn
      }),
      this.jwtService.signAsync(payload, {
        secret: this.options.refreshSecret,
        expiresIn: this.options.refreshExpiresIn
      })
    ])
    return {
      accessToken,
      refreshToken
    }
  }

  public async verifyToken(token: string) {
    try {
      return await this.jwtService.verifyAsync(token)
    } catch (ex) {
      this.logger.error(ex)
      return null
    }
  }

  public async decodeToken(token: string) {
    try {
      return await this.jwtService.decode(token)
    } catch (ex) {
      this.logger.error(ex)
      return null
    }
  }
}

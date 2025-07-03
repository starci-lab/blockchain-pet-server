export type JwtOptions = {
  accessSecret: string
  refreshSecret: string
  accessExpiresIn: string | number
  refreshExpiresIn: string | number
}

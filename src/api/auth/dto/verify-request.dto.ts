import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class VerifyRequestDto {
  @ApiProperty({
    example: '',
    description: 'message',
  })
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    example: '',
    description: 'signature',
  })
  @IsNotEmpty()
  signature: string;

  @ApiProperty({
    example: '',
    description: 'address',
  })
  @IsNotEmpty()
  address: string;
}

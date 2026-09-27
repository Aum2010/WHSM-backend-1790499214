import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class ConfirmSoDto {
  @ApiProperty({ example: 'user-id-here' })
  @IsString()
  confirmedBy: string
}
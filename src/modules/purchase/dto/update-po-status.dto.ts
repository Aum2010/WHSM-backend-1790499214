import { ApiProperty } from '@nestjs/swagger'
import { IsEnum } from 'class-validator'
import { PoStatus } from '@prisma/client'

export class UpdatePoStatusDto {
  @ApiProperty({ enum: PoStatus })
  @IsEnum(PoStatus)
  status: PoStatus
}
import { ApiProperty } from '@nestjs/swagger'
import { IsEnum } from 'class-validator'
import { SoStatus } from '@prisma/client'

export class UpdateSoStatusDto {
  @ApiProperty({ enum: SoStatus })
  @IsEnum(SoStatus)
  status: SoStatus
}
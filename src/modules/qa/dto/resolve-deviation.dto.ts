import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class ResolveDeviationDto {
  @ApiProperty({ example: 'user-id-here' })
  @IsString()
  resolvedBy: string

  @ApiProperty({ example: 'ตรวจสอบแล้วไม่พบปัญหา อนุมัติปล่อย' })
  @IsString()
  resolution: string
}
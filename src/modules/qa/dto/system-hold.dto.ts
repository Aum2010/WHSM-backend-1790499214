import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class SystemHoldDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  hold: boolean

  @ApiPropertyOptional({ example: 'พบปัญหาสายการผลิต' })
  @IsOptional()
  @IsString()
  reason?: string

  @ApiPropertyOptional({ example: 'user-id-here' })
  @IsOptional()
  @IsString()
  activatedBy?: string
}
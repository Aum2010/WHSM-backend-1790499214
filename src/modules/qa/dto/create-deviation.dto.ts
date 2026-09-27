import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class CreateDeviationDto {
  @ApiProperty({ example: 'RM-20260927-0001' })
  @IsString()
  rmNo: string

  @ApiProperty({ example: 'พบสิ่งแปลกปลอมในสินค้า' })
  @IsString()
  description: string

  @ApiProperty({ example: 'user-id-here' })
  @IsString()
  reportedBy: string
}
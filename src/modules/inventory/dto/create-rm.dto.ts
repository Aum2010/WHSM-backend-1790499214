import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateRmDto {
  @ApiProperty({ example: 'RM-PORK-01' })
  @IsString()
  materialCode: string

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)   // ← สำคัญมาก
  quantity: number

  @ApiProperty({ example: 'kg' })
  @IsString()
  unit: string

  @ApiProperty({ example: 'WHC' })
  @IsString()
  location: string

  @ApiProperty({ example: 'user-id-here' })
  @IsString()
  performedBy: string
}
import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class ReturnWhrmDto {
  @ApiProperty({ example: 'RM-20260927-0001' })
  @IsString()
  rmNo: string

  @ApiProperty({ example: 20 })
  @IsNumber() @Min(0.001) @Type(() => Number)
  quantity: number

  @ApiProperty({ example: 'kg' })
  @IsString()
  unit: string

  @ApiProperty({ example: 'user-id' })
  @IsString()
  performedBy: string
}
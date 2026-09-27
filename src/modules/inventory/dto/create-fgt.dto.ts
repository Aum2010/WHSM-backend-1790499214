import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateFgtDto {
  @ApiProperty({ example: 'RM-20260927-0001' })
  @IsString()
  rmNo: string

  @ApiProperty({ example: 100 })
  @IsNumber() @Min(0.001) @Type(() => Number)
  quantity: number

  @ApiProperty({ example: 'kg' })
  @IsString()
  unit: string

  @ApiProperty({ example: 'Zone-RM-01' })
  @IsString()
  fromLocation: string

  @ApiProperty({ example: 'Zone-FG-01' })
  @IsString()
  toLocation: string

  @ApiProperty({ example: 'user-id' })
  @IsString()
  performedBy: string
}
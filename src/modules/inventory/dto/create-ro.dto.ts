import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsNumber, IsOptional, Min, IsNotEmpty } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateRoDto {
  @ApiProperty({ example: 'RM-PORK-01' })
  @IsString() @IsNotEmpty()
  materialCode: string

  @ApiProperty({ example: 'เนื้อหมู' })
  @IsString() @IsNotEmpty()
  materialName: string

  @ApiProperty({ example: 500 })
  @IsNumber() @Min(0.001) @Type(() => Number)
  quantity: number

  @ApiProperty({ example: 'kg' })
  @IsString()
  unit: string

  @ApiProperty({ example: 'Zone-RM-01' })
  @IsString()
  location: string

  @ApiProperty({ example: 'user-id' })
  @IsString()
  receivedBy: string

  @ApiPropertyOptional({ example: 'PO-2026-0001' })
  @IsOptional() @IsString()
  poNo?: string

  @ApiPropertyOptional({ example: 'SUP-001' })
  @IsOptional() @IsString()
  supplierCode?: string

  @ApiPropertyOptional({ example: '2026-10-30' })
  @IsOptional() @IsString()
  expiryDate?: string
}
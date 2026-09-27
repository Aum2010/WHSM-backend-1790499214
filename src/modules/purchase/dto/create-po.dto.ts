import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsArray, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class PoItemDto {
  @ApiProperty({ example: 'RM-PORK-01' })
  @IsString()
  materialCode: string

  @ApiProperty({ example: 'เนื้อหมู' })
  @IsString()
  materialName: string

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0.001)
  @Type(() => Number)
  quantity: number

  @ApiProperty({ example: 'kg' })
  @IsString()
  unit: string
}

export class CreatePoDto {
  @ApiProperty({ example: 'SUP-001' })
  @IsString()
  supplierCode: string

  @ApiProperty({ example: 'บริษัท ABC จำกัด' })
  @IsString()
  supplierName: string

  @ApiProperty({ example: 'user-id-here' })
  @IsString()
  createdBy: string

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsString()
  expectedDate?: string

  @ApiPropertyOptional({ example: 'หมายเหตุ' })
  @IsOptional()
  @IsString()
  note?: string

  @ApiProperty({ type: [PoItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PoItemDto)
  items: PoItemDto[]
}
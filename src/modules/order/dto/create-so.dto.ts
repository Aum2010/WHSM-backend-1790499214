import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsArray, IsNumber, IsOptional, IsEnum, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { OrderType } from '@prisma/client'

export class SoItemDto {
  @ApiProperty({ example: 'RM-PORK-01' })
  @IsString()
  materialCode: string

  @ApiProperty({ example: 'เนื้อหมู' })
  @IsString()
  materialName: string

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0.001)
  @Type(() => Number)
  quantity: number

  @ApiProperty({ example: 'kg' })
  @IsString()
  unit: string

  @ApiPropertyOptional({ example: '01092026/001' })
  @IsOptional()
  @IsString()
  lotNo?: string
}

export class CreateSoDto {
  @ApiProperty({ enum: OrderType, example: 'GENERAL' })
  @IsEnum(OrderType)
  orderType: OrderType

  @ApiProperty({ example: 'CUST-001' })
  @IsString()
  createdBy: string

  @ApiPropertyOptional({ example: 'ABC Market' })
  @IsOptional()
  @IsString()
  customerId?: string

  @ApiPropertyOptional({ example: 'หมายเหตุ' })
  @IsOptional()
  @IsString()
  note?: string

  @ApiProperty({ type: [SoItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SoItemDto)
  items: SoItemDto[]
}
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsNumber, IsArray, IsOptional, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class RecipeItemDto {
  @ApiProperty({ example: 'RM-PORK-01' })
  @IsString()
  materialCode: string

  @ApiProperty({ example: 'เนื้อหมู' })
  @IsString()
  materialName: string

  @ApiProperty({ example: 300 })
  @IsNumber()
  @Min(0.001)
  @Type(() => Number)
  quantity: number

  @ApiProperty({ example: 'kg' })
  @IsString()
  unit: string

  @ApiPropertyOptional({ example: 'ส่วนประกอบหลัก' })
  @IsOptional()
  @IsString()
  note?: string
}

export class CreateRecipeDto {
  @ApiProperty({ example: 'PROD-001' })
  @IsString()
  productCode: string

  @ApiProperty({ example: 'หมูปิ้งนมสด' })
  @IsString()
  productName: string

  @ApiPropertyOptional({ example: 'สูตรหมูปิ้งนมสด มาตรฐาน' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ example: 400 })
  @IsNumber()
  @Min(0.001)
  @Type(() => Number)
  yieldQty: number

  @ApiProperty({ example: 'kg' })
  @IsString()
  yieldUnit: string

  @ApiProperty({ type: [RecipeItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items: RecipeItemDto[]
}
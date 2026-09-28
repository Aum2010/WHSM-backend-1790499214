import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
 
class IngredientWeightDto {
  @ApiProperty() @IsString() rmNo: string
  @ApiProperty() @IsNumber() actualQty: number
}
 
export class RecordStageDto {
  @ApiProperty() @IsNumber() goodQty: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() wasteQty?: number
  @ApiProperty() @IsString() unit: string
  @ApiPropertyOptional() @IsOptional() @IsString() blastMode?: 'BLAST' | 'NON_BLAST'
  @ApiPropertyOptional() @IsOptional() @IsString() startTime?: string
  @ApiPropertyOptional() @IsOptional() @IsString() endTime?: string
  @ApiProperty() @IsString() performedBy: string
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string
 
  @ApiPropertyOptional({ type: [IngredientWeightDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientWeightDto)
  ingredientWeights?: IngredientWeightDto[]
}
 
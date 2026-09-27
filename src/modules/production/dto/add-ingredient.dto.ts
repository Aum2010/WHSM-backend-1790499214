import { IsString, IsNumber, IsPositive, IsOptional } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AddIngredientDto {
  @ApiProperty() @IsString() rmNo: string
  @ApiProperty() @IsNumber() @IsPositive() plannedQty: number
  @ApiProperty() @IsNumber() @IsPositive() actualQty: number
  @ApiProperty() @IsString() unit: string
  @ApiProperty() @IsString() performedBy: string
}
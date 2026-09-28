import { IsString, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateBatchDto {
  @ApiProperty() @IsString() productCode: string
  @ApiProperty() @IsString() productName: string
  @ApiProperty() @IsString() recipeId: string
  @ApiProperty() @IsString() startedBy: string
}
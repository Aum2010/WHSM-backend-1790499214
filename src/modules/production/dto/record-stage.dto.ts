import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class RecordStageDto {
  @ApiProperty() @IsNumber() goodQty: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() wasteQty?: number
  @ApiProperty() @IsString() unit: string
  @ApiPropertyOptional() @IsOptional() @IsString() blastMode?: 'BLAST' | 'NON_BLAST'
  @ApiPropertyOptional() @IsOptional() @IsString() startTime?: string
  @ApiPropertyOptional() @IsOptional() @IsString() endTime?: string
  @ApiProperty() @IsString() performedBy: string
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string
}
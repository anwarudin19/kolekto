import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class AskAssistDto {
  @ApiProperty({ example: 'f0d1b734-3df1-4a2f-85f1-940a71d8d5a1' })
  @IsUUID('4')
  teamId!: string;

  @ApiProperty({ example: 'Ringkasan bulan ini' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;
}

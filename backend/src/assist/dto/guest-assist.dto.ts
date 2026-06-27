import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class GuestAssistDto {
  @ApiProperty({ example: 'Apa itu Kolekto?' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;
}

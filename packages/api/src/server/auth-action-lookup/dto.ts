import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

// @internal TODO : We can optimize this module with entity in Future
export class AuthActionLookupDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  resource: string;

  @ApiProperty()
  @IsArray()
  @IsNotEmpty()
  criteria: string[];

  @ApiProperty()
  @IsNotEmpty()
  method: string;
}

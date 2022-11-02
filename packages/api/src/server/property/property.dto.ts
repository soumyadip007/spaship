import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { Application } from "src/server/application/application.entity";

export class CreatePropertyDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  identifier: string;

  @ApiProperty()
  env: string;

  @ApiProperty()
  cluster: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  createdBy: string;
}

import { IsString, MinLength } from 'class-validator';

export class UpsertCustomerDto {
  @IsString()
  @MinLength(6)
  phone!: string;

  @IsString()
  @MinLength(1)
  fullName!: string;
}

import { IsString, Length, MinLength } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @MinLength(6)
  phone!: string;

  @IsString()
  challengeId!: string;

  @IsString()
  @Length(6, 6)
  code!: string;

  @IsString()
  @MinLength(1)
  fullName!: string;
}

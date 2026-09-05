import { IsISO8601, IsUUID } from 'class-validator';

export class HoldSlotDto {
  @IsUUID()
  staffId!: string;

  @IsISO8601()
  startsAt!: string;
}

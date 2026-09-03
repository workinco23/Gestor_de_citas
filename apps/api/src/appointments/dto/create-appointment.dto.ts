import { ArrayMinSize, IsArray, IsIn, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  staffId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  serviceIds!: string[];

  @IsISO8601()
  startsAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsIn(['app_cliente', 'admin_manual'])
  createdVia!: 'app_cliente' | 'admin_manual';
}

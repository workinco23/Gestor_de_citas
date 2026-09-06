import { ArrayMinSize, IsArray, IsIn, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  /**
   * Requerido solo cuando createdVia = "admin_manual". Para "app_cliente"
   * el customerId se toma del JWT (Authorization: Bearer <token>) y este
   * campo se ignora si viene — ver AppointmentsService.create.
   */
  @IsOptional()
  @IsUUID()
  customerId?: string;

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

  /**
   * Sin pasarela de pago: si el cliente elige "yape" o "plin", declara que ya
   * envió (o va a enviar) el adelanto al número del local — recepción lo
   * confirma manualmente viendo que llegó la plata. "cash" o ausente = paga
   * en el local, sin acción inmediata sobre el estado de pago.
   */
  @IsOptional()
  @IsIn(['cash', 'yape', 'plin'])
  paymentMethod?: 'cash' | 'yape' | 'plin';

  @IsOptional()
  @IsString()
  paymentReference?: string;
}

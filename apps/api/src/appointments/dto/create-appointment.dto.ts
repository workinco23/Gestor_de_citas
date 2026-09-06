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
   * Cómo dice el cliente que va a pagar cuando llegue a la cita. Durante el
   * período de prueba NO se cobra ningún adelanto: esto es solo una
   * preferencia informativa para que recepción/la especialista sepan qué
   * esperar, no crea ningún registro de pago ni cambia paymentStatus.
   */
  @IsOptional()
  @IsIn(['cash', 'yape', 'plin'])
  paymentMethod?: 'cash' | 'yape' | 'plin';
}

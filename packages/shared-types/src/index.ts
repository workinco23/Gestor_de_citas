// Tipos compartidos entre apps/web-cliente, apps/dashboard-admin y apps/api.
// Mantener sincronizado con packages/database/prisma/schema.prisma.

export type ServiceCategory = "unas" | "pestanas" | "cejas" | "otro";

export interface ServiceDTO {
  id: string;
  category: ServiceCategory;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  imageUrl: string | null;
  active: boolean;
}

export interface StaffDTO {
  id: string;
  displayName: string;
  colorHex: string;
  active: boolean;
}

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type PaymentStatus = "unpaid" | "partial" | "paid";

export interface AvailabilitySlot {
  /** ISO 8601 en UTC */
  startsAt: string;
  /** ISO 8601 en UTC */
  endsAt: string;
}

export interface AvailabilityQuery {
  staffId?: string;
  serviceIds: string[];
  /** Fecha en formato YYYY-MM-DD, interpretada en America/Lima */
  date: string;
}

export interface CreateAppointmentDTO {
  customerId: string;
  staffId: string;
  serviceIds: string[];
  /** ISO 8601 en UTC */
  startsAt: string;
  notes?: string;
  createdVia: "app_cliente" | "admin_manual";
}

export interface AppointmentDTO {
  id: string;
  customerId: string;
  staffId: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  services: ServiceDTO[];
  notes: string | null;
}

export const TIMEZONE = "America/Lima" as const;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3103";

export interface ServiceDTO {
  id: string;
  category: "unas" | "pestanas" | "cejas" | "otro";
  name: string;
  durationMinutes: number;
  priceCents: number;
}

export interface StaffDTO {
  id: string;
  displayName: string;
  colorHex: string;
  active: boolean;
}

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type PaymentStatus = "unpaid" | "partial" | "paid";

export interface AppointmentDTO {
  id: string;
  staffId: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  notes: string | null;
  customer: { id: string; fullName: string; phone: string };
  staff: StaffDTO;
  services: { service: ServiceDTO }[];
}

export interface AvailabilitySlot {
  startsAt: string;
  endsAt: string;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message ?? `Error ${res.status}`);
  }
  return res.json();
}

export const fetchServices = () => fetch(`${API_URL}/api/services`).then((r) => json<ServiceDTO[]>(r));

export const fetchStaff = () => fetch(`${API_URL}/api/staff`).then((r) => json<StaffDTO[]>(r));

export const fetchAppointments = (date: string) =>
  fetch(`${API_URL}/api/appointments?date=${date}`).then((r) => json<AppointmentDTO[]>(r));

export const fetchAvailability = (params: { staffId: string; serviceIds: string[]; date: string }) => {
  const query = new URLSearchParams({
    staffId: params.staffId,
    serviceIds: params.serviceIds.join(","),
    date: params.date,
  });
  return fetch(`${API_URL}/api/availability?${query}`).then((r) => json<AvailabilitySlot[]>(r));
};

export const upsertCustomerByPhone = (body: { phone: string; fullName: string }) =>
  fetch(`${API_URL}/api/customers/upsert-by-phone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => json<{ id: string }>(r));

export const createAppointment = (body: {
  customerId: string;
  staffId: string;
  serviceIds: string[];
  startsAt: string;
  createdVia: "admin_manual";
}) =>
  fetch(`${API_URL}/api/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => json<AppointmentDTO>(r));

export const updateAppointmentStatus = (id: string, status: AppointmentStatus) =>
  fetch(`${API_URL}/api/appointments/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  }).then((r) => json<AppointmentDTO>(r));

export function formatSoles(cents: number): string {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(cents / 100);
}

export function formatTimeLima(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Lima",
  });
}

export function todayLima(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

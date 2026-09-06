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
export type PaymentMethod = "cash" | "yape" | "plin" | "card";

export interface PaymentDTO {
  id: string;
  amountCents: number;
  method: PaymentMethod;
  providerReference: string | null;
  paidAt: string;
}

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
  payments: PaymentDTO[];
  intendedPaymentMethod: PaymentMethod | null;
}

export interface AvailabilitySlot {
  startsAt: string;
  endsAt: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new ApiError(err?.message ?? `Error ${res.status}`, res.status);
  }
  return res.json();
}

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  staffProfileId?: string;
}

export const adminLogin = (email: string, password: string) =>
  fetch(`${API_URL}/api/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then((r) => json<{ token: string; user: AdminUser }>(r));

export const fetchServices = () => fetch(`${API_URL}/api/services`).then((r) => json<ServiceDTO[]>(r));

export const fetchStaff = () => fetch(`${API_URL}/api/staff`).then((r) => json<StaffDTO[]>(r));

export const fetchAppointments = (date: string, token?: string) =>
  fetch(`${API_URL}/api/appointments?date=${date}`, { headers: authHeaders(token) }).then((r) =>
    json<AppointmentDTO[]>(r),
  );

export const fetchAppointmentsRange = (from: string, to: string, token?: string, staffId?: string) => {
  const query = new URLSearchParams({ from, to });
  if (staffId) query.set("staffId", staffId);
  return fetch(`${API_URL}/api/appointments?${query}`, { headers: authHeaders(token) }).then((r) =>
    json<AppointmentDTO[]>(r),
  );
};

export const fetchAvailability = (params: { staffId: string; serviceIds: string[]; date: string }) => {
  const query = new URLSearchParams({
    staffId: params.staffId,
    serviceIds: params.serviceIds.join(","),
    date: params.date,
  });
  return fetch(`${API_URL}/api/availability?${query}`).then((r) => json<AvailabilitySlot[]>(r));
};

export const upsertCustomerByPhone = (body: { phone: string; fullName: string }, token?: string) =>
  fetch(`${API_URL}/api/customers/upsert-by-phone`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(body),
  }).then((r) => json<{ id: string }>(r));

export const createAppointment = (
  body: {
    customerId: string;
    staffId: string;
    serviceIds: string[];
    startsAt: string;
    createdVia: "admin_manual";
  },
  token?: string,
) =>
  fetch(`${API_URL}/api/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(body),
  }).then((r) => json<AppointmentDTO>(r));

export const updateAppointmentStatus = (id: string, status: AppointmentStatus, token?: string) =>
  fetch(`${API_URL}/api/appointments/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ status }),
  }).then((r) => json<AppointmentDTO>(r));

export const updateAppointmentPaymentStatus = (
  id: string,
  paymentStatus: PaymentStatus,
  token?: string,
  method?: PaymentMethod,
) =>
  fetch(`${API_URL}/api/appointments/${id}/payment-status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ paymentStatus, method }),
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3103";

export interface ServiceDTO {
  id: string;
  category: "unas" | "pestanas" | "cejas" | "otro";
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

export interface AvailabilitySlot {
  startsAt: string;
  endsAt: string;
}

export async function fetchServices(): Promise<ServiceDTO[]> {
  const res = await fetch(`${API_URL}/api/services`);
  if (!res.ok) throw new Error("No se pudieron cargar los servicios");
  return res.json();
}

export async function fetchStaff(): Promise<StaffDTO[]> {
  const res = await fetch(`${API_URL}/api/staff`);
  if (!res.ok) throw new Error("No se pudieron cargar las especialistas");
  return res.json();
}

export async function fetchAvailability(params: {
  staffId: string;
  serviceIds: string[];
  date: string;
}): Promise<AvailabilitySlot[]> {
  const query = new URLSearchParams({
    staffId: params.staffId,
    serviceIds: params.serviceIds.join(","),
    date: params.date,
  });
  const res = await fetch(`${API_URL}/api/availability?${query}`);
  if (!res.ok) throw new Error("No se pudo cargar la disponibilidad");
  return res.json();
}

export async function holdSlot(params: { staffId: string; startsAt: string }): Promise<{ expiresAt: string }> {
  const res = await fetch(`${API_URL}/api/availability/hold`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("No se pudo apartar el horario");
  return res.json();
}

export function releaseSlot(params: { staffId: string; startsAt: string }): void {
  const query = new URLSearchParams(params);
  // fire-and-forget: si falla, el hold igual expira solo a los 5 minutos.
  fetch(`${API_URL}/api/availability/hold?${query}`, { method: "DELETE" }).catch(() => {});
}

export async function upsertCustomerByPhone(body: { phone: string; fullName: string }): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/api/customers/upsert-by-phone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("No se pudo identificar al cliente");
  return res.json();
}

export interface AuthUser {
  id: string;
  phone: string;
  fullName: string;
  role: string;
  email: string | null;
  createdAt: string;
}

export async function requestOtp(body: { phone: string }): Promise<{ challengeId: string; devCode?: string }> {
  const res = await fetch(`${API_URL}/api/auth/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message ?? "No se pudo enviar el código");
  }
  return res.json();
}

export async function verifyOtp(body: {
  phone: string;
  challengeId: string;
  code: string;
  fullName: string;
}): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${API_URL}/api/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message ?? "No se pudo verificar el código");
  }
  return res.json();
}

export interface PaymentInfoDTO {
  phone: string;
  holderName: string;
  depositCents: number;
}

export async function fetchPaymentInfo(): Promise<PaymentInfoDTO> {
  const res = await fetch(`${API_URL}/api/payment-info`);
  if (!res.ok) throw new Error("No se pudo cargar la información de pago");
  return res.json();
}

export async function createAppointment(
  body: {
    staffId: string;
    serviceIds: string[];
    startsAt: string;
    createdVia: "app_cliente";
    paymentMethod?: "cash" | "yape" | "plin";
    paymentReference?: string;
  },
  token?: string,
) {
  const res = await fetch(`${API_URL}/api/appointments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message ?? "No se pudo crear la cita");
  }
  return res.json();
}

export function formatSoles(cents: number): string {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(cents / 100);
}

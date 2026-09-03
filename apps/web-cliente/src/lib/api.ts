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

export async function upsertCustomerByPhone(body: { phone: string; fullName: string }): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/api/customers/upsert-by-phone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("No se pudo identificar al cliente");
  return res.json();
}

export async function createAppointment(body: {
  customerId: string;
  staffId: string;
  serviceIds: string[];
  startsAt: string;
  createdVia: "app_cliente";
}) {
  const res = await fetch(`${API_URL}/api/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

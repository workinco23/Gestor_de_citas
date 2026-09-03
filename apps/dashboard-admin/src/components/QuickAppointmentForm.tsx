"use client";

import { useEffect, useState } from "react";
import {
  createAppointment,
  fetchAvailability,
  formatSoles,
  formatTimeLima,
  upsertCustomerByPhone,
  type AvailabilitySlot,
  type ServiceDTO,
  type StaffDTO,
} from "@/lib/api";

export function QuickAppointmentForm({
  services,
  staff,
  date,
  onCreated,
}: {
  services: ServiceDTO[];
  staff: StaffDTO[];
  date: string;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [staffId, setStaffId] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staffId || serviceIds.length === 0) {
      setSlots([]);
      return;
    }
    fetchAvailability({ staffId, serviceIds, date })
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [staffId, serviceIds, date]);

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
    setSelectedSlot(null);
  }

  async function handleSubmit() {
    if (!fullName || !phone || !staffId || serviceIds.length === 0 || !selectedSlot) return;
    setSubmitting(true);
    setError(null);
    try {
      const customer = await upsertCustomerByPhone({ phone, fullName });
      await createAppointment({
        customerId: customer.id,
        staffId,
        serviceIds,
        startsAt: selectedSlot,
        createdVia: "admin_manual",
      });
      setFullName("");
      setPhone("");
      setStaffId("");
      setServiceIds([]);
      setSelectedSlot(null);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la cita");
    } finally {
      setSubmitting(false);
    }
  }

  const totalCents = services.filter((s) => serviceIds.includes(s.id)).reduce((sum, s) => sum + s.priceCents, 0);

  return (
    <aside className="w-72 shrink-0 rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">Nueva cita rápida</h2>

      {error && <p className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-600">{error}</p>}

      <div className="flex flex-col gap-2">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nombre del cliente"
          className="rounded-md border border-gray-200 px-2 py-1.5 text-sm"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Celular"
          className="rounded-md border border-gray-200 px-2 py-1.5 text-sm"
        />

        <label className="mt-1 text-xs font-medium text-gray-500">Servicio(s)</label>
        <div className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-md border border-gray-100 p-1">
          {services.map((s) => (
            <label key={s.id} className="flex items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-gray-50">
              <input type="checkbox" checked={serviceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
              {s.name} · {formatSoles(s.priceCents)}
            </label>
          ))}
        </div>

        <label className="mt-1 text-xs font-medium text-gray-500">Especialista</label>
        <select
          value={staffId}
          onChange={(e) => {
            setStaffId(e.target.value);
            setSelectedSlot(null);
          }}
          className="rounded-md border border-gray-200 px-2 py-1.5 text-sm"
        >
          <option value="">Seleccionar…</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.displayName}
            </option>
          ))}
        </select>

        {slots.length > 0 && (
          <>
            <label className="mt-1 text-xs font-medium text-gray-500">Horario ({date})</label>
            <div className="grid max-h-28 grid-cols-3 gap-1 overflow-y-auto">
              {slots.map((slot) => (
                <button
                  key={slot.startsAt}
                  onClick={() => setSelectedSlot(slot.startsAt)}
                  className={`rounded border py-1 text-xs ${
                    selectedSlot === slot.startsAt ? "border-burdeos bg-burdeos text-white" : "border-gray-200"
                  }`}
                >
                  {formatTimeLima(slot.startsAt)}
                </button>
              ))}
            </div>
          </>
        )}

        {serviceIds.length > 0 && (
          <p className="mt-1 text-right text-sm font-semibold text-gray-700">Total: {formatSoles(totalCents)}</p>
        )}

        <button
          disabled={!fullName || !phone || !staffId || serviceIds.length === 0 || !selectedSlot || submitting}
          onClick={handleSubmit}
          className="mt-2 rounded-md bg-burdeos py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "Creando…" : "NUEVA CITA"}
        </button>
      </div>
    </aside>
  );
}

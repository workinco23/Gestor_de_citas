"use client";

import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Sidebar } from "@/components/Sidebar";
import { WeekCalendarGrid } from "@/components/WeekCalendarGrid";
import { QuickAppointmentForm } from "@/components/QuickAppointmentForm";
import { LoginScreen } from "@/components/LoginScreen";
import {
  ApiError,
  fetchAppointmentsRange,
  fetchServices,
  fetchStaff,
  formatSoles,
  formatTimeLima,
  todayLima,
  updateAppointmentStatus,
  updateAppointmentPaymentStatus,
  type AppointmentDTO,
  type AppointmentStatus,
  type PaymentMethod,
  type PaymentStatus,
  type ServiceDTO,
  type StaffDTO,
} from "@/lib/api";
import { clearSession, loadSession, type AdminSession } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3103";

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Sin pagar",
  partial: "Adelanto pendiente",
  paid: "Pagado",
};

const PAYMENT_STATUS_CLASS: Record<PaymentStatus, string> = {
  unpaid: "bg-gray-100 text-gray-500",
  partial: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  card: "Tarjeta",
};

const MONTH_SHORT = [
  "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic",
];

/** Devuelve el lunes (YYYY-MM-DD) de la semana a la que pertenece dateStr. */
function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  // getDay(): 0=domingo..6=sábado. Queremos retroceder hasta el lunes.
  const diffToMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(`${weekEnd}T00:00:00`);
  const startDay = start.getDate();
  const endDay = end.getDate();
  const endMonth = MONTH_SHORT[end.getMonth()];
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${startDay} – ${endDay} ${endMonth} ${end.getFullYear()}`;
  }
  const startMonth = MONTH_SHORT[start.getMonth()];
  return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${end.getFullYear()}`;
}

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${PAYMENT_STATUS_CLASS[status]}`}>
      {PAYMENT_STATUS_LABEL[status]}
    </span>
  );
}

export default function DashboardPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const [weekStart, setWeekStart] = useState(mondayOf(todayLima()));
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [staff, setStaff] = useState<StaffDTO[]>([]);
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
  const [selected, setSelected] = useState<AppointmentDTO | null>(null);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [paidMethod, setPaidMethod] = useState<PaymentMethod>("cash");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isStaff = session?.user.role === "staff";
  const weekEnd = addDays(weekStart, 6);

  useEffect(() => {
    if (selected) setPaidMethod(selected.intendedPaymentMethod ?? "cash");
    setActionError(null);
  }, [selected]);

  useEffect(() => {
    setSession(loadSession());
    setCheckingSession(false);
  }, []);

  // Para una especialista, la especialista "seleccionada" es siempre ella misma.
  useEffect(() => {
    if (!session) return;
    if (session.user.role === "staff") {
      setSelectedStaffId(session.user.staffProfileId ?? "");
    }
  }, [session]);

  // Para admin/recepción, por defecto mostramos la primera especialista disponible.
  useEffect(() => {
    if (!session || session.user.role === "staff") return;
    if (!selectedStaffId && staff.length > 0) setSelectedStaffId(staff[0].id);
  }, [session, staff, selectedStaffId]);

  function handleExpiredSession() {
    clearSession();
    setSession(null);
    setSessionNotice("Tu sesión venció, iniciá sesión de nuevo.");
  }

  const reload = useCallback(() => {
    if (!session || !selectedStaffId) return;
    fetchAppointmentsRange(weekStart, weekEnd, session.token, selectedStaffId)
      .then(setAppointments)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) handleExpiredSession();
      });
  }, [session, weekStart, weekEnd, selectedStaffId]);

  useEffect(() => {
    if (!session) return;
    fetchStaff().then(setStaff).catch(() => {});
    fetchServices().then(setServices).catch(() => {});
  }, [session]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!session) return;
    const socket = io(API_URL);
    socket.on("appointment.created", reload);
    socket.on("appointment.updated", reload);
    return () => {
      socket.disconnect();
    };
  }, [reload, session]);

  const weekTotalCents = appointments
    .filter((a) => a.status !== "cancelled")
    .reduce((sum, a) => sum + a.services.reduce((s, x) => s + x.service.priceCents, 0), 0);

  if (checkingSession) {
    return <div className="flex h-screen items-center justify-center bg-navy" />;
  }

  if (!session) {
    return (
      <LoginScreen
        notice={sessionNotice}
        onLogin={(s) => {
          setSessionNotice(null);
          setSession(s);
        }}
      />
    );
  }

  function handleMarkAsPaid() {
    if (!selected || !session) return;
    setUpdatingPayment(true);
    setActionError(null);
    updateAppointmentPaymentStatus(selected.id, "paid", session.token, paidMethod)
      .then((updated) => {
        setSelected(updated);
        reload();
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) handleExpiredSession();
        else if (e instanceof ApiError) setActionError(e.message);
      })
      .finally(() => setUpdatingPayment(false));
  }

  function handleStatusChange(id: string, status: AppointmentStatus) {
    if (!session) return;
    setUpdatingStatus(true);
    setActionError(null);
    updateAppointmentStatus(id, status, session.token)
      .then(() => {
        reload();
        setSelected(null);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) handleExpiredSession();
        else if (e instanceof ApiError) setActionError(e.message);
      })
      .finally(() => setUpdatingStatus(false));
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setSessionNotice(null);
  }

  const selectedStaff = staff.find((s) => s.id === selectedStaffId);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        onLogout={handleLogout}
        minimal={isStaff}
        subtitle={isStaff ? session.user.fullName : "Lounge — Admin"}
      />

      <main className="flex flex-1 flex-col gap-4 overflow-hidden p-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Agenda</h1>
            {/* Vista semanal: el rótulo de ingresos ahora suma toda la semana cargada.
                Para "staff" ocultamos el monto total — no hay pedido explícito del dueño
                de que la especialista vea ingresos agregados, así que preferimos no exponerlo. */}
            {!isStaff && (
              <p className="text-sm text-gray-400">Ingresos de la semana: {formatSoles(weekTotalCents)}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!isStaff && (
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.displayName}
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5">
              <button
                onClick={() => setWeekStart((w) => addDays(w, -7))}
                aria-label="Semana anterior"
                className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100"
              >
                ‹
              </button>
              <span className="min-w-[9rem] text-center text-sm text-gray-700">
                {formatWeekRange(weekStart, weekEnd)}
              </span>
              <button
                onClick={() => setWeekStart((w) => addDays(w, 7))}
                aria-label="Semana siguiente"
                className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100"
              >
                ›
              </button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 gap-4 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <WeekCalendarGrid
              weekStart={weekStart}
              appointments={appointments}
              staffColor={selectedStaff?.colorHex ?? "#7a1f2b"}
              onSelect={setSelected}
            />
          </div>

          <div className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto">
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-700">Detalle de la semana</h2>
              {actionError && !selected && (
                <p className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-600">{actionError}</p>
              )}
              {appointments.length === 0 && <p className="text-xs text-gray-400">Sin citas registradas.</p>}
              <ul className="flex flex-col gap-2">
                {appointments.map((a) => (
                  <li key={a.id} className="rounded-lg border border-gray-100 p-2 text-xs">
                    <div className="flex justify-between font-medium text-gray-700">
                      <span>{formatTimeLima(a.startsAt)} · {a.customer.fullName}</span>
                      <span>{formatSoles(a.services.reduce((s, x) => s + x.service.priceCents, 0))}</span>
                    </div>
                    <p className="text-gray-400">{a.services.map((s) => s.service.name).join(", ")}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] uppercase text-gray-500">
                          {a.status}
                        </span>
                        {!isStaff && <PaymentStatusBadge status={a.paymentStatus} />}
                      </div>
                      {a.status !== "cancelled" && a.status !== "completed" && (
                        <button
                          onClick={() => handleStatusChange(a.id, "cancelled")}
                          className="text-[10px] text-red-500 hover:underline"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {!isStaff && (
              <QuickAppointmentForm
                services={services}
                staff={staff}
                date={todayLima()}
                token={session.token}
                onCreated={reload}
                onSessionExpired={handleExpiredSession}
              />
            )}
          </div>
        </div>
      </main>

      {selected && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/30"
          onClick={() => setSelected(null)}
        >
          <div className="w-80 rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 font-semibold text-gray-800">{selected.customer.fullName}</h3>
            <p className="text-sm text-gray-500">{selected.customer.phone}</p>
            <p className="mt-2 text-sm text-gray-600">
              {formatTimeLima(selected.startsAt)} – {formatTimeLima(selected.endsAt)}
            </p>
            <ul className="mt-2 text-sm text-gray-600">
              {selected.services.map((s) => (
                <li key={s.service.id}>
                  {s.service.name} · {formatSoles(s.service.priceCents)}
                </li>
              ))}
            </ul>

            {!isStaff && (
              <div className="mt-4 rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-gray-500">Pago</h4>
                  <PaymentStatusBadge status={selected.paymentStatus} />
                </div>
                {selected.intendedPaymentMethod && selected.paymentStatus !== "paid" && (
                  <p className="mt-1 text-xs text-gray-500">
                    Dijo que iba a pagar con{" "}
                    <span className="font-medium text-gray-700">
                      {PAYMENT_METHOD_LABEL[selected.intendedPaymentMethod]}
                    </span>
                    . Sin adelanto — cobrar en persona.
                  </p>
                )}
                {selected.payments.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1 text-xs text-gray-500">
                    {selected.payments.map((p) => (
                      <li key={p.id}>
                        {PAYMENT_METHOD_LABEL[p.method]} · {formatSoles(p.amountCents)}
                        {p.providerReference && <> · Nº de operación: {p.providerReference}</>}
                      </li>
                    ))}
                  </ul>
                )}
                {selected.paymentStatus !== "paid" && (
                  <div className="mt-3 flex items-center gap-2">
                    <select
                      value={paidMethod}
                      onChange={(e) => setPaidMethod(e.target.value as PaymentMethod)}
                      className="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-xs"
                    >
                      <option value="cash">Efectivo</option>
                      <option value="yape">Yape</option>
                      <option value="plin">Plin</option>
                      <option value="card">Tarjeta</option>
                    </select>
                    <button
                      onClick={handleMarkAsPaid}
                      disabled={updatingPayment}
                      className="rounded-md bg-burdeos px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      {updatingPayment ? "Guardando…" : "Marcar pagado"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {actionError && (
              <p className="mt-3 rounded bg-red-50 px-2 py-1 text-xs text-red-600">{actionError}</p>
            )}

            {selected.status !== "completed" && selected.status !== "cancelled" && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleStatusChange(selected.id, "completed")}
                  disabled={updatingStatus}
                  className="flex-1 rounded-md bg-green-600 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                  Marcar como completada
                </button>
                <button
                  onClick={() => handleStatusChange(selected.id, "cancelled")}
                  disabled={updatingStatus}
                  className="flex-1 rounded-md bg-red-500 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                  Cancelar
                </button>
              </div>
            )}

            <button
              onClick={() => setSelected(null)}
              className="mt-3 w-full rounded-md bg-gray-100 py-2 text-sm text-gray-600"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Sidebar } from "@/components/Sidebar";
import { CalendarGrid } from "@/components/CalendarGrid";
import { QuickAppointmentForm } from "@/components/QuickAppointmentForm";
import { LoginScreen } from "@/components/LoginScreen";
import {
  ApiError,
  fetchAppointments,
  fetchServices,
  fetchStaff,
  formatSoles,
  formatTimeLima,
  todayLima,
  updateAppointmentStatus,
  type AppointmentDTO,
  type ServiceDTO,
  type StaffDTO,
} from "@/lib/api";
import { clearSession, loadSession, type AdminSession } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3103";

export default function DashboardPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const [date, setDate] = useState(todayLima());
  const [staff, setStaff] = useState<StaffDTO[]>([]);
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
  const [selected, setSelected] = useState<AppointmentDTO | null>(null);

  useEffect(() => {
    setSession(loadSession());
    setCheckingSession(false);
  }, []);

  function handleExpiredSession() {
    clearSession();
    setSession(null);
    setSessionNotice("Tu sesión venció, iniciá sesión de nuevo.");
  }

  const reload = useCallback(() => {
    if (!session) return;
    fetchAppointments(date, session.token)
      .then(setAppointments)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) handleExpiredSession();
      });
  }, [date, session]);

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

  const dayTotalCents = appointments
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

  function handleLogout() {
    clearSession();
    setSession(null);
    setSessionNotice(null);
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onLogout={handleLogout} />

      <main className="flex flex-1 flex-col gap-4 overflow-hidden p-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Agenda</h1>
            <p className="text-sm text-gray-400">Ingresos del día: {formatSoles(dayTotalCents)}</p>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </header>

        <div className="flex flex-1 gap-4 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <CalendarGrid staff={staff} appointments={appointments} onSelect={setSelected} />
          </div>

          <div className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto">
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-700">Detalle del día</h2>
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
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] uppercase text-gray-500">
                        {a.status}
                      </span>
                      {a.status !== "cancelled" && a.status !== "completed" && (
                        <button
                          onClick={() =>
                            updateAppointmentStatus(a.id, "cancelled", session.token)
                              .then(reload)
                              .catch((e) => {
                                if (e instanceof ApiError && e.status === 401) handleExpiredSession();
                              })
                          }
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

            <QuickAppointmentForm
              services={services}
              staff={staff}
              date={date}
              token={session.token}
              onCreated={reload}
              onSessionExpired={handleExpiredSession}
            />
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
            <button
              onClick={() => setSelected(null)}
              className="mt-4 w-full rounded-md bg-gray-100 py-2 text-sm text-gray-600"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

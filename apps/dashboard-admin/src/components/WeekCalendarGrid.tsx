"use client";

import type { AppointmentDTO } from "@/lib/api";
import { formatTimeLima, todayLima } from "@/lib/api";

const DAY_START_HOUR = 9;
const DAY_END_HOUR = 19;
const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);
const TOTAL_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60;

const WEEKDAY_LABEL = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function limaDateKey(iso: string): string {
  // en-CA da formato YYYY-MM-DD directamente.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date(iso));
}

function minutesFromDayStart(iso: string): number {
  const limaHour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "America/Lima" }).format(
      new Date(iso),
    ),
  );
  const limaMinute = Number(
    new Intl.DateTimeFormat("en-GB", { minute: "2-digit", timeZone: "America/Lima" }).format(new Date(iso)),
  );
  return (limaHour - DAY_START_HOUR) * 60 + limaMinute;
}

export function WeekCalendarGrid({
  weekStart,
  appointments,
  staffColor,
  onSelect,
}: {
  /** Lunes de la semana, formato YYYY-MM-DD. */
  weekStart: string;
  /** Citas de la semana, ya filtradas a una sola especialista. */
  appointments: AppointmentDTO[];
  /** Color de la especialista, para pintar los bloques. */
  staffColor: string;
  onSelect: (appointment: AppointmentDTO) => void;
}) {
  const today = todayLima();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <div className="w-14 shrink-0 border-r border-gray-100">
        <div className="h-12 border-b border-gray-100" />
        {HOURS.map((h) => (
          <div key={h} className="h-16 border-b border-gray-50 pr-2 text-right text-xs text-gray-400">
            {String(h).padStart(2, "0")}:00
          </div>
        ))}
      </div>
      {days.map((dayKey, i) => {
        const dayAppointments = appointments.filter((a) => limaDateKey(a.startsAt) === dayKey);
        const isToday = dayKey === today;
        const dayNumber = Number(dayKey.split("-")[2]);
        return (
          <div key={dayKey} className="w-40 shrink-0 border-r border-gray-100 last:border-r-0">
            <div
              className={`flex h-12 flex-col items-center justify-center border-b border-gray-100 text-sm font-medium ${
                isToday ? "bg-burdeos/10 text-burdeos" : "text-gray-700"
              }`}
            >
              <span>{WEEKDAY_LABEL[i]} {dayNumber}</span>
            </div>
            <div className="relative" style={{ height: HOURS.length * 64 }}>
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 h-16 border-b border-gray-50"
                  style={{ top: (h - DAY_START_HOUR) * 64 }}
                />
              ))}
              {dayAppointments.map((appt) => {
                const startMin = minutesFromDayStart(appt.startsAt);
                const endMin = minutesFromDayStart(appt.endsAt);
                const top = (startMin / TOTAL_MINUTES) * HOURS.length * 64;
                const height = Math.max(((endMin - startMin) / TOTAL_MINUTES) * HOURS.length * 64, 24);
                const isCancelled = appt.status === "cancelled";
                return (
                  <button
                    key={appt.id}
                    onClick={() => onSelect(appt)}
                    className={`absolute inset-x-1 overflow-hidden rounded-md px-2 py-1 text-left text-xs text-white shadow-sm ${isCancelled ? "opacity-40 line-through" : ""}`}
                    style={{ top, height, backgroundColor: staffColor }}
                  >
                    <p className="font-semibold">{formatTimeLima(appt.startsAt)}</p>
                    <p className="truncate">{appt.customer.fullName}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

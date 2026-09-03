"use client";

import type { AppointmentDTO, StaffDTO } from "@/lib/api";
import { formatTimeLima } from "@/lib/api";

const DAY_START_HOUR = 9;
const DAY_END_HOUR = 19;
const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);

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

const TOTAL_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60;

export function CalendarGrid({
  staff,
  appointments,
  onSelect,
}: {
  staff: StaffDTO[];
  appointments: AppointmentDTO[];
  onSelect: (appointment: AppointmentDTO) => void;
}) {
  return (
    <div className="flex overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <div className="w-14 shrink-0 border-r border-gray-100">
        <div className="h-10 border-b border-gray-100" />
        {HOURS.map((h) => (
          <div key={h} className="h-16 border-b border-gray-50 pr-2 text-right text-xs text-gray-400">
            {String(h).padStart(2, "0")}:00
          </div>
        ))}
      </div>
      {staff.map((s) => {
        const staffAppointments = appointments.filter((a) => a.staffId === s.id);
        return (
          <div key={s.id} className="w-44 shrink-0 border-r border-gray-100 last:border-r-0">
            <div className="flex h-10 items-center gap-1.5 border-b border-gray-100 px-2 text-sm font-medium text-gray-700">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.colorHex }} />
              {s.displayName}
            </div>
            <div className="relative" style={{ height: HOURS.length * 64 }}>
              {HOURS.map((h) => (
                <div key={h} className="absolute inset-x-0 h-16 border-b border-gray-50" style={{ top: (h - DAY_START_HOUR) * 64 }} />
              ))}
              {staffAppointments.map((appt) => {
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
                    style={{ top, height, backgroundColor: s.colorHex }}
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

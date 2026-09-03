"use client";

import { useState } from "react";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function Calendar({
  selectedDate,
  onSelect,
}: {
  selectedDate: string | null;
  onSelect: (dateKey: string) => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  // getDay(): 0=domingo. Convertimos a semana que empieza en lunes.
  const leadingBlanks = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={goPrevMonth}
          aria-label="Mes anterior"
          className="rounded-full px-3 py-1 text-gray-500 hover:bg-gray-100"
        >
          ‹
        </button>
        <span className="font-medium text-gray-800">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={goNextMonth}
          aria-label="Mes siguiente"
          className="rounded-full px-3 py-1 text-gray-500 hover:bg-gray-100"
        >
          ›
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 text-center text-xs text-gray-400">
        {WEEKDAYS.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateKey = toDateKey(viewYear, viewMonth, day);
          const isPast = dateKey < todayKey;
          const isSelected = dateKey === selectedDate;
          return (
            <button
              key={i}
              disabled={isPast}
              onClick={() => onSelect(dateKey)}
              className={[
                "aspect-square rounded-full text-sm transition",
                isPast ? "text-gray-300" : "text-gray-700 hover:bg-burdeos/10",
                isSelected ? "bg-burdeos text-white hover:bg-burdeos" : "",
                dateKey === todayKey && !isSelected ? "border border-burdeos text-burdeos" : "",
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

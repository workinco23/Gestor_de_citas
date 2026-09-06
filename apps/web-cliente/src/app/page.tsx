"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar } from "@/components/Calendar";
import {
  createAppointment,
  fetchAvailability,
  fetchServices,
  fetchStaff,
  formatSoles,
  holdSlot,
  releaseSlot,
  requestOtp,
  verifyOtp,
  type AuthUser,
  type AvailabilitySlot,
  type ServiceDTO,
  type StaffDTO,
} from "@/lib/api";

const SESSION_KEY = "aurora_client_session";

interface ClientSession {
  token: string;
  user: AuthUser;
}

function decodeJwtPayload(token: string): { exp?: number } {
  // Los JWT usan base64url (-/_ sin padding), no base64 estándar (+//) —
  // atob() directo falla en cuanto el payload contiene esos bytes.
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return JSON.parse(atob(padded));
}

function loadSession(): ClientSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as ClientSession;
    if (!session?.token) return null;
    const payload = decodeJwtPayload(session.token);
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

function saveSession(session: ClientSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

const CATEGORIES: { key: ServiceDTO["category"]; label: string }[] = [
  { key: "unas", label: "Uñas" },
  { key: "pestanas", label: "Pestañas" },
  { key: "cejas", label: "Cejas" },
];

export default function Home() {
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [staff, setStaff] = useState<StaffDTO[]>([]);
  const [category, setCategory] = useState<ServiceDTO["category"]>("unas");
  const [cart, setCart] = useState<ServiceDTO[]>([]);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [step, setStep] = useState<"services" | "contacto" | "verificar-otp" | "checkout">("services");
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "yape" | "plin">("cash");

  const [session, setSession] = useState<ClientSession | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices().then(setServices).catch(() => setErrorMsg("No se pudo conectar con el servidor."));
    fetchStaff().then(setStaff).catch(() => {});
    setSession(loadSession());
  }, []);

  useEffect(() => {
    if (!staffId || !date || cart.length === 0) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    setSelectedSlot(null);
    fetchAvailability({ staffId, serviceIds: cart.map((s) => s.id), date })
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [staffId, date, cart]);

  const filteredServices = useMemo(
    () => services.filter((s) => s.category === category),
    [services, category],
  );

  const totalCents = cart.reduce((sum, s) => sum + s.priceCents, 0);
  const totalMinutes = cart.reduce((sum, s) => sum + s.durationMinutes, 0);

  function toggleService(service: ServiceDTO) {
    setCart((prev) =>
      prev.some((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service],
    );
  }

  async function handleSendOtp() {
    if (!phone || !fullName) return;
    setSendingOtp(true);
    setOtpError(null);
    try {
      const res = await requestOtp({ phone });
      setChallengeId(res.challengeId);
      setDevCode(res.devCode ?? null);
      setOtpCode("");
      setStep("verificar-otp");
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : "No se pudo enviar el código");
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleVerifyOtp() {
    if (!challengeId || otpCode.length !== 6) return;
    setVerifyingOtp(true);
    setOtpError(null);
    try {
      const res = await verifyOtp({ phone, challengeId, code: otpCode, fullName });
      const newSession = { token: res.token, user: res.user };
      saveSession(newSession);
      setSession(newSession);
      setStep("checkout");
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo verificar el código";
      setOtpError(message);
      if (message === "El código venció, pedí uno nuevo") {
        setChallengeId(null);
        setDevCode(null);
        setOtpCode("");
        setStep("contacto");
      }
    } finally {
      setVerifyingOtp(false);
    }
  }

  function handleChangeNumber() {
    clearSession();
    setSession(null);
    setChallengeId(null);
    setDevCode(null);
    setOtpCode("");
    setOtpError(null);
    setPhone("");
    setFullName("");
    setStep("contacto");
  }

  async function handleConfirm() {
    if (!staffId || !selectedSlot || !session) return;
    setConfirming(true);
    setErrorMsg(null);
    try {
      await createAppointment(
        {
          staffId,
          serviceIds: cart.map((s) => s.id),
          startsAt: selectedSlot.startsAt,
          createdVia: "app_cliente",
          paymentMethod,
        },
        session.token,
      );
      setConfirmed(true);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "No se pudo confirmar la cita");
    } finally {
      setConfirming(false);
    }
  }

  if (confirmed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-5xl">✓</div>
        <h1 className="text-xl font-semibold text-gray-800">¡Cita reservada!</h1>
        <p className="text-gray-500">
          {paymentMethod !== "cash"
            ? `Recordá tener listo tu pago por ${paymentMethod === "yape" ? "Yape" : "Plin"} el día de tu cita.`
            : "Pagás en el local al finalizar tu cita."}{" "}
          Te enviaremos la confirmación y un recordatorio por WhatsApp.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-white pb-28">
      <header className="bg-burdeos px-6 py-5 text-white">
        <h1 className="text-lg font-semibold">Aurora Beauty Lounge</h1>
        <p className="text-sm text-white/80">- Citas Online -</p>
      </header>

      {errorMsg && (
        <div className="mx-4 mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{errorMsg}</div>
      )}

      {step === "services" && (
        <>
          <nav className="flex gap-2 px-4 pt-4">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={[
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  category === c.key
                    ? "bg-burdeos text-white"
                    : "bg-gray-soft text-gray-600 hover:bg-gray-200",
                ].join(" ")}
              >
                {c.label}
              </button>
            ))}
          </nav>

          <section className="flex flex-col gap-2 px-4 pt-4">
            {filteredServices.map((service) => {
              const inCart = cart.some((s) => s.id === service.id);
              return (
                <button
                  key={service.id}
                  onClick={() => toggleService(service)}
                  className={[
                    "flex items-center justify-between rounded-xl border p-3 text-left transition",
                    inCart ? "border-burdeos bg-burdeos/5" : "border-gray-200 hover:border-gray-300",
                  ].join(" ")}
                >
                  <div>
                    <p className="font-medium text-gray-800">{service.name}</p>
                    <p className="text-xs text-gray-400">{service.durationMinutes} min</p>
                  </div>
                  <span className="font-semibold text-burdeos">{formatSoles(service.priceCents)}</span>
                </button>
              );
            })}
            {filteredServices.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-400">Cargando servicios…</p>
            )}
          </section>

          {cart.length > 0 && (
            <section className="mt-6 px-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-500">Especialista</h2>
              <div className="flex flex-wrap gap-2">
                {staff.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStaffId(s.id)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-sm",
                      staffId === s.id ? "border-burdeos bg-burdeos text-white" : "border-gray-200 text-gray-600",
                    ].join(" ")}
                  >
                    <span
                      className="mr-1.5 inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: s.colorHex }}
                    />
                    {s.displayName}
                  </button>
                ))}
              </div>
            </section>
          )}

          {staffId && (
            <section className="mt-6 px-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-500">Fecha</h2>
              <Calendar selectedDate={date} onSelect={setDate} />
            </section>
          )}

          {date && (
            <section className="mt-6 px-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-500">Horario disponible</h2>
              {loadingSlots && <p className="text-sm text-gray-400">Buscando horarios…</p>}
              {!loadingSlots && slots.length === 0 && (
                <p className="text-sm text-gray-400">No hay horarios disponibles ese día.</p>
              )}
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => {
                  const label = new Date(slot.startsAt).toLocaleTimeString("es-PE", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "America/Lima",
                  });
                  const isSelected = selectedSlot?.startsAt === slot.startsAt;
                  return (
                    <button
                      key={slot.startsAt}
                      onClick={() => setSelectedSlot(slot)}
                      className={[
                        "rounded-lg border py-2 text-sm",
                        isSelected ? "border-burdeos bg-burdeos text-white" : "border-gray-200 text-gray-600",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {selectedSlot && (
            <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-gray-100 bg-white p-4">
              <div className="mb-2 flex items-center justify-between text-sm text-gray-500">
                <span>{cart.length} servicio(s) · {totalMinutes} min</span>
                <span className="font-semibold text-gray-800">{formatSoles(totalCents)}</span>
              </div>
              <button
                onClick={() => {
                  if (staffId) holdSlot({ staffId, startsAt: selectedSlot.startsAt });
                  setStep(session ? "checkout" : "contacto");
                }}
                className="w-full rounded-xl bg-burdeos py-3 font-semibold text-white hover:bg-burdeos-dark"
              >
                CONTINUAR
              </button>
            </div>
          )}
        </>
      )}

      {step === "contacto" && (
        <section className="flex flex-col gap-4 px-4 pt-6">
          <button
            onClick={() => {
              if (staffId && selectedSlot) releaseSlot({ staffId, startsAt: selectedSlot.startsAt });
              setStep("services");
            }}
            className="w-fit text-sm text-gray-400"
          >
            ← Volver
          </button>
          <h2 className="text-lg font-semibold text-gray-800">¿Quién reserva?</h2>
          <p className="text-sm text-gray-500">
            Te vamos a enviar un código de verificación por WhatsApp para confirmar tu número.
          </p>

          {otpError && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{otpError}</div>
          )}

          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nombre completo"
            className="rounded-lg border border-gray-200 px-4 py-3 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Celular (WhatsApp) — ej. 999888777"
            className="rounded-lg border border-gray-200 px-4 py-3 text-sm"
          />

          <button
            disabled={!phone || !fullName || sendingOtp}
            onClick={handleSendOtp}
            className="w-full rounded-xl bg-burdeos py-3 font-semibold text-white disabled:opacity-50"
          >
            {sendingOtp ? "Enviando…" : "Enviar código"}
          </button>
        </section>
      )}

      {step === "verificar-otp" && (
        <section className="flex flex-col gap-4 px-4 pt-6">
          <button
            onClick={() => {
              setOtpError(null);
              setStep("contacto");
            }}
            className="w-fit text-sm text-gray-400"
          >
            ← Volver
          </button>
          <h2 className="text-lg font-semibold text-gray-800">Verificá tu número</h2>
          <p className="text-sm text-gray-500">
            Te enviamos un código de 6 dígitos por WhatsApp al {phone}.
          </p>

          {devCode && (
            <div className="rounded-lg bg-yellow-50 px-4 py-2 text-sm text-yellow-700">
              Modo desarrollo — tu código es: <span className="font-semibold">{devCode}</span>
            </div>
          )}

          {otpError && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{otpError}</div>
          )}

          <input
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Código de 6 dígitos"
            inputMode="numeric"
            maxLength={6}
            className="rounded-lg border border-gray-200 px-4 py-3 text-center text-lg tracking-widest"
          />

          <button
            disabled={otpCode.length !== 6 || verifyingOtp}
            onClick={handleVerifyOtp}
            className="w-full rounded-xl bg-burdeos py-3 font-semibold text-white disabled:opacity-50"
          >
            {verifyingOtp ? "Verificando…" : "Confirmar"}
          </button>

          <button
            disabled={sendingOtp}
            onClick={handleSendOtp}
            className="w-fit text-sm text-burdeos underline disabled:opacity-50"
          >
            Reenviar código
          </button>
        </section>
      )}

      {step === "checkout" && session && (
        <section className="flex flex-col gap-4 px-4 pt-6">
          <button
            onClick={() => {
              if (staffId && selectedSlot) releaseSlot({ staffId, startsAt: selectedSlot.startsAt });
              setStep("services");
            }}
            className="w-fit text-sm text-gray-400"
          >
            ← Volver
          </button>
          <h2 className="text-lg font-semibold text-gray-800">Confirmar reserva</h2>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 p-3 text-sm">
            <span className="text-gray-600">
              Reservando como <span className="font-semibold text-gray-800">{session.user.fullName}</span>
            </span>
            <button onClick={handleChangeNumber} className="text-xs text-burdeos underline">
              No soy yo / cambiar número
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 p-3 text-sm text-gray-600">
            {cart.map((s) => (
              <div key={s.id} className="flex justify-between py-1">
                <span>{s.name}</span>
                <span>{formatSoles(s.priceCents)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 font-semibold text-gray-800">
              <span>Total</span>
              <span>{formatSoles(totalCents)}</span>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-500">¿Cómo vas a pagar?</h2>
            <p className="mb-2 text-xs text-gray-400">
              Pagás al finalizar tu cita — esto es solo para que sepamos qué esperar.
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "cash", label: "Efectivo" },
                  { key: "yape", label: "Yape" },
                  { key: "plin", label: "Plin" },
                ] as const
              ).map((option) => (
                <button
                  key={option.key}
                  onClick={() => setPaymentMethod(option.key)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-sm",
                    paymentMethod === option.key
                      ? "border-burdeos bg-burdeos text-white"
                      : "border-gray-200 text-gray-600",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={confirming}
            onClick={handleConfirm}
            className="w-full rounded-xl bg-burdeos py-3 font-semibold text-white disabled:opacity-50"
          >
            {confirming ? "Reservando…" : "RESERVAR CITA"}
          </button>
        </section>
      )}
    </main>
  );
}

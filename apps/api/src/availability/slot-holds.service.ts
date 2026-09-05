import { Injectable, OnModuleDestroy } from '@nestjs/common';

const HOLD_TTL_MS = 5 * 60_000;

function holdKey(staffId: string, startsAtIso: string): string {
  return `${staffId}|${startsAtIso}`;
}

/**
 * Aparta un slot mientras el cliente completa el checkout, para que no
 * aparezca como disponible para otra persona navegando el calendario al
 * mismo tiempo. Implementación en memoria: sirve para una sola instancia
 * de la API. Si el sistema escala a múltiples instancias, reemplazar el
 * Map por Redis (SET key EX 300 NX) — la interfaz pública de este
 * servicio no debería cambiar.
 */
@Injectable()
export class SlotHoldsService implements OnModuleDestroy {
  private readonly holds = new Map<string, number>(); // key -> expiresAt (epoch ms)
  private readonly cleanupInterval = setInterval(() => this.evictExpired(), 30_000);

  hold(staffId: string, startsAtIso: string): { expiresAt: string } {
    const expiresAt = Date.now() + HOLD_TTL_MS;
    this.holds.set(holdKey(staffId, startsAtIso), expiresAt);
    return { expiresAt: new Date(expiresAt).toISOString() };
  }

  release(staffId: string, startsAtIso: string): void {
    this.holds.delete(holdKey(staffId, startsAtIso));
  }

  isHeld(staffId: string, startsAtIso: string): boolean {
    const expiresAt = this.holds.get(holdKey(staffId, startsAtIso));
    if (expiresAt === undefined) return false;
    if (expiresAt < Date.now()) {
      this.holds.delete(holdKey(staffId, startsAtIso));
      return false;
    }
    return true;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, expiresAt] of this.holds) {
      if (expiresAt < now) this.holds.delete(key);
    }
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

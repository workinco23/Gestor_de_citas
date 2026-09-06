import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export * from "@prisma/client";
export { PrismaClient } from "@prisma/client";

const KEY_LENGTH = 64;

/** Hashea una contraseña con scrypt (nativo de Node, sin dependencias extra). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const suppliedBuffer = scryptSync(password, salt, KEY_LENGTH);
  return hashBuffer.length === suppliedBuffer.length && timingSafeEqual(hashBuffer, suppliedBuffer);
}

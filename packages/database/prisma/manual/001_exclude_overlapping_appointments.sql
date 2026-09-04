-- Defensa a nivel de BD contra citas solapadas del mismo especialista.
-- Prisma no soporta EXCLUDE nativamente, por eso se aplica a mano.
-- Ejecutar una sola vez tras la migración inicial.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE appointments ADD CONSTRAINT no_overlapping_appointments
  EXCLUDE USING gist (staff_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
  WHERE (status != 'cancelled');

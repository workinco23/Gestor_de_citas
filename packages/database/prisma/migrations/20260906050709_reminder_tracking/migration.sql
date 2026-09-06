-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "reminder_24h_sent_at" TIMESTAMPTZ(3),
ADD COLUMN     "reminder_2h_sent_at" TIMESTAMPTZ(3);

import { PrismaClient, ServiceCategory } from "@prisma/client";
import { hashPassword } from "../index.js";

const prisma = new PrismaClient();

async function main() {
  // --- Especialistas reales ---
  // Por ahora el local solo cuenta con Leslye, con horario partido por almuerzo
  // (12:30-13:30). Agregar más especialistas acá a medida que se contraten.
  const staffData = [
    {
      displayName: "Leslye",
      colorHex: "#FB923C",
      phone: "+51900000003",
      shifts: [
        { start: "09:00", end: "12:30" },
        { start: "13:30", end: "18:00" },
      ],
    },
  ];

  const staffProfiles = [];
  for (const s of staffData) {
    const user = await prisma.user.upsert({
      where: { phone: s.phone },
      update: {},
      create: { phone: s.phone, fullName: s.displayName, role: "staff" },
    });

    const profile = await prisma.staffProfile.upsert({
      where: { userId: user.id },
      update: { displayName: s.displayName, active: true },
      create: { userId: user.id, displayName: s.displayName, colorHex: s.colorHex },
    });

    await prisma.staffSchedule.deleteMany({ where: { staffId: profile.id } });
    for (let weekday = 1; weekday <= 6; weekday++) {
      for (const shift of s.shifts) {
        await prisma.staffSchedule.create({
          data: { staffId: profile.id, weekday, startTime: shift.start, endTime: shift.end },
        });
      }
    }

    staffProfiles.push(profile);
  }

  // --- Servicios ---
  const services = [
    { category: ServiceCategory.unas, name: "Manicura Gel", durationMinutes: 60, priceCents: 18000 },
    { category: ServiceCategory.unas, name: "Manicura Clásica", durationMinutes: 45, priceCents: 12000 },
    { category: ServiceCategory.pestanas, name: "Pestañas Voluptuosas", durationMinutes: 90, priceCents: 15000 },
    { category: ServiceCategory.pestanas, name: "Lifting de Pestañas", durationMinutes: 60, priceCents: 10000 },
    { category: ServiceCategory.cejas, name: "Diseño de Cejas", durationMinutes: 30, priceCents: 5000 },
    { category: ServiceCategory.cejas, name: "Laminado de Cejas", durationMinutes: 45, priceCents: 8000 },
  ];

  const existingServices = await prisma.service.findMany();
  const createdServices = existingServices.length > 0 ? existingServices : [];
  if (existingServices.length === 0) {
    for (const svc of services) {
      createdServices.push(await prisma.service.create({ data: svc }));
    }
  }

  for (const staff of staffProfiles) {
    for (const svc of createdServices) {
      await prisma.staffService.upsert({
        where: { staffId_serviceId: { staffId: staff.id, serviceId: svc.id } },
        update: {},
        create: { staffId: staff.id, serviceId: svc.id },
      });
    }
  }

  // --- Login de cada especialista (ej. Leslye ve su propia agenda semanal) ---
  const staffLogins: Record<string, { email: string; envVar: string }> = {
    "+51900000003": { email: "leslye@aurorabeauty.pe", envVar: "SEED_LESLYE_PASSWORD" },
  };
  for (const [phone, { email, envVar }] of Object.entries(staffLogins)) {
    const password = process.env[envVar];
    if (!password) {
      console.log(`${envVar} no seteado: se omitió el login de ${email}.`);
      continue;
    }
    await prisma.user.update({
      where: { phone },
      data: { email, passwordHash: hashPassword(password) },
    });
    console.log(`Login de especialista listo: ${email}`);
  }

  // --- Usuario de recepción (login del dashboard admin) ---
  const receptionEmail = process.env.SEED_RECEPTION_EMAIL ?? "recepcion@aurorabeauty.pe";
  const receptionPassword = process.env.SEED_RECEPTION_PASSWORD;
  if (receptionPassword) {
    await prisma.user.upsert({
      where: { phone: "+51900000000" },
      update: { email: receptionEmail, passwordHash: hashPassword(receptionPassword), role: "reception" },
      create: {
        phone: "+51900000000",
        email: receptionEmail,
        fullName: "Recepción",
        role: "reception",
        passwordHash: hashPassword(receptionPassword),
      },
    });
    console.log(`Usuario de recepción listo: ${receptionEmail}`);
  } else {
    console.log("SEED_RECEPTION_PASSWORD no seteado: se omitió la creación/actualización del usuario de recepción.");
  }

  console.log(`Seed completo: ${staffProfiles.length} especialista(s), ${createdServices.length} servicio(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

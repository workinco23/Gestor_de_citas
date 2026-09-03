import { PrismaClient, ServiceCategory } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const staffData = [
    { displayName: "Bella", colorHex: "#2DD4BF", phone: "+51900000001" },
    { displayName: "Angelie", colorHex: "#FB7185", phone: "+51900000002" },
    { displayName: "Lesly", colorHex: "#FB923C", phone: "+51900000003" },
    { displayName: "Nancy", colorHex: "#38BDF8", phone: "+51900000004" },
  ];

  const staffProfiles = [];
  for (const s of staffData) {
    const user = await prisma.user.upsert({
      where: { phone: s.phone },
      update: {},
      create: {
        phone: s.phone,
        fullName: s.displayName,
        role: "staff",
      },
    });

    const profile = await prisma.staffProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        displayName: s.displayName,
        colorHex: s.colorHex,
      },
    });

    // Turno estándar L-S 09:00-18:00
    for (let weekday = 1; weekday <= 6; weekday++) {
      await prisma.staffSchedule.create({
        data: {
          staffId: profile.id,
          weekday,
          startTime: "09:00",
          endTime: "18:00",
        },
      });
    }

    staffProfiles.push(profile);
  }

  const services = [
    { category: ServiceCategory.unas, name: "Manicura Gel", durationMinutes: 60, priceCents: 18000 },
    { category: ServiceCategory.unas, name: "Manicura Clásica", durationMinutes: 45, priceCents: 12000 },
    { category: ServiceCategory.pestanas, name: "Pestañas Voluptuosas", durationMinutes: 90, priceCents: 15000 },
    { category: ServiceCategory.pestanas, name: "Lifting de Pestañas", durationMinutes: 60, priceCents: 10000 },
    { category: ServiceCategory.cejas, name: "Diseño de Cejas", durationMinutes: 30, priceCents: 5000 },
    { category: ServiceCategory.cejas, name: "Laminado de Cejas", durationMinutes: 45, priceCents: 8000 },
  ];

  const createdServices = [];
  for (const svc of services) {
    const created = await prisma.service.create({ data: svc });
    createdServices.push(created);
  }

  // Todas las especialistas pueden hacer todos los servicios (ajustar luego según habilidades reales)
  for (const staff of staffProfiles) {
    for (const svc of createdServices) {
      await prisma.staffService.create({
        data: { staffId: staff.id, serviceId: svc.id },
      });
    }
  }

  console.log(`Seed completo: ${staffProfiles.length} especialistas, ${createdServices.length} servicios.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

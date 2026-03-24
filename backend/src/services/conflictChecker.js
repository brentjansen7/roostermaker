import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Controleer conflicten voor een specifiek SE-rooster slot
export async function checkSEConflicten(lesId) {
  const les = await prisma.sELes.findUnique({
    where: { id: lesId },
    include: { inschrijvingen: { include: { leerling: true } }, docent: true, lokaal: true },
  });
  if (!les || les.dag === null || les.uur === null) return [];

  const conflicten = [];

  // Check docent dubbel
  if (les.docentId) {
    const docentConflict = await prisma.sELes.findFirst({
      where: {
        id: { not: lesId },
        roosterId: les.roosterId,
        docentId: les.docentId,
        dag: les.dag,
        uur: les.uur,
      },
    });
    if (docentConflict) {
      conflicten.push({ type: 'docent_dubbel', beschrijving: `Docent ${les.docent?.naam} staat dubbel ingepland op dag ${les.dag} uur ${les.uur}` });
    }
  }

  // Check lokaal dubbel
  if (les.lokaalId) {
    const lokaalConflict = await prisma.sELes.findFirst({
      where: {
        id: { not: lesId },
        roosterId: les.roosterId,
        lokaalId: les.lokaalId,
        dag: les.dag,
        uur: les.uur,
      },
    });
    if (lokaalConflict) {
      conflicten.push({ type: 'lokaal_dubbel', beschrijving: `Lokaal ${les.lokaal?.code} is dubbel geboekt op dag ${les.dag} uur ${les.uur}` });
    }
  }

  // Check leerling conflicten (leerling in twee lessen tegelijk)
  const leerlingIds = les.inschrijvingen.map(i => i.leerlingId);
  if (leerlingIds.length > 0) {
    const andereLessen = await prisma.sELes.findMany({
      where: { id: { not: lesId }, roosterId: les.roosterId, dag: les.dag, uur: les.uur },
      include: { inschrijvingen: true },
    });
    for (const andere of andereLessen) {
      const overlap = andere.inschrijvingen.filter(i => leerlingIds.includes(i.leerlingId));
      if (overlap.length > 0) {
        conflicten.push({ type: 'leerling_dubbel', beschrijving: `${overlap.length} leerling(en) staan tegelijk in twee toetsmomenten op dag ${les.dag} uur ${les.uur}` });
        break;
      }
    }
  }

  return conflicten;
}

// Controleer conflicten voor een RoosterSlot
export async function checkSlotConflicten(slotId) {
  const slot = await prisma.roosterSlot.findUnique({
    where: { id: slotId },
    include: { les: { include: { klas: true } }, docent: true, lokaal: true },
  });
  if (!slot) return [];

  const conflicten = [];

  // Verwijder bestaande conflicten voor dit slot
  await prisma.conflict.deleteMany({ where: { slotId } });

  // Check docent dubbel
  if (slot.docentId) {
    const docentConflict = await prisma.roosterSlot.findFirst({
      where: { id: { not: slotId }, roosterId: slot.roosterId, docentId: slot.docentId, dag: slot.dag, uur: slot.uur },
    });
    if (docentConflict) {
      conflicten.push({ slotId, type: 'docent_dubbel', beschrijving: `Docent ${slot.docent?.naam} staat dubbel op dag ${slot.dag} uur ${slot.uur}` });
    }
  }

  // Check lokaal dubbel
  if (slot.lokaalId) {
    const lokaalConflict = await prisma.roosterSlot.findFirst({
      where: { id: { not: slotId }, roosterId: slot.roosterId, lokaalId: slot.lokaalId, dag: slot.dag, uur: slot.uur },
    });
    if (lokaalConflict) {
      conflicten.push({ slotId, type: 'lokaal_dubbel', beschrijving: `Lokaal ${slot.lokaal?.code} is dubbel geboekt op dag ${slot.dag} uur ${slot.uur}` });
    }
  }

  // Check klas dubbel (zelfde klas twee lessen tegelijk)
  if (slot.les?.klasId) {
    const klasConflict = await prisma.roosterSlot.findFirst({
      where: {
        id: { not: slotId },
        roosterId: slot.roosterId,
        dag: slot.dag,
        uur: slot.uur,
        les: { klasId: slot.les.klasId },
      },
    });
    if (klasConflict) {
      conflicten.push({ slotId, type: 'klas_dubbel', beschrijving: `Klas ${slot.les.klas?.naam} heeft twee lessen tegelijk op dag ${slot.dag} uur ${slot.uur}` });
    }
  }

  // Sla nieuwe conflicten op
  if (conflicten.length > 0) {
    await prisma.conflict.createMany({ data: conflicten });
  }

  return conflicten;
}

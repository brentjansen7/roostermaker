import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Eindtijd per uur in minuten (uur 1 = 8:00–9:00, eindtijd = 540 min, etc.)
const UUR_EINDTIJD_MIN = { 1: 540, 2: 600, 3: 660, 4: 720, 5: 780, 6: 840, 7: 900, 8: 960 };

function tijdNaarMinuten(tijd) {
  if (!tijd) return null;
  const [h, m] = tijd.split(':').map(Number);
  return h * 60 + m;
}

const voortgang = new Map();

export function getVoortgang(roosterId) {
  return voortgang.get(roosterId) || { status: 'idle', percent: 0, conflicten: [] };
}

export async function runRoosterAlgoritme(roosterId) {
  voortgang.set(roosterId, { status: 'bezig', percent: 5, conflicten: [] });

  const rooster = await prisma.schoolrooster.findUnique({
    where: { id: roosterId },
    include: {
      klassen: {
        include: {
          lessen: { include: { vak: true } },
        },
      },
    },
  });
  if (!rooster) throw new Error('Schoolrooster niet gevonden');

  const [lokalen, alleDocentVakken] = await Promise.all([
    prisma.lokaal.findMany({ where: { beschikbaar: true } }),
    prisma.docentVak.findMany(),
  ]);

  // vakId -> eerste docentId (één docent per vak)
  const docentVakMap = new Map();
  for (const dv of alleDocentVakken) {
    if (!docentVakMap.has(dv.vakId)) docentVakMap.set(dv.vakId, dv.docentId);
  }

  const tijdslots = genereerTijdslots();

  await prisma.roosterSlot.deleteMany({ where: { roosterId, handmatigGezet: false } });
  await prisma.conflict.deleteMany({ where: { slot: { roosterId } } });

  voortgang.set(roosterId, { status: 'bezig', percent: 10, conflicten: [] });

  const lesLijst = [];
  for (const klas of rooster.klassen) {
    const klasMaxEindtijdMin = tijdNaarMinuten(klas.maxEindtijd);
    for (const les of klas.lessen) {
      const docentId = docentVakMap.get(les.vakId) || null;
      for (let i = 0; i < les.aantalUurPerWeek; i++) {
        lesLijst.push({
          lesId: les.id,
          vakId: les.vakId,
          klasId: les.klasId,
          docentId,
          aantalLeerlingen: klas.aantalLeerlingen,
          vakCode: les.vak.code,
          vakPrioriteit: les.vak.prioriteit ?? 2,
          klasMaxEindtijdMin,
        });
      }
    }
  }

  voortgang.set(roosterId, { status: 'bezig', percent: 20, conflicten: [] });

  const docentBusy = new Map();
  const klasBusy = new Map();
  const lokaalBusy = new Map();

  const handmatigeSlots = await prisma.roosterSlot.findMany({
    where: { roosterId, handmatigGezet: true },
    include: { les: true },
  });
  for (const slot of handmatigeSlots) {
    const key = `${slot.dag}_${slot.uur}`;
    if (slot.docentId) markeerBezet(docentBusy, slot.docentId, key);
    if (slot.les?.klasId) markeerBezet(klasBusy, slot.les.klasId, key);
    if (slot.lokaalId) markeerBezet(lokaalBusy, slot.lokaalId, key);
  }

  const klasLesCount = new Map();
  for (const les of lesLijst) {
    klasLesCount.set(les.klasId, (klasLesCount.get(les.klasId) || 0) + 1);
  }
  lesLijst.sort((a, b) => {
    if (a.vakPrioriteit !== b.vakPrioriteit) return a.vakPrioriteit - b.vakPrioriteit;
    return (klasLesCount.get(b.klasId) || 0) - (klasLesCount.get(a.klasId) || 0);
  });

  let ingepland = 0;
  const totaal = lesLijst.length;
  const toewijzingen = [];
  const nietIngepland = [];

  for (const lesInfo of lesLijst) {
    let gevonden = false;

    for (const { dag, uur } of tijdslots) {
      const key = `${dag}_${uur}`;

      if (klasBusy.get(lesInfo.klasId)?.has(key)) continue;
      if (lesInfo.docentId && docentBusy.get(lesInfo.docentId)?.has(key)) continue;
      if (lesInfo.klasMaxEindtijdMin !== null && UUR_EINDTIJD_MIN[uur] > lesInfo.klasMaxEindtijdMin) continue;

      const lokaal = lokalen.find(l =>
        !lokaalBusy.get(l.id)?.has(key) && l.capaciteit >= lesInfo.aantalLeerlingen
      );
      if (!lokaal) continue;

      toewijzingen.push({ lesInfo, dag, uur, lokaalId: lokaal.id });
      markeerBezet(klasBusy, lesInfo.klasId, key);
      if (lesInfo.docentId) markeerBezet(docentBusy, lesInfo.docentId, key);
      markeerBezet(lokaalBusy, lokaal.id, key);

      ingepland++;
      gevonden = true;
      break;
    }

    if (!gevonden) {
      nietIngepland.push(lesInfo);
    }

    if (ingepland % 10 === 0) {
      voortgang.set(roosterId, { status: 'bezig', percent: 20 + Math.floor((ingepland / totaal) * 70), conflicten: [] });
    }
  }

  await prisma.roosterSlot.createMany({
    data: toewijzingen.map(({ lesInfo, dag, uur, lokaalId }) => ({
      roosterId,
      lesId: lesInfo.lesId,
      docentId: lesInfo.docentId,
      lokaalId,
      dag,
      uur,
    })),
  });

  const conflicten = nietIngepland.map(l => ({
    type: 'niet_ingepland',
    beschrijving: `Les ${l.vakCode} voor klas ${l.klasId} kon niet worden ingepland`,
  }));

  voortgang.set(roosterId, { status: 'klaar', percent: 100, conflicten });

  return {
    aantalSlots: toewijzingen.length,
    aantalNietIngepland: nietIngepland.length,
    aantalConflicten: conflicten.length,
    conflicten,
  };
}

function genereerTijdslots() {
  const slots = [];
  for (let dag = 1; dag <= 5; dag++) {
    for (let uur = 1; uur <= 8; uur++) {
      slots.push({ dag, uur });
    }
  }
  return slots;
}

function markeerBezet(map, id, key) {
  if (!map.has(id)) map.set(id, new Set());
  map.get(id).add(key);
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Voortgang bijhouden (voor polling)
const voortgang = new Map(); // roosterId -> { status, percent, conflicten }

export function getVoortgang(roosterId) {
  return voortgang.get(roosterId) || { status: 'idle', percent: 0, conflicten: [] };
}

// CSP + Simulated Annealing algoritme voor volledig schoolrooster
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
  // Tijdslot-naar-uur mapping: uur 1=8:00, 2=9:00, ..., 8=15:00 (eindtijd = starttijd + 1u)
  const UUR_EINDTIJD = { 1: '09:00', 2: '10:00', 3: '11:00', 4: '12:00', 5: '13:00', 6: '14:00', 7: '15:00', 8: '16:00' };
  if (!rooster) throw new Error('Schoolrooster niet gevonden');

  const lokalen = await prisma.lokaal.findMany({ where: { beschikbaar: true } });
  const tijdslots = genereerTijdslots();

  // Verwijder automatisch geplande slots
  await prisma.roosterSlot.deleteMany({ where: { roosterId, handmatigGezet: false } });
  await prisma.conflict.deleteMany({ where: { slot: { roosterId } } });

  voortgang.set(roosterId, { status: 'bezig', percent: 10, conflicten: [] });

  // Bouw les-lijst: alle lessen × uur/week
  const lesLijst = [];
  for (const klas of rooster.klassen) {
    for (const les of klas.lessen) {
      // Zoek docent voor dit vak in deze klas
      const docentVak = await prisma.docentVak.findFirst({ where: { vakId: les.vakId } });
      for (let i = 0; i < les.aantalUurPerWeek; i++) {
        lesLijst.push({
          lesId: les.id,
          vakId: les.vakId,
          klasId: les.klasId,
          docentId: docentVak?.docentId || null,
          aantalLeerlingen: klas.aantalLeerlingen,
          vakCode: les.vak.code,
          vakPrioriteit: les.vak.prioriteit ?? 2,
          klasMaxEindtijd: klas.maxEindtijd || null, // bijv. "15:30"
        });
      }
    }
  }

  voortgang.set(roosterId, { status: 'bezig', percent: 20, conflicten: [] });

  // Greedy toewijzing met backtracking-inspiratie (simple maar effectief voor deze schaal)
  const toewijzingen = []; // { lesInfo, dag, uur, lokaalId }
  const docentBusy = new Map();
  const klasBusy = new Map();
  const lokaalBusy = new Map();

  // Markeer handmatig geplande slots
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

  // Sorteer lessen: eerst op prioriteit (1=hoog eerst), dan op klasgrootte (MRV)
  const klasLesCount = new Map();
  for (const les of lesLijst) {
    klasLesCount.set(les.klasId, (klasLesCount.get(les.klasId) || 0) + 1);
  }
  lesLijst.sort((a, b) => {
    // Primair: hogere prioriteit (lagere waarde) eerst
    if (a.vakPrioriteit !== b.vakPrioriteit) return a.vakPrioriteit - b.vakPrioriteit;
    // Secundair: klassen met meer lessen eerst (MRV)
    return (klasLesCount.get(b.klasId) || 0) - (klasLesCount.get(a.klasId) || 0);
  });

  let ingepland = 0;
  const totaal = lesLijst.length;
  const nietIngepland = [];

  for (const lesInfo of lesLijst) {
    let gevonden = false;

    for (const { dag, uur } of tijdslots) {
      const key = `${dag}_${uur}`;

      if (klasBusy.get(lesInfo.klasId)?.has(key)) continue;
      if (lesInfo.docentId && docentBusy.get(lesInfo.docentId)?.has(key)) continue;

      // Tijdslimiet check: sla tijdslots over waarbij eindtijd later is dan klasMaxEindtijd
      if (lesInfo.klasMaxEindtijd) {
        const eindtijdSlot = UUR_EINDTIJD[uur];
        if (eindtijdSlot && eindtijdSlot > lesInfo.klasMaxEindtijd) continue;
      }

      const lokaal = lokalen.find(l =>
        !lokaalBusy.get(l.id)?.has(key) && l.capaciteit >= lesInfo.aantalLeerlingen
      );
      if (!lokaal) continue;

      // Plan in
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

    // Voortgang bijwerken elke 10 lessen
    if (ingepland % 10 === 0) {
      const percent = 20 + Math.floor((ingepland / totaal) * 70);
      voortgang.set(roosterId, { status: 'bezig', percent, conflicten: [] });
    }
  }

  // Sla toewijzingen op in database
  for (const { lesInfo, dag, uur, lokaalId } of toewijzingen) {
    await prisma.roosterSlot.create({
      data: {
        roosterId,
        lesId: lesInfo.lesId,
        docentId: lesInfo.docentId,
        lokaalId,
        dag,
        uur,
      },
    });
  }

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

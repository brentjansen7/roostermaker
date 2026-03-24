import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Greedy algoritme voor SE herkansingen
export async function runSEAlgoritme(roosterId) {
  const rooster = await prisma.sERooster.findUnique({
    where: { id: roosterId },
    include: {
      inschrijvingen: {
        include: { leerling: true },
      },
      lessen: {
        where: { handmatigGezet: false },
      },
    },
  });

  if (!rooster) throw new Error('SE Rooster niet gevonden');

  // Haal beschikbare lokalen en tijdslots op
  const lokalen = await prisma.lokaal.findMany({ where: { beschikbaar: true } });
  const tijdslots = genereerTijdslots(); // dag 1-5, uur 1-8

  // Bouw busy-maps
  const docentBusy = new Map(); // docentId -> Set<"dag_uur">
  const lokaalBusy = new Map(); // lokaalId -> Set<"dag_uur">
  const leerlingBusy = new Map(); // leerlingId -> Set<"dag_uur">

  // Markeer handmatig geplande lessen als bezet
  const handmatigeLessen = await prisma.sELes.findMany({
    where: { roosterId, handmatigGezet: true, dag: { not: null }, uur: { not: null } },
    include: { inschrijvingen: true },
  });
  for (const les of handmatigeLessen) {
    const key = `${les.dag}_${les.uur}`;
    if (les.docentId) markeerBezet(docentBusy, les.docentId, key);
    if (les.lokaalId) markeerBezet(lokaalBusy, les.lokaalId, key);
    for (const inschrijving of les.inschrijvingen) {
      markeerBezet(leerlingBusy, inschrijving.leerlingId, key);
    }
  }

  // Verwijder automatisch geplande lessen (gaan opnieuw ingepland worden)
  await prisma.sELes.deleteMany({ where: { roosterId, handmatigGezet: false } });
  await prisma.sEInschrijving.updateMany({
    where: { roosterId, les: { handmatigGezet: false } },
    data: { lesId: null, status: 'ingeschreven' },
  });
  // Update inschrijvingen zonder les
  await prisma.sEInschrijving.updateMany({
    where: { roosterId, lesId: null },
    data: { status: 'ingeschreven' },
  });

  // Groepeer inschrijvingen per vak
  const vakGroepen = new Map();
  for (const inschrijving of rooster.inschrijvingen) {
    if (!vakGroepen.has(inschrijving.vakId)) vakGroepen.set(inschrijving.vakId, []);
    vakGroepen.get(inschrijving.vakId).push(inschrijving);
  }

  // Sorteer vakken op aantal inschrijvingen (meest eerst = MRV)
  const gesorteerdeVakken = [...vakGroepen.entries()].sort((a, b) => b[1].length - a[1].length);

  const aantalIngepland = { lessen: 0, inschrijvingen: 0 };
  const conflicten = [];

  for (const [vakId, inschrijvingen] of gesorteerdeVakken) {
    const vak = inschrijvingen[0].vak;

    // Zoek docent voor dit vak
    const docentVak = await prisma.docentVak.findFirst({
      where: { vakId },
      include: { docent: true },
    });

    // Splits inschrijvingen in groepen op basis van lokaal capaciteit
    const maxPerLes = 30;
    const groepen = [];
    for (let i = 0; i < inschrijvingen.length; i += maxPerLes) {
      groepen.push(inschrijvingen.slice(i, i + maxPerLes));
    }

    for (const groep of groepen) {
      // Zoek een tijdslot waar alle leerlingen vrij zijn
      let ingepland = false;

      for (const { dag, uur } of tijdslots) {
        const key = `${dag}_${uur}`;

        // Check docent beschikbaarheid
        if (docentVak && docentBusy.get(docentVak.docentId)?.has(key)) continue;

        // Check leerling beschikbaarheid
        const leerlingConflict = groep.some(i => leerlingBusy.get(i.leerlingId)?.has(key));
        if (leerlingConflict) continue;

        // Zoek beschikbaar lokaal
        const lokaal = lokalen.find(l => !lokaalBusy.get(l.id)?.has(key) && l.capaciteit >= groep.length);
        if (!lokaal) continue;

        // Plan in!
        const les = await prisma.sELes.create({
          data: {
            roosterId,
            vakId,
            docentId: docentVak?.docentId || null,
            lokaalId: lokaal.id,
            dag,
            uur,
            maxAantal: maxPerLes,
          },
        });

        // Koppel inschrijvingen aan les
        for (const inschrijving of groep) {
          await prisma.sEInschrijving.update({
            where: { id: inschrijving.id },
            data: { lesId: les.id, status: 'ingepland' },
          });
          markeerBezet(leerlingBusy, inschrijving.leerlingId, key);
        }

        if (docentVak) markeerBezet(docentBusy, docentVak.docentId, key);
        markeerBezet(lokaalBusy, lokaal.id, key);

        aantalIngepland.lessen++;
        aantalIngepland.inschrijvingen += groep.length;
        ingepland = true;
        break;
      }

      if (!ingepland) {
        conflicten.push({
          type: 'niet_ingepland',
          beschrijving: `${groep.length} leerling(en) voor ${vak?.naam} konden niet worden ingepland (geen vrij slot gevonden)`,
        });
        await prisma.sEInschrijving.updateMany({
          where: { id: { in: groep.map(i => i.id) } },
          data: { status: 'conflict' },
        });
      }
    }
  }

  return {
    aantalLessen: aantalIngepland.lessen,
    aantalIngepland: aantalIngepland.inschrijvingen,
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

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Greedy + spread-constraint algoritme voor toetsweken
export async function runToetsweekAlgoritme(toetsweekId) {
  const toetsweek = await prisma.toetsweek.findUnique({
    where: { id: toetsweekId },
    include: { deelnames: { include: { leerling: true } }, lessen: { where: { handmatigGezet: false } } },
  });
  if (!toetsweek) throw new Error('Toetsweek niet gevonden');

  const lokalen = await prisma.lokaal.findMany({ where: { beschikbaar: true }, orderBy: { capaciteit: 'desc' } });
  const tijdslots = genereerTijdslots();

  // Verwijder automatisch geplande lessen
  await prisma.toetsLes.deleteMany({ where: { toetsweekId, handmatigGezet: false } });
  await prisma.toetsDeelname.updateMany({
    where: { toetsweekId },
    data: { toetsLesId: null, status: 'ingepland' },
  });

  // Bouw leerling-vak matrix
  const leerlingVakken = new Map(); // leerlingId -> Set<vakId>
  const vakLeerlingen = new Map();  // vakId -> Set<leerlingId>

  for (const deelname of toetsweek.deelnames) {
    if (!leerlingVakken.has(deelname.leerlingId)) leerlingVakken.set(deelname.leerlingId, new Set());
    leerlingVakken.get(deelname.leerlingId).add(deelname.vakId);

    if (!vakLeerlingen.has(deelname.vakId)) vakLeerlingen.set(deelname.vakId, new Set());
    vakLeerlingen.get(deelname.vakId).add(deelname.leerlingId);
  }

  // Bouw vak-conflict-graaf: twee vakken conflicteren als ≥1 leerling beide volgt
  const vakConflicten = new Map(); // vakId -> Set<vakId>
  for (const [leerlingId, vakIds] of leerlingVakken) {
    const vakArray = [...vakIds];
    for (let i = 0; i < vakArray.length; i++) {
      for (let j = i + 1; j < vakArray.length; j++) {
        const a = vakArray[i], b = vakArray[j];
        if (!vakConflicten.has(a)) vakConflicten.set(a, new Set());
        if (!vakConflicten.has(b)) vakConflicten.set(b, new Set());
        vakConflicten.get(a).add(b);
        vakConflicten.get(b).add(a);
      }
    }
  }

  // Bouw busy-maps
  const slotBezet = new Map();    // "dag_uur" -> Set<vakId> (welke vakken zijn op dit slot)
  const docentBusy = new Map();
  const lokaalBusy = new Map();
  const leerlingDagTelling = new Map(); // leerlingId -> Map<dag, aantal>

  // Markeer handmatig geplande lessen
  const handmatigeLessen = await prisma.toetsLes.findMany({
    where: { toetsweekId, handmatigGezet: true, dag: { not: null }, uur: { not: null } },
    include: { deelnames: true },
  });
  for (const les of handmatigeLessen) {
    const key = `${les.dag}_${les.uur}`;
    if (!slotBezet.has(key)) slotBezet.set(key, new Set());
    slotBezet.get(key).add(les.vakId);
    if (les.docentId) markeerBezet(docentBusy, les.docentId, key);
    if (les.lokaalId) markeerBezet(lokaalBusy, les.lokaalId, key);
    for (const d of les.deelnames) {
      telDagOp(leerlingDagTelling, d.leerlingId, les.dag);
    }
  }

  // Sorteer vakken op aantal leerlingen (populairste eerst)
  const gesorteerdeVakken = [...vakLeerlingen.entries()].sort((a, b) => b[1].size - a[1].size);

  const aantalIngepland = { vakken: 0, conflicten: 0 };
  const conflictenLijst = [];

  for (const [vakId, leerlingIds] of gesorteerdeVakken) {
    const leerlingenArray = [...leerlingIds];

    // Zoek docent voor dit vak
    const docentVak = await prisma.docentVak.findFirst({ where: { vakId } });

    // Zoek passend lokaal (grootste beschikbare)
    let ingepland = false;

    for (const { dag, uur } of tijdslots) {
      const key = `${dag}_${uur}`;

      // Check: geen conflicterend vak op dit slot
      const slotVakken = slotBezet.get(key) || new Set();
      const conflicterendVak = [...slotVakken].some(anderVakId => vakConflicten.get(vakId)?.has(anderVakId));
      if (conflicterendVak) continue;

      // Check: docent beschikbaar
      if (docentVak && docentBusy.get(docentVak.docentId)?.has(key)) continue;

      // Check spread-constraint: max 2 toetsen per dag per leerling (soft: versoepel naar 3)
      const maxToetsenPerDag = 2;
      const tellingProbleem = leerlingenArray.some(lId => {
        const telling = leerlingDagTelling.get(lId)?.get(dag) || 0;
        return telling >= maxToetsenPerDag;
      });
      if (tellingProbleem) {
        // Probeer toch met max 3
        const hardProbleem = leerlingenArray.some(lId => {
          const telling = leerlingDagTelling.get(lId)?.get(dag) || 0;
          return telling >= 3;
        });
        if (hardProbleem) continue;
      }

      // Zoek genoeg parallelle lokalen voor alle deelnemers
      const maxPerLokaal = 30;
      const benodigdeLokalen = Math.ceil(leerlingenArray.length / maxPerLokaal);
      const vrijeLokalen = lokalen.filter(l => !lokaalBusy.get(l.id)?.has(key));
      if (vrijeLokalen.length < benodigdeLokalen) continue;
      const gekozenLokalen = vrijeLokalen.slice(0, benodigdeLokalen);

      // Plan in als parallel lessen (één per lokaal)
      const deelnames = toetsweek.deelnames.filter(d => d.vakId === vakId);
      for (let g = 0; g < gekozenLokalen.length; g++) {
        const lokaal = gekozenLokalen[g];
        const groepDeelnames = deelnames.slice(g * maxPerLokaal, (g + 1) * maxPerLokaal);
        if (groepDeelnames.length === 0) break;

        const les = await prisma.toetsLes.create({
          data: {
            toetsweekId,
            vakId,
            docentId: docentVak?.docentId || null,
            lokaalId: lokaal.id,
            dag,
            uur,
          },
        });

        for (const deelname of groepDeelnames) {
          await prisma.toetsDeelname.update({
            where: { id: deelname.id },
            data: { toetsLesId: les.id },
          });
          telDagOp(leerlingDagTelling, deelname.leerlingId, dag);
        }
        markeerBezet(lokaalBusy, lokaal.id, key);
      }

      if (!slotBezet.has(key)) slotBezet.set(key, new Set());
      slotBezet.get(key).add(vakId);
      if (docentVak) markeerBezet(docentBusy, docentVak.docentId, key);

      aantalIngepland.vakken++;
      ingepland = true;
      break;
    }

    if (!ingepland) {
      conflictenLijst.push({ type: 'niet_ingepland', beschrijving: `Vak ${vakId} kon niet worden ingepland` });
      aantalIngepland.conflicten++;
      await prisma.toetsDeelname.updateMany({
        where: { toetsweekId, vakId },
        data: { status: 'conflict' },
      });
    }
  }

  return {
    aantalVakken: aantalIngepland.vakken,
    aantalConflicten: aantalIngepland.conflicten,
    conflicten: conflictenLijst,
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

function telDagOp(map, leerlingId, dag) {
  if (!map.has(leerlingId)) map.set(leerlingId, new Map());
  const dagMap = map.get(leerlingId);
  dagMap.set(dag, (dagMap.get(dag) || 0) + 1);
}

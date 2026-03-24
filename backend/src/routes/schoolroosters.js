import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { runRoosterAlgoritme, getVoortgang } from '../services/roosterAlgoritme.js';
import { checkSlotConflicten } from '../services/conflictChecker.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const roosters = await prisma.schoolrooster.findMany({
      orderBy: { aangemaaktOp: 'desc' },
      include: { _count: { select: { slots: true, klassen: true } } },
    });
    res.json(roosters);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const rooster = await prisma.schoolrooster.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        klassen: { include: { lessen: { include: { vak: true } } } },
        slots: {
          include: {
            les: { include: { vak: true, klas: true } },
            docent: true,
            lokaal: true,
            conflicten: true,
          },
          orderBy: [{ dag: 'asc' }, { uur: 'asc' }],
        },
      },
    });
    if (!rooster) return res.status(404).json({ fout: 'Rooster niet gevonden' });
    res.json(rooster);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { naam, schooljaar } = req.body;
    if (!naam) return res.status(400).json({ fout: 'Naam is verplicht' });
    const rooster = await prisma.schoolrooster.create({
      data: { naam, schooljaar: schooljaar || '2025-2026' },
    });
    res.status(201).json(rooster);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { naam, schooljaar, status } = req.body;
    const rooster = await prisma.schoolrooster.update({
      where: { id: parseInt(req.params.id) },
      data: { naam, schooljaar, status },
    });
    res.json(rooster);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.schoolrooster.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ succes: true });
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Klassen beheer
router.post('/:id/klassen', async (req, res) => {
  try {
    const roosterId = parseInt(req.params.id);
    const { naam, leerjaar, niveau, aantalLeerlingen, maxEindtijd } = req.body;
    const klas = await prisma.klas.create({
      data: { roosterId, naam, leerjaar, niveau, aantalLeerlingen: aantalLeerlingen || 0, maxEindtijd: maxEindtijd || null },
    });
    res.status(201).json(klas);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Klas bijwerken (naam, maxEindtijd, etc.)
router.put('/:id/klassen/:klasId', async (req, res) => {
  try {
    const { naam, leerjaar, niveau, aantalLeerlingen, maxEindtijd } = req.body;
    const data = {};
    if (naam !== undefined) data.naam = naam;
    if (leerjaar !== undefined) data.leerjaar = parseInt(leerjaar, 10);
    if (niveau !== undefined) data.niveau = niveau;
    if (aantalLeerlingen !== undefined) data.aantalLeerlingen = parseInt(aantalLeerlingen, 10);
    if (maxEindtijd !== undefined) data.maxEindtijd = maxEindtijd || null;
    const klas = await prisma.klas.update({
      where: { id: parseInt(req.params.klasId) },
      data,
    });
    res.json(klas);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Lessen toevoegen aan klas
router.post('/:id/klassen/:klasId/lessen', async (req, res) => {
  try {
    const klasId = parseInt(req.params.klasId);
    const { vakId, aantalUurPerWeek } = req.body;
    const les = await prisma.les.create({
      data: { klasId, vakId, aantalUurPerWeek: aantalUurPerWeek || 1 },
    });
    res.status(201).json(les);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Drag-drop: verplaats slot
router.put('/:id/slots/:slotId', async (req, res) => {
  try {
    const slotId = parseInt(req.params.slotId);
    const { dag, uur, docentId, lokaalId } = req.body;
    const slot = await prisma.roosterSlot.update({
      where: { id: slotId },
      data: { dag, uur, docentId, lokaalId, handmatigGezet: true },
      include: {
        les: { include: { vak: true, klas: true } },
        docent: true,
        lokaal: true,
      },
    });
    const conflicten = await checkSlotConflicten(slotId);
    res.json({ slot, conflicten });
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Run algoritme (async)
router.post('/:id/algoritme/run', async (req, res) => {
  const roosterId = parseInt(req.params.id);
  // Start algoritme op de achtergrond
  runRoosterAlgoritme(roosterId).catch(err => {
    console.error('Algoritme fout:', err.message);
  });
  res.json({ gestart: true });
});

// Voortgang polling
router.get('/:id/algoritme/status', (req, res) => {
  const roosterId = parseInt(req.params.id);
  res.json(getVoortgang(roosterId));
});

// Conflicten per rooster
router.get('/:id/conflicten', async (req, res) => {
  try {
    const roosterId = parseInt(req.params.id);
    const conflicten = await prisma.conflict.findMany({
      where: { slot: { roosterId } },
      include: {
        slot: {
          include: { les: { include: { vak: true, klas: true } }, docent: true, lokaal: true },
        },
      },
    });
    res.json(conflicten);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

export default router;

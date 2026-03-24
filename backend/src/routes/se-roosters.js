import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { runSEAlgoritme } from '../services/seAlgoritme.js';
import { checkSEConflicten } from '../services/conflictChecker.js';

const router = Router();
const prisma = new PrismaClient();

// Lijst alle SE roosters
router.get('/', async (req, res) => {
  try {
    const roosters = await prisma.sERooster.findMany({
      orderBy: { aangemaaktOp: 'desc' },
      include: { _count: { select: { lessen: true, inschrijvingen: true } } },
    });
    res.json(roosters);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Haal één SE rooster op
router.get('/:id', async (req, res) => {
  try {
    const rooster = await prisma.sERooster.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        lessen: {
          include: {
            vak: true,
            docent: true,
            lokaal: true,
            inschrijvingen: { include: { leerling: true } },
          },
          orderBy: [{ dag: 'asc' }, { uur: 'asc' }],
        },
        inschrijvingen: {
          include: { leerling: true, vak: true, les: { include: { lokaal: true } } },
        },
      },
    });
    if (!rooster) return res.status(404).json({ fout: 'Rooster niet gevonden' });
    res.json(rooster);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Maak nieuw SE rooster
router.post('/', async (req, res) => {
  try {
    const { naam, schooljaar } = req.body;
    if (!naam) return res.status(400).json({ fout: 'Naam is verplicht' });
    const rooster = await prisma.sERooster.create({
      data: { naam, schooljaar: schooljaar || '2025-2026' },
    });
    res.status(201).json(rooster);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Bewerk SE rooster
router.put('/:id', async (req, res) => {
  try {
    const { naam, schooljaar, status } = req.body;
    const rooster = await prisma.sERooster.update({
      where: { id: parseInt(req.params.id) },
      data: { naam, schooljaar, status },
    });
    res.json(rooster);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Verwijder SE rooster
router.delete('/:id', async (req, res) => {
  try {
    await prisma.sERooster.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ succes: true });
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Voeg inschrijving toe
router.post('/:id/inschrijvingen', async (req, res) => {
  try {
    const roosterId = parseInt(req.params.id);
    const { leerlingId, vakId } = req.body;
    const inschrijving = await prisma.sEInschrijving.upsert({
      where: { roosterId_leerlingId_vakId: { roosterId, leerlingId, vakId } },
      update: {},
      create: { roosterId, leerlingId, vakId },
    });
    res.status(201).json(inschrijving);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Verwijder inschrijving
router.delete('/:id/inschrijvingen/:inschrijvingId', async (req, res) => {
  try {
    await prisma.sEInschrijving.delete({ where: { id: parseInt(req.params.inschrijvingId) } });
    res.json({ succes: true });
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Drag-drop: verplaats SE les
router.put('/:id/lessen/:lesId', async (req, res) => {
  try {
    const lesId = parseInt(req.params.lesId);
    const { dag, uur, docentId, lokaalId } = req.body;
    const les = await prisma.sELes.update({
      where: { id: lesId },
      data: { dag, uur, docentId, lokaalId, handmatigGezet: true },
      include: { vak: true, docent: true, lokaal: true, inschrijvingen: { include: { leerling: true } } },
    });
    const conflicten = await checkSEConflicten(lesId);
    res.json({ les, conflicten });
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Run algoritme
router.post('/:id/algoritme/run', async (req, res) => {
  try {
    const roosterId = parseInt(req.params.id);
    const resultaat = await runSEAlgoritme(roosterId);
    res.json(resultaat);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

export default router;

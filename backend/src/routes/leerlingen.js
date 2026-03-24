import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Lijst alle leerlingen
router.get('/', async (req, res) => {
  try {
    const { klas, niveau, zoek } = req.query;
    const where = {};
    if (klas) where.klas = klas;
    if (niveau) where.niveau = niveau;
    if (zoek) where.naam = { contains: zoek, mode: 'insensitive' };

    const leerlingen = await prisma.leerling.findMany({
      where,
      orderBy: [{ klas: 'asc' }, { naam: 'asc' }],
      include: { _count: { select: { vakken: true } } },
    });
    res.json(leerlingen);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Haal één leerling op
router.get('/:id', async (req, res) => {
  try {
    const leerling = await prisma.leerling.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        vakken: { include: { vak: true } },
      },
    });
    if (!leerling) return res.status(404).json({ fout: 'Leerling niet gevonden' });
    res.json(leerling);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Maak nieuwe leerling aan
router.post('/', async (req, res) => {
  try {
    const { magisterNummer, naam, klas, leerjaar, niveau, email } = req.body;
    if (!naam || !klas || !niveau) return res.status(400).json({ fout: 'Naam, klas en niveau zijn verplicht' });
    const leerling = await prisma.leerling.create({
      data: { magisterNummer: magisterNummer || `M${Date.now()}`, naam, klas, leerjaar: leerjaar || 1, niveau, email },
    });
    res.status(201).json(leerling);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Bewerk leerling
router.put('/:id', async (req, res) => {
  try {
    const { naam, klas, leerjaar, niveau, email } = req.body;
    const leerling = await prisma.leerling.update({
      where: { id: parseInt(req.params.id) },
      data: { naam, klas, leerjaar, niveau, email },
    });
    res.json(leerling);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Verwijder leerling
router.delete('/:id', async (req, res) => {
  try {
    await prisma.leerling.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ succes: true });
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Koppel vakken aan leerling
router.put('/:id/vakken', async (req, res) => {
  try {
    const leerlingId = parseInt(req.params.id);
    const { vakIds } = req.body; // array van vak-IDs
    await prisma.leerlingVak.deleteMany({ where: { leerlingId } });
    if (vakIds && vakIds.length > 0) {
      for (const vakId of vakIds) {
        await prisma.leerlingVak.create({ data: { leerlingId, vakId } });
      }
    }
    res.json({ succes: true });
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Unieke klassen ophalen
router.get('/meta/klassen', async (req, res) => {
  try {
    const klassen = await prisma.leerling.findMany({
      select: { klas: true, niveau: true, leerjaar: true },
      distinct: ['klas'],
      orderBy: { klas: 'asc' },
    });
    res.json(klassen);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

export default router;

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { runToetsweekAlgoritme } from '../services/toetsweekAlgoritme.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const toetsweken = await prisma.toetsweek.findMany({
      orderBy: { aangemaaktOp: 'desc' },
      include: { _count: { select: { lessen: true, deelnames: true } } },
    });
    res.json(toetsweken);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const toetsweek = await prisma.toetsweek.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        lessen: {
          include: {
            vak: true,
            docent: true,
            lokaal: true,
            deelnames: { include: { leerling: { select: { naam: true, klas: true } } } },
          },
          orderBy: [{ dag: 'asc' }, { uur: 'asc' }],
        },
        deelnames: {
          include: { leerling: { select: { naam: true, klas: true } }, vak: true, toetsLes: true },
        },
      },
    });
    if (!toetsweek) return res.status(404).json({ fout: 'Toetsweek niet gevonden' });
    res.json(toetsweek);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { naam, schooljaar, datumVan, datumTot } = req.body;
    if (!naam) return res.status(400).json({ fout: 'Naam is verplicht' });
    const toetsweek = await prisma.toetsweek.create({
      data: { naam, schooljaar: schooljaar || '2025-2026', datumVan, datumTot },
    });
    res.status(201).json(toetsweek);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { naam, schooljaar, datumVan, datumTot, status } = req.body;
    const toetsweek = await prisma.toetsweek.update({
      where: { id: parseInt(req.params.id) },
      data: { naam, schooljaar, datumVan, datumTot, status },
    });
    res.json(toetsweek);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.toetsweek.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ succes: true });
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Bulk deelnames aanmaken vanuit leerling-vak koppelingen
router.post('/:id/deelnames/genereer', async (req, res) => {
  try {
    const toetsweekId = parseInt(req.params.id);
    const { niveaus, leerjaren } = req.body; // filter optioneel

    const where = {};
    if (niveaus?.length) where.niveau = { in: niveaus };
    if (leerjaren?.length) where.leerjaar = { in: leerjaren };

    const leerlingen = await prisma.leerling.findMany({
      where,
      include: { vakken: true },
    });

    let aangemaakt = 0;
    for (const leerling of leerlingen) {
      for (const lv of leerling.vakken) {
        await prisma.toetsDeelname.upsert({
          where: { toetsweekId_leerlingId_vakId: { toetsweekId, leerlingId: leerling.id, vakId: lv.vakId } },
          update: {},
          create: { toetsweekId, leerlingId: leerling.id, vakId: lv.vakId },
        });
        aangemaakt++;
      }
    }
    res.json({ aangemaakt });
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Drag-drop: verplaats toetsles
router.put('/:id/lessen/:lesId', async (req, res) => {
  try {
    const lesId = parseInt(req.params.lesId);
    const { dag, uur, lokaalId } = req.body;
    const les = await prisma.toetsLes.update({
      where: { id: lesId },
      data: { dag, uur, lokaalId, handmatigGezet: true },
      include: { vak: true, lokaal: true, deelnames: { select: { leerling: { select: { naam: true } } } } },
    });
    res.json({ les, conflicten: [] });
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Run algoritme
router.post('/:id/algoritme/run', async (req, res) => {
  try {
    const toetsweekId = parseInt(req.params.id);
    const resultaat = await runToetsweekAlgoritme(toetsweekId);
    res.json(resultaat);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

export default router;

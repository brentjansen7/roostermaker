import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const docenten = await prisma.docent.findMany({
      orderBy: { naam: 'asc' },
      include: { vakken: { include: { vak: true } } },
    });
    res.json(docenten);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const docent = await prisma.docent.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { vakken: { include: { vak: true } } },
    });
    if (!docent) return res.status(404).json({ fout: 'Docent niet gevonden' });
    res.json(docent);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { magisterCode, naam, afkorting, email } = req.body;
    if (!naam || !afkorting) return res.status(400).json({ fout: 'Naam en afkorting zijn verplicht' });
    const docent = await prisma.docent.create({
      data: { magisterCode: magisterCode || afkorting, naam, afkorting, email },
    });
    res.status(201).json(docent);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { naam, afkorting, email } = req.body;
    const docent = await prisma.docent.update({
      where: { id: parseInt(req.params.id) },
      data: { naam, afkorting, email },
    });
    res.json(docent);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.docent.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ succes: true });
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Koppel vakken aan docent
router.put('/:id/vakken', async (req, res) => {
  try {
    const docentId = parseInt(req.params.id);
    const { vakIds } = req.body;
    await prisma.docentVak.deleteMany({ where: { docentId } });
    if (vakIds && vakIds.length > 0) {
      for (const vakId of vakIds) {
        await prisma.docentVak.create({ data: { docentId, vakId } });
      }
    }
    res.json({ succes: true });
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

export default router;

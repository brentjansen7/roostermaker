import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const vakken = await prisma.vak.findMany({
      orderBy: { code: 'asc' },
      include: {
        docenten: { include: { docent: { select: { naam: true, afkorting: true } } } },
        _count: { select: { leerlingen: true } },
      },
    });
    res.json(vakken);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { code, naam, isSeVak, prioriteit } = req.body;
    if (!code || !naam) return res.status(400).json({ fout: 'Code en naam zijn verplicht' });
    const vak = await prisma.vak.create({
      data: { code, naam, isSeVak: isSeVak !== false, prioriteit: prioriteit ?? 2 },
    });
    res.status(201).json(vak);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { code, naam, isSeVak, prioriteit } = req.body;
    const data = {};
    if (code !== undefined) data.code = code;
    if (naam !== undefined) data.naam = naam;
    if (isSeVak !== undefined) data.isSeVak = isSeVak;
    if (prioriteit !== undefined) data.prioriteit = parseInt(prioriteit, 10);
    const vak = await prisma.vak.update({
      where: { id: parseInt(req.params.id, 10) },
      data,
    });
    res.json(vak);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.vak.delete({ where: { id: parseInt(req.params.id, 10) } });
    res.json({ succes: true });
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

export default router;

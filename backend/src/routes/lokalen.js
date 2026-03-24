import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const lokalen = await prisma.lokaal.findMany({ orderBy: { code: 'asc' } });
    res.json(lokalen);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { code, naam, capaciteit, type } = req.body;
    if (!code) return res.status(400).json({ fout: 'Code is verplicht' });
    const lokaal = await prisma.lokaal.create({
      data: { code, naam, capaciteit: capaciteit || 30, type: type || 'normaal' },
    });
    res.status(201).json(lokaal);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { code, naam, capaciteit, type, beschikbaar } = req.body;
    const lokaal = await prisma.lokaal.update({
      where: { id: parseInt(req.params.id) },
      data: { code, naam, capaciteit, type, beschikbaar },
    });
    res.json(lokaal);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.lokaal.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ succes: true });
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

export default router;

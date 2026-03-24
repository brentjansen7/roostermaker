import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { genereerSEZermeloXml, genereerToetsweekZermeloXml, genereerSchoolroosterZermeloXml } from '../services/zermeloExport.js';

const router = Router();
const prisma = new PrismaClient();

// SE Rooster → Zermelo XML
router.get('/se-roosters/:id/zermelo', async (req, res) => {
  try {
    const rooster = await prisma.sERooster.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        lessen: {
          include: {
            vak: true,
            docent: true,
            lokaal: true,
            inschrijvingen: { include: { leerling: { select: { naam: true, klas: true } } } },
          },
        },
      },
    });
    if (!rooster) return res.status(404).json({ fout: 'Rooster niet gevonden' });

    const xml = genereerSEZermeloXml(rooster.lessen);
    const bestandsnaam = `se-rooster-${rooster.naam.replace(/\s+/g, '-')}.xml`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${bestandsnaam}"`);
    res.send(xml);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Toetsweek → Zermelo XML
router.get('/toetsweken/:id/zermelo', async (req, res) => {
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
        },
      },
    });
    if (!toetsweek) return res.status(404).json({ fout: 'Toetsweek niet gevonden' });

    const xml = genereerToetsweekZermeloXml(toetsweek.lessen);
    const bestandsnaam = `toetsweek-${toetsweek.naam.replace(/\s+/g, '-')}.xml`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${bestandsnaam}"`);
    res.send(xml);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Schoolrooster → Zermelo XML
router.get('/schoolroosters/:id/zermelo', async (req, res) => {
  try {
    const rooster = await prisma.schoolrooster.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        slots: {
          include: {
            les: { include: { vak: true, klas: true } },
            docent: true,
            lokaal: true,
          },
        },
      },
    });
    if (!rooster) return res.status(404).json({ fout: 'Rooster niet gevonden' });

    const xml = genereerSchoolroosterZermeloXml(rooster.slots);
    const bestandsnaam = `schoolrooster-${rooster.naam.replace(/\s+/g, '-')}.xml`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${bestandsnaam}"`);
    res.send(xml);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

export default router;

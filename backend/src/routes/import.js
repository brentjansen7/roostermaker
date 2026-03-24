import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { parseCSV, detecteerType, mapLeerlingen, mapDocenten, mapVakken } from '../services/csvParser.js';

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Auto-import: detecteert type automatisch
router.post('/auto', upload.single('bestand'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ fout: 'Geen bestand ontvangen' });

    const tekst = req.file.buffer.toString('utf-8');
    const { headers, rijen } = parseCSV(tekst);

    if (!headers.length || !rijen.length) {
      return res.status(400).json({ fout: 'CSV is leeg of ongeldig formaat' });
    }

    const type = detecteerType(headers);

    let resultaat;
    switch (type) {
      case 'leerlingen':
        resultaat = await importeerLeerlingen(rijen, headers, req.file.originalname);
        break;
      case 'docenten':
        resultaat = await importeerDocenten(rijen, headers, req.file.originalname);
        break;
      case 'vakken':
        resultaat = await importeerVakken(rijen, headers, req.file.originalname);
        break;
      default:
        return res.status(400).json({ fout: 'Kon type niet detecteren. Verwacht: leerlingen, docenten of vakken CSV.' });
    }

    res.json({ type, ...resultaat });
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Leerlingen import
router.post('/leerlingen', upload.single('bestand'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ fout: 'Geen bestand ontvangen' });
    const tekst = req.file.buffer.toString('utf-8');
    const { headers, rijen } = parseCSV(tekst);
    const resultaat = await importeerLeerlingen(rijen, headers, req.file.originalname);
    res.json(resultaat);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Docenten import
router.post('/docenten', upload.single('bestand'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ fout: 'Geen bestand ontvangen' });
    const tekst = req.file.buffer.toString('utf-8');
    const { headers, rijen } = parseCSV(tekst);
    const resultaat = await importeerDocenten(rijen, headers, req.file.originalname);
    res.json(resultaat);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Vakken import
router.post('/vakken', upload.single('bestand'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ fout: 'Geen bestand ontvangen' });
    const tekst = req.file.buffer.toString('utf-8');
    const { headers, rijen } = parseCSV(tekst);
    const resultaat = await importeerVakken(rijen, headers, req.file.originalname);
    res.json(resultaat);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// Import log ophalen
router.get('/logs', async (req, res) => {
  try {
    const logs = await prisma.importLog.findMany({
      orderBy: { aangemaaktOp: 'desc' },
      take: 20,
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ fout: err.message });
  }
});

// ─── Interne import functies ──────────────────────────────────────────────────

async function importeerLeerlingen(rijen, headers, bestandsnaam) {
  const leerlingen = mapLeerlingen(rijen, headers);
  let succes = 0, fouten = 0;
  const foutDetails = [];

  for (const leerling of leerlingen) {
    try {
      await prisma.leerling.upsert({
        where: { magisterNummer: leerling.magisterNummer },
        update: { naam: leerling.naam, klas: leerling.klas, leerjaar: leerling.leerjaar, niveau: leerling.niveau, email: leerling.email },
        create: leerling,
      });
      succes++;
    } catch (err) {
      fouten++;
      foutDetails.push(`${leerling.naam}: ${err.message}`);
    }
  }

  await prisma.importLog.create({
    data: { bestandsnaam, type: 'leerlingen', aantalRijen: rijen.length, succes, fouten, foutDetails: foutDetails.join('\n') || null },
  });

  return { aantalRijen: rijen.length, succes, fouten, foutDetails };
}

async function importeerDocenten(rijen, headers, bestandsnaam) {
  const docenten = mapDocenten(rijen, headers);
  let succes = 0, fouten = 0;
  const foutDetails = [];

  for (const docent of docenten) {
    try {
      await prisma.docent.upsert({
        where: { magisterCode: docent.magisterCode },
        update: { naam: docent.naam, afkorting: docent.afkorting, email: docent.email },
        create: docent,
      });
      succes++;
    } catch (err) {
      fouten++;
      foutDetails.push(`${docent.naam}: ${err.message}`);
    }
  }

  await prisma.importLog.create({
    data: { bestandsnaam, type: 'docenten', aantalRijen: rijen.length, succes, fouten, foutDetails: foutDetails.join('\n') || null },
  });

  return { aantalRijen: rijen.length, succes, fouten, foutDetails };
}

async function importeerVakken(rijen, headers, bestandsnaam) {
  const vakken = mapVakken(rijen, headers);
  let succes = 0, fouten = 0;
  const foutDetails = [];

  for (const vak of vakken) {
    try {
      await prisma.vak.upsert({
        where: { code: vak.code },
        update: { naam: vak.naam },
        create: vak,
      });
      succes++;
    } catch (err) {
      fouten++;
      foutDetails.push(`${vak.code}: ${err.message}`);
    }
  }

  await prisma.importLog.create({
    data: { bestandsnaam, type: 'vakken', aantalRijen: rijen.length, succes, fouten, foutDetails: foutDetails.join('\n') || null },
  });

  return { aantalRijen: rijen.length, succes, fouten, foutDetails };
}

export default router;

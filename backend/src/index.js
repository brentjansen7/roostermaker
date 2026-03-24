import express from 'express';
import cors from 'cors';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { timingSafeEqual } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { PrismaClient } from '@prisma/client';

import leerlingenRoutes from './routes/leerlingen.js';
import docentenRoutes from './routes/docenten.js';
import vakkenRoutes from './routes/vakken.js';
import lokalenRoutes from './routes/lokalen.js';
import seRoostersRoutes from './routes/se-roosters.js';
import toetsweekenRoutes from './routes/toetsweken.js';
import schoolroostersRoutes from './routes/schoolroosters.js';
import importRoutes from './routes/import.js';
import exportRoutes from './routes/export.js';

// Standaard env vars
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'roosterplanner-geheim-2026';
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is niet ingesteld! Voeg een PostgreSQL toe in Railway.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;
const SESSION_SECRET = process.env.SESSION_SECRET;
const isProduction = process.env.NODE_ENV === 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const prisma = new PrismaClient();

// Security headers
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false, // aan in productie, uit lokaal (Vite HMR)
}));

// CORS: alleen toegestane origins
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3001',
  /\.railway\.app$/,
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // curl / server-side requests
    const toegestaan = allowedOrigins.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    cb(toegestaan ? null : new Error('CORS geblokkeerd'), toegestaan);
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.set('trust proxy', 1);

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// Rate limiter: max 10 loginpogingen per 5 minuten per IP
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { fout: 'Te veel pogingen. Probeer het over 5 minuten opnieuw.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function vereistLogin(req, res, next) {
  if (req.session && req.session.ingelogd) return next();
  res.status(401).json({ fout: 'Niet ingelogd' });
}

// Timing-safe wachtwoordvergelijking (voorkomt timing attacks)
function wachtwoordKlopt(ingevoerd, opgeslagen) {
  try {
    const a = Buffer.from(ingevoerd);
    const b = Buffer.from(opgeslagen);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Auth routes
app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { wachtwoord } = req.body;
    if (!wachtwoord || typeof wachtwoord !== 'string') {
      return res.status(400).json({ fout: 'Wachtwoord is verplicht' });
    }
    const instelling = await prisma.instelling.findUnique({ where: { sleutel: 'beheer_wachtwoord' } });
    const juistWachtwoord = instelling?.waarde || 'rooster2026';
    if (wachtwoordKlopt(wachtwoord, juistWachtwoord)) {
      req.session.ingelogd = true;
      res.json({ succes: true });
    } else {
      res.status(401).json({ fout: 'Verkeerd wachtwoord' });
    }
  } catch (err) {
    console.error('Login fout:', err);
    res.status(500).json({ fout: 'Serverfout' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ succes: true });
});

app.get('/api/auth-status', (req, res) => {
  res.json({ ingelogd: !!(req.session && req.session.ingelogd) });
});

// Setup status — antwoordt altijd 200 zodat Railway health check slaagt
app.get('/api/setup-status', async (req, res) => {
  try {
    const schoolnaam = await prisma.instelling.findUnique({ where: { sleutel: 'schoolnaam' } });
    res.json({ klaar: !!(schoolnaam && schoolnaam.waarde) });
  } catch {
    // DB nog niet klaar (bijv. schema sync loopt nog) — geef toch 200 terug
    res.json({ klaar: false, dbNietKlaar: true });
  }
});

// Setup eerste keer
app.post('/api/setup', async (req, res) => {
  try {
    const { schoolnaam, wachtwoord } = req.body;
    if (!schoolnaam || typeof schoolnaam !== 'string' || !schoolnaam.trim()) {
      return res.status(400).json({ fout: 'Schoolnaam is verplicht' });
    }
    await prisma.instelling.upsert({
      where: { sleutel: 'schoolnaam' },
      update: { waarde: schoolnaam.trim() },
      create: { sleutel: 'schoolnaam', waarde: schoolnaam.trim() },
    });
    if (wachtwoord && typeof wachtwoord === 'string' && wachtwoord.length >= 6) {
      await prisma.instelling.upsert({
        where: { sleutel: 'beheer_wachtwoord' },
        update: { waarde: wachtwoord },
        create: { sleutel: 'beheer_wachtwoord', waarde: wachtwoord },
      });
    }
    req.session.ingelogd = true;
    res.json({ succes: true });
  } catch (err) {
    console.error('Setup fout:', err);
    res.status(500).json({ fout: 'Serverfout' });
  }
});

// Protected routes
app.use('/api/leerlingen', vereistLogin, leerlingenRoutes);
app.use('/api/docenten', vereistLogin, docentenRoutes);
app.use('/api/vakken', vereistLogin, vakkenRoutes);
app.use('/api/lokalen', vereistLogin, lokalenRoutes);
app.use('/api/se-roosters', vereistLogin, seRoostersRoutes);
app.use('/api/toetsweken', vereistLogin, toetsweekenRoutes);
app.use('/api/schoolroosters', vereistLogin, schoolroostersRoutes);
app.use('/api/import', vereistLogin, importRoutes);
app.use('/api/export', vereistLogin, exportRoutes);

// Serve built frontend in production
const publicDir = join(__dirname, '../public');
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res) => {
    res.sendFile(join(publicDir, 'index.html'));
  });
}

// Server DIRECT starten — health check mag niet afhankelijk zijn van schema sync
app.listen(PORT, () => {
  console.log(`Roosterplanner backend draait op poort ${PORT}`);
});

// Schema aanmaken/bijwerken op de achtergrond (niet fataal)
async function autoMigreer() {
  const run = (sql) => prisma.$executeRawUnsafe(sql);

  // Tabellen aanmaken als ze nog niet bestaan (volgorde op FK-afhankelijkheden)
  await run(`CREATE TABLE IF NOT EXISTS "instellingen" ("sleutel" TEXT NOT NULL PRIMARY KEY, "waarde" TEXT NOT NULL)`);
  await run(`CREATE TABLE IF NOT EXISTS "import_logs" ("id" SERIAL PRIMARY KEY, "bestandsnaam" TEXT NOT NULL, "type" TEXT NOT NULL, "aantalRijen" INTEGER NOT NULL, "succes" INTEGER NOT NULL, "fouten" INTEGER NOT NULL, "foutDetails" TEXT, "aangemaaktOp" TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await run(`CREATE TABLE IF NOT EXISTS "leerlingen" ("id" SERIAL PRIMARY KEY, "magisterNummer" TEXT NOT NULL, "naam" TEXT NOT NULL, "klas" TEXT NOT NULL, "leerjaar" INTEGER NOT NULL, "niveau" TEXT NOT NULL, "email" TEXT, "aangemaaktOp" TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "leerlingen_magisterNummer_key" ON "leerlingen"("magisterNummer")`);
  await run(`CREATE TABLE IF NOT EXISTS "docenten" ("id" SERIAL PRIMARY KEY, "magisterCode" TEXT NOT NULL, "naam" TEXT NOT NULL, "afkorting" TEXT NOT NULL, "email" TEXT, "aangemaaktOp" TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "docenten_magisterCode_key" ON "docenten"("magisterCode")`);
  await run(`CREATE TABLE IF NOT EXISTS "vakken" ("id" SERIAL PRIMARY KEY, "code" TEXT NOT NULL, "naam" TEXT NOT NULL, "isSeVak" BOOLEAN NOT NULL DEFAULT true, "prioriteit" INTEGER NOT NULL DEFAULT 2)`);
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "vakken_code_key" ON "vakken"("code")`);
  await run(`CREATE TABLE IF NOT EXISTS "lokalen" ("id" SERIAL PRIMARY KEY, "code" TEXT NOT NULL, "naam" TEXT, "capaciteit" INTEGER NOT NULL DEFAULT 30, "type" TEXT NOT NULL DEFAULT 'normaal', "beschikbaar" BOOLEAN NOT NULL DEFAULT true)`);
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "lokalen_code_key" ON "lokalen"("code")`);
  await run(`CREATE TABLE IF NOT EXISTS "docent_vakken" ("docentId" INTEGER NOT NULL, "vakId" INTEGER NOT NULL, PRIMARY KEY ("docentId", "vakId"), FOREIGN KEY ("docentId") REFERENCES "docenten"("id") ON DELETE CASCADE, FOREIGN KEY ("vakId") REFERENCES "vakken"("id") ON DELETE CASCADE)`);
  await run(`CREATE TABLE IF NOT EXISTS "leerling_vakken" ("leerlingId" INTEGER NOT NULL, "vakId" INTEGER NOT NULL, PRIMARY KEY ("leerlingId", "vakId"), FOREIGN KEY ("leerlingId") REFERENCES "leerlingen"("id") ON DELETE CASCADE, FOREIGN KEY ("vakId") REFERENCES "vakken"("id") ON DELETE CASCADE)`);
  await run(`CREATE TABLE IF NOT EXISTS "se_roosters" ("id" SERIAL PRIMARY KEY, "naam" TEXT NOT NULL, "schooljaar" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'concept', "aangemaaktOp" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "bijgewerktOp" TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await run(`CREATE TABLE IF NOT EXISTS "toetsweken" ("id" SERIAL PRIMARY KEY, "naam" TEXT NOT NULL, "schooljaar" TEXT NOT NULL, "datumVan" TEXT, "datumTot" TEXT, "status" TEXT NOT NULL DEFAULT 'concept', "aangemaaktOp" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "bijgewerktOp" TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await run(`CREATE TABLE IF NOT EXISTS "schoolroosters" ("id" SERIAL PRIMARY KEY, "naam" TEXT NOT NULL, "schooljaar" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'concept', "aangemaaktOp" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "bijgewerktOp" TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await run(`CREATE TABLE IF NOT EXISTS "se_lessen" ("id" SERIAL PRIMARY KEY, "roosterId" INTEGER NOT NULL, "vakId" INTEGER NOT NULL, "docentId" INTEGER, "lokaalId" INTEGER, "dag" INTEGER, "uur" INTEGER, "datum" TEXT, "maxAantal" INTEGER NOT NULL DEFAULT 30, "handmatigGezet" BOOLEAN NOT NULL DEFAULT false, FOREIGN KEY ("roosterId") REFERENCES "se_roosters"("id") ON DELETE CASCADE, FOREIGN KEY ("vakId") REFERENCES "vakken"("id"), FOREIGN KEY ("docentId") REFERENCES "docenten"("id") ON DELETE SET NULL, FOREIGN KEY ("lokaalId") REFERENCES "lokalen"("id") ON DELETE SET NULL)`);
  await run(`CREATE TABLE IF NOT EXISTS "se_inschrijvingen" ("id" SERIAL PRIMARY KEY, "roosterId" INTEGER NOT NULL, "leerlingId" INTEGER NOT NULL, "vakId" INTEGER NOT NULL, "lesId" INTEGER, "status" TEXT NOT NULL DEFAULT 'ingeschreven', FOREIGN KEY ("roosterId") REFERENCES "se_roosters"("id") ON DELETE CASCADE, FOREIGN KEY ("leerlingId") REFERENCES "leerlingen"("id"), FOREIGN KEY ("vakId") REFERENCES "vakken"("id"), FOREIGN KEY ("lesId") REFERENCES "se_lessen"("id") ON DELETE SET NULL)`);
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "se_inschrijvingen_roosterId_leerlingId_vakId_key" ON "se_inschrijvingen"("roosterId","leerlingId","vakId")`);
  await run(`CREATE TABLE IF NOT EXISTS "toets_lessen" ("id" SERIAL PRIMARY KEY, "toetsweekId" INTEGER NOT NULL, "vakId" INTEGER NOT NULL, "docentId" INTEGER, "lokaalId" INTEGER, "dag" INTEGER, "uur" INTEGER, "handmatigGezet" BOOLEAN NOT NULL DEFAULT false, FOREIGN KEY ("toetsweekId") REFERENCES "toetsweken"("id") ON DELETE CASCADE, FOREIGN KEY ("vakId") REFERENCES "vakken"("id"), FOREIGN KEY ("docentId") REFERENCES "docenten"("id") ON DELETE SET NULL, FOREIGN KEY ("lokaalId") REFERENCES "lokalen"("id") ON DELETE SET NULL)`);
  await run(`CREATE TABLE IF NOT EXISTS "toets_deelnames" ("id" SERIAL PRIMARY KEY, "toetsweekId" INTEGER NOT NULL, "leerlingId" INTEGER NOT NULL, "vakId" INTEGER NOT NULL, "toetsLesId" INTEGER, "status" TEXT NOT NULL DEFAULT 'ingepland', FOREIGN KEY ("toetsweekId") REFERENCES "toetsweken"("id") ON DELETE CASCADE, FOREIGN KEY ("leerlingId") REFERENCES "leerlingen"("id"), FOREIGN KEY ("vakId") REFERENCES "vakken"("id"), FOREIGN KEY ("toetsLesId") REFERENCES "toets_lessen"("id") ON DELETE SET NULL)`);
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS "toets_deelnames_toetsweekId_leerlingId_vakId_key" ON "toets_deelnames"("toetsweekId","leerlingId","vakId")`);
  await run(`CREATE TABLE IF NOT EXISTS "klassen" ("id" SERIAL PRIMARY KEY, "roosterId" INTEGER NOT NULL, "naam" TEXT NOT NULL, "leerjaar" INTEGER NOT NULL, "niveau" TEXT NOT NULL, "aantalLeerlingen" INTEGER NOT NULL DEFAULT 0, "maxEindtijd" TEXT, FOREIGN KEY ("roosterId") REFERENCES "schoolroosters"("id") ON DELETE CASCADE)`);
  await run(`CREATE TABLE IF NOT EXISTS "lessen" ("id" SERIAL PRIMARY KEY, "klasId" INTEGER NOT NULL, "vakId" INTEGER NOT NULL, "aantalUurPerWeek" INTEGER NOT NULL DEFAULT 1, FOREIGN KEY ("klasId") REFERENCES "klassen"("id") ON DELETE CASCADE, FOREIGN KEY ("vakId") REFERENCES "vakken"("id"))`);
  await run(`CREATE TABLE IF NOT EXISTS "rooster_slots" ("id" SERIAL PRIMARY KEY, "roosterId" INTEGER NOT NULL, "lesId" INTEGER, "docentId" INTEGER, "lokaalId" INTEGER, "dag" INTEGER NOT NULL, "uur" INTEGER NOT NULL, "handmatigGezet" BOOLEAN NOT NULL DEFAULT false, FOREIGN KEY ("roosterId") REFERENCES "schoolroosters"("id") ON DELETE CASCADE, FOREIGN KEY ("lesId") REFERENCES "lessen"("id") ON DELETE SET NULL, FOREIGN KEY ("docentId") REFERENCES "docenten"("id") ON DELETE SET NULL, FOREIGN KEY ("lokaalId") REFERENCES "lokalen"("id") ON DELETE SET NULL)`);
  await run(`CREATE TABLE IF NOT EXISTS "leerling_slots" ("leerlingId" INTEGER NOT NULL, "slotId" INTEGER NOT NULL, PRIMARY KEY ("leerlingId","slotId"), FOREIGN KEY ("leerlingId") REFERENCES "leerlingen"("id") ON DELETE CASCADE, FOREIGN KEY ("slotId") REFERENCES "rooster_slots"("id") ON DELETE CASCADE)`);
  await run(`CREATE TABLE IF NOT EXISTS "conflicten" ("id" SERIAL PRIMARY KEY, "slotId" INTEGER NOT NULL, "type" TEXT NOT NULL, "beschrijving" TEXT NOT NULL, "opgelost" BOOLEAN NOT NULL DEFAULT false, FOREIGN KEY ("slotId") REFERENCES "rooster_slots"("id") ON DELETE CASCADE)`);

  // Kolommen toevoegen als ze nog niet bestaan (voor bestaande databases)
  await run(`ALTER TABLE "vakken" ADD COLUMN IF NOT EXISTS "prioriteit" INTEGER NOT NULL DEFAULT 2`);
  await run(`ALTER TABLE "klassen" ADD COLUMN IF NOT EXISTS "maxEindtijd" TEXT`);

  console.log('Schema klaar.');
}

autoMigreer().catch(err => console.error('Schema fout (niet fataal):', err.message));

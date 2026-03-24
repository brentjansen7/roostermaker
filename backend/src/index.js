import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

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

const app = express();
const PORT = process.env.PORT || 3001;
const SESSION_SECRET = process.env.SESSION_SECRET || 'roosterplanner-geheim';
const isProduction = process.env.NODE_ENV === 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const prisma = new PrismaClient();

const allowedOrigins = [FRONTEND_URL, /\.railway\.app$/, /\.up\.railway\.app$/];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin))) return cb(null, true);
    cb(null, true); // open in production achter Railway proxy
  },
  credentials: true,
}));
app.use(express.json());
app.set('trust proxy', 1);
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

function vereistLogin(req, res, next) {
  if (req.session && req.session.ingelogd) return next();
  res.status(401).json({ fout: 'Niet ingelogd' });
}

// Auth routes
app.post('/api/login', async (req, res) => {
  try {
    const { wachtwoord } = req.body;
    const instelling = await prisma.instelling.findUnique({ where: { sleutel: 'beheer_wachtwoord' } });
    const juistWachtwoord = instelling ? instelling.waarde : 'rooster2026';
    if (wachtwoord === juistWachtwoord) {
      req.session.ingelogd = true;
      res.json({ succes: true });
    } else {
      res.status(401).json({ fout: 'Verkeerd wachtwoord' });
    }
  } catch (err) {
    res.status(500).json({ fout: 'Serverfout: ' + err.message });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ succes: true });
});

app.get('/api/auth-status', (req, res) => {
  res.json({ ingelogd: !!(req.session && req.session.ingelogd) });
});

// Setup status (is de school al ingericht?)
app.get('/api/setup-status', async (req, res) => {
  const schoolnaam = await prisma.instelling.findUnique({ where: { sleutel: 'schoolnaam' } });
  res.json({ klaar: !!(schoolnaam && schoolnaam.waarde) });
});

// Setup eerste keer
app.post('/api/setup', async (req, res) => {
  const { schoolnaam, wachtwoord } = req.body;
  if (!schoolnaam) return res.status(400).json({ fout: 'Schoolnaam is verplicht' });
  await prisma.instelling.upsert({
    where: { sleutel: 'schoolnaam' },
    update: { waarde: schoolnaam },
    create: { sleutel: 'schoolnaam', waarde: schoolnaam },
  });
  if (wachtwoord) {
    await prisma.instelling.upsert({
      where: { sleutel: 'beheer_wachtwoord' },
      update: { waarde: wachtwoord },
      create: { sleutel: 'beheer_wachtwoord', waarde: wachtwoord },
    });
  }
  req.session.ingelogd = true;
  res.json({ succes: true });
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

app.listen(PORT, () => {
  console.log(`Roosterplanner backend draait op poort ${PORT}`);
});

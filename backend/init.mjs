import { execSync, spawn } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const env = {
  ...process.env,
  SESSION_SECRET: process.env.SESSION_SECRET || 'roosterplanner-geheim-2026',
  PORT:           process.env.PORT           || '3001',
  FRONTEND_URL:   process.env.FRONTEND_URL   || 'http://localhost:5173',
};

if (!env.DATABASE_URL) {
  console.error('DATABASE_URL ontbreekt — voeg PostgreSQL toe in Railway.');
  process.exit(1);
}
const dbUrl = env.DATABASE_URL;
const isPostgres = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');
console.log('DATABASE_URL begint met:', dbUrl.slice(0, 20) + '...');
if (!isPostgres) {
  console.error('DATABASE_URL is geen PostgreSQL URL! Verwijder handmatig DATABASE_URL in Railway variabelen en herverbind de PostgreSQL plugin.');
  console.error('Huidige waarde begint met:', dbUrl.slice(0, 30));
  process.exit(1);
}
console.log('Database:', dbUrl.split('@')[1] || 'lokaal');

const opts = { cwd: __dirname, env, stdio: 'inherit' };

// Schema synchroniseren (aanmaken/bijwerken tabellen)
try {
  console.log('Schema sync starten...');
  execSync('npx prisma db push --accept-data-loss', opts);
  console.log('Schema sync klaar.');
} catch (err) {
  console.error('Schema sync mislukt:', err.message?.slice(0, 500));
}

// Seed data (niet fataal)
try {
  execSync('node src/seed.js', opts);
} catch (err) {
  console.error('Seed mislukt (niet fataal):', err.message?.slice(0, 200));
}

// Start server en forward signalen zodat Railway de app netjes kan stoppen
const server = spawn('node', ['src/index.js'], { ...opts, stdio: 'inherit' });
process.on('SIGTERM', () => server.kill('SIGTERM'));
process.on('SIGINT',  () => server.kill('SIGINT'));
server.on('exit', code => process.exit(code ?? 0));

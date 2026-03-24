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

// DATABASE_URL diagnostiek — nooit process.exit zodat de server altijd start
let dbUrl = env.DATABASE_URL || '';
const isPostgres = (u) => u.startsWith('postgresql://') || u.startsWith('postgres://');

if (!isPostgres(dbUrl)) {
  const { PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD } = env;
  if (PGHOST && PGUSER && PGDATABASE) {
    const port = PGPORT || '5432';
    const pw   = PGPASSWORD ? encodeURIComponent(PGPASSWORD) : '';
    dbUrl = `postgresql://${PGUSER}:${pw}@${PGHOST}:${port}/${PGDATABASE}`;
    env.DATABASE_URL = dbUrl;
    console.log('DATABASE_URL samengesteld vanuit PG* variabelen:', PGHOST);
  } else {
    console.error('WAARSCHUWING: geen geldige DATABASE_URL of PG* variabelen gevonden.');
    console.error('Beschikbare env keys (DB-gerelateerd):',
      Object.keys(env).filter(k => k.includes('PG') || k.includes('DB') || k.includes('DATABASE') || k.includes('POSTGRES')).join(', ') || '(geen)'
    );
    // Geen exit — server start toch, health check slaagt, setup-status toont de fout
  }
} else {
  console.log('Database host:', dbUrl.split('@')[1]?.split('/')[0] || 'lokaal');
}

const opts = { cwd: __dirname, env, stdio: 'inherit' };

// Schema synchroniseren (niet fataal)
if (isPostgres(dbUrl)) {
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
}

// Start server altijd — health check moet slagen
const server = spawn('node', ['src/index.js'], { ...opts, stdio: 'inherit' });
process.on('SIGTERM', () => server.kill('SIGTERM'));
process.on('SIGINT',  () => server.kill('SIGINT'));
server.on('exit', code => process.exit(code ?? 0));

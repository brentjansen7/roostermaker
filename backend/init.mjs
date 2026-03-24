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
    console.error('Env keys (DB):', Object.keys(env).filter(k =>
      k.includes('PG') || k.includes('DATABASE') || k.includes('POSTGRES')
    ).join(', ') || '(geen)');
  }
} else {
  console.log('Database host:', dbUrl.split('@')[1]?.split('/')[0] || 'lokaal');
}

const opts = { cwd: __dirname, env, stdio: 'inherit' };

// Start server DIRECT — health check mag niet wachten op schema sync
const server = spawn('node', ['src/index.js'], { ...opts, stdio: 'inherit' });
process.on('SIGTERM', () => server.kill('SIGTERM'));
process.on('SIGINT',  () => server.kill('SIGINT'));
server.on('exit', code => process.exit(code ?? 0));

// Schema sync + seed ASYNCHROON na serverstart (niet blokkerend)
if (isPostgres(dbUrl)) {
  setTimeout(() => {
    try {
      console.log('Schema sync starten (achtergrond)...');
      execSync('npx prisma db push --accept-data-loss', { ...opts, timeout: 120000 });
      console.log('Schema sync klaar.');
    } catch (err) {
      console.error('Schema sync mislukt:', err.message?.slice(0, 300));
    }
    try {
      execSync('node src/seed.js', opts);
      console.log('Seed klaar.');
    } catch (err) {
      console.error('Seed mislukt:', err.message?.slice(0, 200));
    }
  }, 2000); // 2 sec wachten zodat server zeker luistert voor health check
}

import { execSync, spawn } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const env = {
  ...process.env,
  DATABASE_URL:   process.env.DATABASE_URL   || 'file:/tmp/dev.db',
  SESSION_SECRET: process.env.SESSION_SECRET || 'roosterplanner-geheim-2026',
  PORT:           process.env.PORT           || '3001',
  FRONTEND_URL:   process.env.FRONTEND_URL   || 'http://localhost:5173',
};

console.log('DATABASE_URL:', env.DATABASE_URL);

const opts = { cwd: __dirname, env, stdio: 'inherit' };

execSync('npx prisma migrate deploy', opts);
execSync('node src/seed.js', opts);

// Start server en forward signalen zodat Railway de app netjes kan stoppen
const server = spawn('node', ['src/index.js'], { ...opts, stdio: 'inherit' });
process.on('SIGTERM', () => server.kill('SIGTERM'));
process.on('SIGINT',  () => server.kill('SIGINT'));
server.on('exit', code => process.exit(code ?? 0));

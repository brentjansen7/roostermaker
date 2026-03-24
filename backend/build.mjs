import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendDir = join(__dirname, '../frontend');
const publicDir = join(__dirname, 'public');

console.log('Frontend installeren...');
execSync('npm install', { cwd: frontendDir, stdio: 'inherit' });

console.log('Frontend bouwen...');
execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });

console.log('Kopiëren naar backend/public...');
if (!existsSync(publicDir)) mkdirSync(publicDir);
cpSync(join(frontendDir, 'dist'), publicDir, { recursive: true });

console.log('Build klaar!');

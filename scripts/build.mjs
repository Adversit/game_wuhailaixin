import { cp, mkdir, readFile, rm, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const at = p => resolve(root, p);
const hosting = JSON.parse(await readFile(at('.openai/hosting.json'), 'utf8'));
if (hosting.static || hosting.d1 !== 'DB') throw new Error('Cloud saves require a Worker and logical DB binding');
for (const dir of ['dist/client', 'dist/server', 'dist/.openai']) await rm(at(dir), {recursive: true, force: true});
for (const dir of ['dist/client', 'dist/server/db', 'dist/server/shared', 'dist/.openai']) await mkdir(at(dir), {recursive: true});
for (const file of ['index.html', 'app.js', 'game.js', 'cloud-save.js', 'save-format.js', 'style.css', 'favicon.svg', 'assets']) {
  await cp(at('dist/' + file), at('dist/client/' + file), {recursive: true});
}
for (const file of ['game.js', 'save-format.js']) await cp(at('dist/' + file), at('dist/server/shared/' + file));
await cp(at('db/game-save.js'), at('dist/server/db/game-save.js'));
for (const file of ['worker.js', 'auth.js', 'api.js']) {
  const source = (await readFile(at('server/' + file), 'utf8'))
    .replace("'../db/game-save.js'", "'./db/game-save.js'")
    .replace("'../dist/save-format.js'", "'./shared/save-format.js'");
  await writeFile(at('dist/server/' + (file === 'worker.js' ? 'index.js' : file)), source);
}
await access(at('drizzle/meta/_journal.json'));
await cp(at('drizzle'), at('dist/.openai/drizzle'), {recursive: true});
await cp(at('.openai/hosting.json'), at('dist/.openai/hosting.json'));
await writeFile(at('dist/server/wrangler.json'), JSON.stringify({
  name: 'mistbound-letters', main: 'index.js', compatibility_date: '2026-09-29',
  workers_dev: false,
  assets: {directory: '../client', binding: 'ASSETS', run_worker_first: ['/api/*']},
  d1_databases: [{binding: 'DB', database_name: 'mistbound-letters-local', database_id: '00000000-0000-0000-0000-000000000000', migrations_dir: '../.openai/drizzle'}],
}, null, 2) + '\n');
const worker = (await import(at('dist/server/index.js'))).default;
if (typeof worker?.fetch !== 'function') throw new Error('Worker must export default.fetch');
console.log('Built Worker, client assets and D1 migrations.');

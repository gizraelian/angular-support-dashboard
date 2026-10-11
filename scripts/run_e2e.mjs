// Owns a fresh local-only Compose project. Never reads operator credentials or resolved Compose secrets.
import { randomBytes } from 'node:crypto';
import { spawnSync, spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
const front = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const back = resolve(process.env.M5_BACKEND_REPO || resolve(front, '../Spring Work Order API'));
if (
  !existsSync(resolve(back, 'compose.local-browser.yaml')) ||
  !existsSync(resolve(back, 'target/work-order-api-0.0.1-SNAPSHOT.jar'))
) {
  throw new Error(
    'Set M5_BACKEND_REPO to the reviewed backend checkout and run its Maven clean verify first.',
  );
}
if (process.env.DEBUG || process.env.PWDEBUG)
  throw new Error('Disable debug logging before authentication tests.');
for (const port of [8080, 4200])
  await new Promise((ok, fail) => {
    const server = net
      .createServer()
      .once('error', () =>
        fail(new Error(`Local port ${port} occupied; no existing service will be reused.`)),
      );
    server.listen(port, '127.0.0.1', () => server.close(ok));
  });
const project = 'workorder-m5-' + randomBytes(6).toString('hex');
const environment = { ...process.env };
for (const key of Object.keys(environment)) {
  if (key.startsWith('LOCAL_') || key.startsWith('COMPOSE_') || key.startsWith('M5_'))
    delete environment[key];
}
Object.assign(environment, {
  LOCAL_DB_USERNAME: 'm5_fixture',
  LOCAL_DB_PASSWORD: randomBytes(24).toString('hex'),
  LOCAL_APP_USERNAME: 'm5_fixture',
  LOCAL_APP_PASSWORD: randomBytes(24).toString('hex'),
  LOCAL_BROWSER_ENABLED: 'true',
  LOCAL_BROWSER_SESSION_TIMEOUT: '1m',
  LOCAL_DEMO_SEED: 'false',
  M5_PROJECT: project,
  M5_BACKEND_REPO: back,
});
// No credentials on command lines or in persisted .env files.
const temporary = mkdtempSync(resolve(tmpdir(), 'workorder-m5-'));
const envFile = resolve(temporary, 'empty.env');
writeFileSync(envFile, '');
const override = resolve(temporary, 'image.yaml');
writeFileSync(override, `services:\n  api:\n    image: spring-work-order-api:${project}\n`);
const compose = [
  'compose',
  '--env-file',
  envFile,
  '-p',
  project,
  '-f',
  'compose.yaml',
  '-f',
  'compose.local-browser.yaml',
  '-f',
  override,
];
function run(command, args, cwd = back, allowFailure = false) {
  const result = spawnSync(command, args, {
    cwd,
    env: environment,
    encoding: 'utf8',
    timeout: 300_000,
  });
  if (!allowFailure && (result.error || result.status !== 0))
    throw new Error(`M5 command failed: ${command} (output withheld)`);
  return result;
}
let created = false;
let exitCode = 1;
try {
  if (run('docker', ['volume', 'inspect', project + '_postgres-data'], back, true).status === 0)
    throw new Error('Refusing existing volume');
  run('docker', ['build', '-t', `spring-work-order-api:${project}`, '.']);
  created = true;
  run('docker', [...compose, 'up', '-d', '--no-build', '--wait', '--wait-timeout', '180']);
  const api = run('docker', [...compose, 'ps', '-q', 'api']).stdout.trim();
  const db = run('docker', [...compose, 'ps', '-q', 'db']).stdout.trim();
  const bindings = JSON.parse(
    run('docker', ['inspect', '--format', '{{json .HostConfig.PortBindings}}', api]).stdout,
  );
  if (
    JSON.stringify(bindings) !==
    JSON.stringify({ '8080/tcp': [{ HostIp: '127.0.0.1', HostPort: '8080' }] })
  )
    throw new Error('Non-loopback API');
  if (
    Object.keys(
      JSON.parse(
        run('docker', ['inspect', '--format', '{{json .HostConfig.PortBindings}}', db]).stdout,
      ) || {},
    ).length
  )
    throw new Error('Published database');
  environment.M5_DB_CONTAINER = db;
  environment.M5_USERNAME = environment.LOCAL_APP_USERNAME;
  environment.M5_PASSWORD = environment.LOCAL_APP_PASSWORD;
  console.log(
    'M5: fresh isolated PostgreSQL; loopback API; 1-minute inactivity; safe artifacts only.',
  );
  exitCode = await new Promise((ok, fail) => {
    const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], {
      cwd: front,
      env: environment,
      stdio: 'inherit',
    });
    child.once('error', fail);
    child.once('exit', (code) => ok(code ?? 1));
  });

  const output = resolve(front, 'test-results');
  function scrub(directory) {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) scrub(path);
      else if (
        entry.name.endsWith('.md') ||
        entry.name.endsWith('.json') ||
        entry.name.endsWith('.txt')
      ) {
        let text = readFileSync(path, 'utf8');
        for (const key of [
          'M5_USERNAME',
          'M5_PASSWORD',
          'LOCAL_DB_PASSWORD',
          'LOCAL_APP_PASSWORD',
        ]) {
          if (environment[key]) text = text.replaceAll(environment[key], '[redacted]');
        }
        writeFileSync(path, text);
      } else {
        throw new Error('Unexpected browser artifact; review required before publication.');
      }
    }
  }
  scrub(output);
} catch {
  exitCode = 1;
  console.error('M5 harness failed; sensitive command output withheld.');
} finally {
  // Preserve every database volume; stop/remove only containers and network created by this run.
  if (created) {
    const cleaned = run('docker', [...compose, 'down'], back, true);
    console.log(
      `M5 owned stack cleanup: ${cleaned.status === 0 ? 'PASS' : 'FAIL'}. Fictional volume retained: ${project}_postgres-data`,
    );
    if (cleaned.status !== 0) exitCode = 1;
  }
  rmSync(temporary, { recursive: true, force: true });
}
process.exitCode = exitCode;

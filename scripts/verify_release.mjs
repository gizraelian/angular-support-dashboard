import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const repo = process.cwd();
const config = JSON.parse(fs.readFileSync(path.join(repo, 'angular.json'), 'utf8'));
const production =
  config.projects['angular-support-dashboard'].architect.build.configurations.production;
assert(
  !production.fileReplacements?.some((entry) => entry.with.includes('.development.')),
  'Release must not use local-browser replacements',
);
assert.match(
  fs.readFileSync('src/app/services/local-browser-build.ts', 'utf8'),
  /LOCAL_BROWSER_BUILD\s*=\s*false/,
);
assert.match(
  fs.readFileSync('src/app/services/local-browser.providers.ts', 'utf8'),
  /return\s*\[\]/,
);
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((item) =>
      item.isDirectory() ? files(path.join(dir, item.name)) : [path.join(dir, item.name)],
    );
}
const output = files('dist/angular-support-dashboard/browser').filter((file) =>
  file.endsWith('.js'),
);
assert(output.length > 0, 'Build release assets first');
for (const file of output) {
  const text = fs.readFileSync(file, 'utf8');
  for (const forbidden of [
    'Sign in to the local development API first.',
    'fixture-only-password',
    'test-only-password',
    'local-demo-only',
  ])
    assert(
      !text.includes(forbidden),
      'Local transport or test credentials included in release: ' + file,
    );
  assert(
    !/gh[pousr]_[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text),
    'Secret pattern in release',
  );
}
console.log(
  'PASS: release compile-time gate false, provider omitted, local transport/test credentials absent',
);

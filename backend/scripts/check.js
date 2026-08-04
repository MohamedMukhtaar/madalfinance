import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..', 'src');
let failures = 0;
let files = 0;

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.name.endsWith('.js')) {
      files += 1;
      try {
        execSync(`node --check "${full}"`, { stdio: 'pipe' });
      } catch (err) {
        failures += 1;
        console.error(`FAIL ${path.relative(root, full)}`);
        console.error(err.stderr?.toString() || err.message);
      }
    }
  }
};

walk(root);

if (failures) {
  console.error(`\n${failures} file(s) failed syntax check of ${files}`);
  process.exit(1);
}
console.log(`Syntax OK: ${files} file(s)`);

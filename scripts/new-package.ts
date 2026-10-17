/**
 * Scaffolds a workspace package, registers its layer and wires it into the app.
 *
 *   bun run new-package <name> --layer <n> [--dom] [--tests] [--css]
 *
 * --tests  adds `bun test`. Pass it once the package has specs: `bun test`
 *          exits non-zero when it finds none.
 * --dom    React package: peers, @types and the happy-dom preload (implies
 *          --tests).
 * --css    the package imports CSS, so `sideEffects` lists the stylesheets.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

interface Boundaries {
  layers: string[][];
  dbTypesOnly: string[];
  noReact: string[];
}

const USAGE =
  'bun run new-package <name> --layer <n> [--dom] [--tests] [--css]';
const root = fileURLToPath(new URL('..', import.meta.url));
const boundariesFile = path.join(root, 'packages/config/boundaries.json');
const webFile = path.join(root, 'apps/web/package.json');

function stop(message: string): never {
  process.stderr.write(`${message}\nusage: ${USAGE}\n`);
  process.exit(1);
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

function write(file: string, text: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function writeJson(file: string, value: unknown) {
  write(file, JSON.stringify(value, null, 2) + '\n');
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    layer: { type: 'string' },
    dom: { type: 'boolean' },
    tests: { type: 'boolean' },
    css: { type: 'boolean' },
  },
});
const boundaries = readJson<Boundaries>(boundariesFile);
const name = positionals[0] ?? '';
const layer = Number(values.layer);
const dom = values.dom === true;
const tests = dom || values.tests === true;

if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
  stop('name must be kebab-case');
}
if (!Number.isInteger(layer) || !boundaries.layers[layer]) {
  stop(`--layer must be 0-${boundaries.layers.length - 1}`);
}
const dir = path.join(root, 'packages', name);
if (fs.existsSync(path.join(dir, 'package.json'))) {
  stop(`packages/${name} already exists`);
}

const fullName = `@byte-of-me/${name}`;
writeJson(path.join(dir, 'package.json'), {
  name: fullName,
  version: '1.0.0',
  private: true,
  type: 'module',
  exports: { '.': './src/index.ts' },
  scripts: {
    'check-types': 'tsc --noEmit',
    lint: 'eslint src',
    'lint:fix': 'eslint src --fix',
    ...(tests && { test: 'bun test' }),
  },
  sideEffects: values.css ? ['**/*.css'] : false,
  ...(dom && {
    peerDependencies: { react: '^19.2.5', 'react-dom': '^19.2.0' },
  }),
  devDependencies: {
    ...(dom && { '@types/react': 'catalog:', '@types/react-dom': 'catalog:' }),
    eslint: 'catalog:',
    typescript: 'catalog:',
  },
});
write(
  path.join(dir, 'tsconfig.json'),
  '{\n  "extends": "../config/typescript/library.json",\n' +
    '  "include": ["src"]\n}\n'
);
write(
  path.join(dir, 'README.md'),
  `# ${fullName}\n\nLayer ${layer} in \`packages/config/boundaries.json\`: ` +
    'it may import only lower layers.\nConsumed as TypeScript source through ' +
    '`transpilePackages`; there is no build step.\n'
);
if (dom) {
  const preload = '[test]\npreload = ["../config/test/happydom.ts"]\n';
  write(path.join(dir, 'bunfig.toml'), preload);
}
// tsc fails on an empty `include`, so a package with no files yet gets a stub.
fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
if (fs.readdirSync(path.join(dir, 'src')).length === 0) {
  write(path.join(dir, 'src/index.ts'), 'export {};\n');
}

const list = (names: string[]) =>
  `[${names.map((n) => JSON.stringify(n)).join(', ')}]`;
boundaries.layers[layer] = [...boundaries.layers[layer], name].sort();
const rows = boundaries.layers.map((names) => `    ${list(names)}`);
write(
  boundariesFile,
  `{\n  "layers": [\n${rows.join(',\n')}\n  ],\n` +
    `  "dbTypesOnly": ${list(boundaries.dbTypesOnly)},\n` +
    `  "noReact": ${list(boundaries.noReact)}\n}\n`
);

const web = readJson<{ dependencies: Record<string, string> }>(webFile);
web.dependencies[fullName] = 'workspace:*';
web.dependencies = Object.fromEntries(
  Object.entries(web.dependencies).sort(([a], [b]) => (a < b ? -1 : 1))
);
writeJson(webFile, web);

process.stdout.write(`Created packages/${name} at layer ${layer}.
Listed it in boundaries.json; added "${fullName}": "workspace:*" to apps/web.
transpilePackages and the Tailwind content glob pick it up from the workspace.

Still to do by hand:
  1. git mv the code into packages/${name}/src and export it from src/index.ts.
  2. Add a one-sentence "description" after "private" in its package.json, and
     its third-party dependencies (catalog: when the root catalog has the
     entry), then run bun install.
  3. Point imports at ${fullName}; delete the old files, leave no re-export.
  4. Add the name to boundaries.json "noReact" or "dbTypesOnly" if rule 4 or 5
     applies.
  5. Add a row to docs/README.md ("Keeping these docs current") and update
     docs/architecture.md.
  6. bun run check
`);

/**
 * Enforces packages/config/boundaries.json (rules 1-6, docs/architecture.md "Package layers").
 * `bun run check-boundaries` prints `file:line  rule  message` per violation, exits 1 on any.
 * Syntactic parse, no type-check: a full run takes a fraction of a second.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

interface Boundaries {
  layers: string[][];
  dbTypesOnly: string[];
  noReact: string[];
}

interface PackageJson {
  name: string;
  exports?: string | Record<string, unknown>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

interface Workspace {
  name: string;
  dir: string;
  isApp: boolean;
  exportKeys: string[];
  declared: Set<string>;
}

type Fail = (rule: string, message: string) => void;

const SCOPE = '@byte-of-me/';
const FSD = ['app', 'widgets', 'features', 'entities', 'shared'];
const SOURCE = /\.(?:[cm]?[jt]s|[jt]sx)$/;

const root = fileURLToPath(new URL('..', import.meta.url));
const boundaries = readJson<Boundaries>('packages/config/boundaries.json');
const layerOf = new Map(
  boundaries.layers.flatMap((names, i) => names.map((n) => [n, i] as const))
);
const violations: string[] = [];

function readJson<T>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')) as T;
}

function report(abs: string, line: number, rule: string, message: string) {
  const file = path.relative(root, abs);
  violations.push(`${file}:${line}  ${rule}  ${message}`);
}

function* sourcesIn(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const { name } = entry;
    if (name.startsWith('.') || name === 'node_modules') continue;
    if (entry.isDirectory()) yield* sourcesIn(path.join(dir, name));
    else if (SOURCE.test(name)) yield path.join(dir, name);
  }
}

function loadWorkspaces(): Map<string, Workspace> {
  const found = new Map<string, Workspace>();
  for (const group of ['apps', 'packages']) {
    for (const { name } of fs.readdirSync(path.join(root, group), {
      withFileTypes: true,
    })) {
      const dir = path.join(root, group, name);
      if (!fs.existsSync(path.join(dir, 'package.json'))) continue;
      const pkg = readJson<PackageJson>(`${group}/${name}/package.json`);
      const isApp = group === 'apps';
      if (!isApp && pkg.name !== SCOPE + name) {
        const file = path.join(dir, 'package.json');
        report(file, 1, 'layers', `name must be ${SCOPE}${name}`);
      }
      const { exports } = pkg;
      const declared = [
        pkg.dependencies,
        pkg.peerDependencies,
        pkg.optionalDependencies,
      ].flatMap((deps) => Object.keys(deps ?? {}));
      found.set(name, {
        name,
        dir,
        isApp,
        exportKeys: typeof exports === 'object' ? Object.keys(exports) : [],
        declared: new Set(declared),
      });
    }
  }
  return found;
}

function checkRegistry(workspaces: Map<string, Workspace>) {
  const config = path.join(root, 'packages/config/boundaries.json');
  const listed = [
    ...boundaries.layers.flat(),
    ...boundaries.dbTypesOnly,
    ...boundaries.noReact,
  ];
  for (const name of new Set(listed)) {
    if (!workspaces.has(name) || workspaces.get(name)?.isApp) {
      report(config, 1, 'layers', `"${name}" is not a directory in packages/`);
    }
  }
  const layered = boundaries.layers.flat();
  for (const name of layered.filter((n, i) => layered.indexOf(n) !== i)) {
    report(config, 1, 'layers', `"${name}" is listed in more than one layer`);
  }
  for (const ws of workspaces.values()) {
    const exportsCode = !ws.isApp && ws.exportKeys.length > 0;
    if (!exportsCode || layerOf.has(ws.name)) continue;
    const file = path.join(ws.dir, 'package.json');
    report(file, 1, 'layers', 'exports code but is not in boundaries.json');
  }
}

function importsOf(file: ts.SourceFile) {
  const found: { specifier: string; line: number }[] = [];
  const add = (node: ts.Node | undefined) => {
    if (!node || !ts.isStringLiteralLike(node)) return;
    const { line } = file.getLineAndCharacterOfPosition(node.getStart(file));
    found.push({ specifier: node.text, line: line + 1 });
  };
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      add(node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      add(node.moduleReference.expression);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument)
    ) {
      add(node.argument.literal);
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const isRequire = ts.isIdentifier(callee) && callee.text === 'require';
      if (callee.kind === ts.SyntaxKind.ImportKeyword || isRequire) {
        add(node.arguments[0]);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

// Line of the 'use client' directive when the file opens with one.
function clientDirectiveLine(file: ts.SourceFile): number | undefined {
  for (const statement of file.statements) {
    if (!ts.isExpressionStatement(statement)) return undefined;
    if (!ts.isStringLiteral(statement.expression)) return undefined;
    if (statement.expression.text === 'use client') {
      const start = statement.getStart(file);
      return file.getLineAndCharacterOfPosition(start).line + 1;
    }
  }
  return undefined;
}

// An exports key may hold one `*`, as in "./hooks/*".
function isExported(keys: string[], subpath: string): boolean {
  return keys.some((key) => {
    const star = key.indexOf('*');
    if (star < 0) return key === subpath;
    const [head, tail] = [key.slice(0, star), key.slice(star + 1)];
    return (
      subpath.length >= key.length - 1 &&
      subpath.startsWith(head) &&
      subpath.endsWith(tail)
    );
  });
}

function fsdLayerOf(app: Workspace, abs: string): string | undefined {
  const [layer] = path.relative(path.join(app.dir, 'src'), abs).split(path.sep);
  return FSD.includes(layer) ? layer : undefined;
}

function checkFsd(from: string, to: string | undefined, fail: Fail) {
  if (to && FSD.indexOf(to) < FSD.indexOf(from)) {
    fail('fsd', `${from}/ must not import ${to}/, which is above it`);
  }
}

// Rules 1-5 for an import of another workspace package.
function checkPackageImport(
  ws: Workspace,
  workspaces: Map<string, Workspace>,
  specifier: string,
  isClient: boolean,
  fail: Fail
) {
  const [name, ...rest] = specifier.slice(SCOPE.length).split('/');
  if (name === ws.name) return;
  const target = workspaces.get(name);
  if (!target || target.isApp) {
    fail('exports', `${SCOPE}${name} is not a workspace package`);
    return;
  }
  const subpath = ['.', ...rest].join('/');
  const own = layerOf.get(ws.name);
  const theirs = layerOf.get(name);
  if (!ws.isApp && name === 'ui') {
    fail('facade', 'a package must not import the @byte-of-me/ui facade');
  }
  if (!ws.isApp && own !== undefined && theirs !== undefined && theirs >= own) {
    fail('layers', `${ws.name} (L${own}) must not import ${name} (L${theirs})`);
  }
  if (!isExported(target.exportKeys, subpath)) {
    fail('exports', `${specifier} is not in the exports map of ${name}`);
  }
  if (!ws.declared.has(SCOPE + name)) {
    fail('deps', `${SCOPE}${name} is not in package.json of ${ws.name}`);
  }
  const typesOnly = boundaries.dbTypesOnly.includes(ws.name) || isClient;
  if (name === 'db' && subpath === '.' && typesOnly) {
    fail('db-types', "use '@byte-of-me/db/types'; the db root is server-only");
  }
}

function checkFile(
  ws: Workspace,
  workspaces: Map<string, Workspace>,
  abs: string
) {
  const source = ts.createSourceFile(
    abs,
    fs.readFileSync(abs, 'utf8'),
    ts.ScriptTarget.Latest
  );
  const clientLine = clientDirectiveLine(source);
  const noReact = !ws.isApp && boundaries.noReact.includes(ws.name);
  const fsdFrom = ws.isApp ? fsdLayerOf(ws, abs) : undefined;

  if (noReact && clientLine) {
    report(abs, clientLine, 'no-react', `'use client' in ${ws.name}`);
  }

  for (const { specifier, line } of importsOf(source)) {
    const fail: Fail = (rule, message) => report(abs, line, rule, message);

    if (noReact && /^react(-dom)?(\/|$)/.test(specifier)) {
      fail('no-react', `${ws.name} must not import ${specifier}`);
    }
    if (specifier.startsWith(SCOPE)) {
      const isClient = clientLine !== undefined;
      checkPackageImport(ws, workspaces, specifier, isClient, fail);
    } else if (specifier.startsWith('@/')) {
      if (!ws.isApp) fail('no-app', 'the @/ alias belongs to apps/web');
      if (specifier === '@/entities') {
        fail('fsd', "import the slice, not the '@/entities' root barrel");
      }
      if (fsdFrom) checkFsd(fsdFrom, specifier.slice(2).split('/')[0], fail);
    } else if (specifier.startsWith('.')) {
      const resolved = path.resolve(path.dirname(abs), specifier);
      const apps = path.join(root, 'apps') + path.sep;
      if (!ws.isApp && resolved.startsWith(apps)) {
        fail('no-app', 'a package must not import from apps/');
      } else if (!resolved.startsWith(ws.dir + path.sep)) {
        fail('exports', `${specifier} leaves the package; import it by name`);
      }
      if (fsdFrom) checkFsd(fsdFrom, fsdLayerOf(ws, resolved), fail);
    }
  }
}

const started = performance.now();
const workspaces = loadWorkspaces();
checkRegistry(workspaces);
let files = 0;
for (const ws of workspaces.values()) {
  for (const abs of sourcesIn(ws.dir)) {
    checkFile(ws, workspaces, abs);
    files += 1;
  }
}

if (violations.length > 0) {
  process.stderr.write(violations.join('\n') + '\n');
  process.stderr.write(`\n${violations.length} boundary violation(s)\n`);
  process.exitCode = 1;
} else {
  const ms = Math.round(performance.now() - started);
  process.stdout.write(`boundaries ok: ${files} files, ${ms} ms\n`);
}

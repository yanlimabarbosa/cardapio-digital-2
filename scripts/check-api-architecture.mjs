import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';

const root = process.cwd();
const failures = [];

const ignoredDirectories = new Set([
  '.git',
  '.next',
  '.turbo',
  'coverage',
  'dist',
  'node_modules',
]);

function walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...walk(path));
      }
      continue;
    }

    if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
}

function relativePath(path) {
  return relative(root, path).split(sep).join('/');
}

function isTypeScript(path) {
  return path.endsWith('.ts') || path.endsWith('.tsx');
}

function read(path) {
  return readFileSync(path, 'utf8');
}

function report(path, message) {
  failures.push(`${relativePath(path)} - ${message}`);
}

function importSpecifiers(content) {
  const specs = [];
  const fromImport = /from\s+['"]([^'"]+)['"]/g;
  const sideEffectImport = /import\s+['"]([^'"]+)['"]/g;

  for (const match of content.matchAll(fromImport)) {
    specs.push(match[1]);
  }

  for (const match of content.matchAll(sideEffectImport)) {
    specs.push(match[1]);
  }

  return specs;
}

function isCorePath(path) {
  const rel = relativePath(path);
  return (
    rel.includes('/src/contexts/') &&
    (rel.includes('/domain/') || rel.includes('/application/'))
  ) || (
    rel.includes('/src/modules/') &&
    (rel.includes('/domain/') || rel.includes('/application/'))
  ) || rel.includes('/src/shared/application/') || rel.includes('/src/shared/domain/');
}

function isModuleArchitecturePath(path) {
  const rel = relativePath(path);
  return (
    rel.startsWith('apps/api/src/modules/') &&
    (rel.includes('/domain/') || rel.includes('/application/') || rel.includes('/adapters/'))
  );
}

function isStrictnessPath(path) {
  const rel = relativePath(path);
  return (
    rel.startsWith('apps/api/src/contexts/') ||
    rel.startsWith('apps/api/src/shared/') ||
    isModuleArchitecturePath(path) ||
    rel.startsWith('apps/api/test/contexts/') ||
    rel.startsWith('apps/api/test/modules/')
  );
}

function checkCoreDependencies(path, content) {
  const forbiddenPackages = [
    '@nestjs',
    '@mikro-orm',
    '@nestjs/bullmq',
    '@nestjs/websockets',
    'bullmq',
    'socket.io',
    'fs',
    'node:fs',
  ];
  const forbiddenRelativeSegments = [
    '/adapters/',
    '/controllers/',
    '/dto/',
    '/entities',
    '/modules/',
  ];

  for (const specifier of importSpecifiers(content)) {
    if (forbiddenPackages.some((pkg) => specifier === pkg || specifier.startsWith(`${pkg}/`))) {
      report(path, `core layer imports forbidden package "${specifier}"`);
    }

    if (specifier.toLowerCase().includes('pagbank')) {
      report(path, `core layer imports concrete PagBank module "${specifier}"`);
    }

    if (forbiddenRelativeSegments.some((segment) => specifier.includes(segment))) {
      report(path, `core layer imports forbidden relative boundary "${specifier}"`);
    }
  }

  if (/\bEntityManager\b|@Entity\b|\bCollection\b/.test(content)) {
    report(path, 'core layer references MikroORM entity infrastructure');
  }
}

function checkStrictness(path, content) {
  if (/\bany\b|as any|: any/.test(content)) {
    report(path, 'new architecture/test code contains any');
  }

  if (/[A-Za-z0-9_$\]\)]!\./.test(content) || /!;/.test(content)) {
    report(path, 'new architecture/test code contains a non-null assertion');
  }
}

function checkContextFileName(path) {
  const name = basename(path);
  const rel = relativePath(path);
  const inContextCore = isCorePath(path);

  if (inContextCore && ['utils.ts', 'helpers.ts', 'types.ts'].includes(name)) {
    report(path, 'domain/application context uses a catch-all filename');
  }
}

function checkModuleServices(files) {
  for (const path of files) {
    const rel = relativePath(path);
    if (rel.startsWith('apps/api/src/modules/') && rel.endsWith('.service.ts')) {
      report(path, 'legacy module service file remains');
    }
  }
}

function checkServiceImports(path, content) {
  for (const specifier of importSpecifiers(content)) {
    if (specifier.endsWith('.service') || specifier.includes('/services/')) {
      report(path, `imports a service boundary "${specifier}"`);
    }
  }
}

function main() {
  if (!statSync(root).isDirectory()) {
    throw new Error(`Invalid repository root: ${root}`);
  }

  const files = walk(root).filter(isTypeScript);

  checkModuleServices(files);

  for (const path of files) {
    const content = read(path);

    if (isCorePath(path)) {
      checkCoreDependencies(path, content);
      checkContextFileName(path);
    }

    if (isStrictnessPath(path)) {
      checkStrictness(path, content);
    }

    if (relativePath(path).startsWith('apps/api/')) {
      checkServiceImports(path, content);
    }
  }

  if (failures.length > 0) {
    console.error('API architecture check failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('ok - API architecture checks passed');
}

main();

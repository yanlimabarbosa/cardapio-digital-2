# Component Folder Structure

## Rule: One Component Per File — Zero Exceptions

If a function returns JSX, it is a **component** and MUST live in its own `.tsx` file. No file may contain more than one component. This is the single most important structural rule in the codebase.

## When a File Becomes a Folder

A component becomes a **folder** ONLY when it has **sub-components** (other sibling `.tsx` files that return JSX). That's the only trigger.

If a component has no sub-components, it stays as a **single file** — even if it has inline utils, constants, or schemas. A folder with only `index.tsx` is pointless overhead. Don't create it.

```
// BAD — folder for a single file
meal-section/
└── index.tsx          ← just rename this to meal-section.tsx

// GOOD — flat file
meal-section.tsx       ← has inline utils/schemas, but no sub-components
```

## Folder Anatomy

```
component-name/
├── index.tsx              ← the main component (the one imported from outside)
├── sub-component.tsx      ← sub-component used only by index.tsx
├── another-sub.tsx        ← another sub-component
├── types.ts               ← shared types (only if used by 2+ siblings)
└── utils/                 ← ONLY when 3+ utility functions
    ├── get-bar-color.ts
    ├── get-warning.ts
    └── calc-something.ts
```

### Inline vs Subfolder threshold

| Count | Where it lives |
|-------|---------------|
| 1-2 utility functions | Inline in the component file (above the component) |
| 3+ utility functions | `utils/` subfolder, one per file |
| 1-2 constants | Inline in the component file |
| 3+ constants | `constants/` subfolder, one per file |
| 1-2 schemas | Inline in the component file |
| 3+ schemas | `schemas/` subfolder, one per file |

### What goes where

| Thing | Location | Naming |
|-------|----------|--------|
| Main component | `index.tsx` | Component name = folder name |
| Sub-component (returns JSX) | `sibling-name.tsx` | kebab-case of component name |
| Pure function (1-2) | Inline in component file | Function declaration above the component |
| Pure function (3+) | `utils/function-name.ts` | kebab-case of function name |
| Constant (1-2) | Inline in component file | Defined above the component |
| Constant (3+) | `constants/constant-name.ts` | kebab-case of constant name |
| Schema (1-2) | Inline in component file | Defined above the component |
| Schema (3+) | `schemas/schema-name.ts` | kebab-case of schema name |
| Types used across siblings | `types.ts` (sibling file) | One `types.ts` per folder if needed |

### Rules

1. **`index.tsx` IS the component** — it contains the actual component code, not re-exports. This is NOT a barrel file.
2. **No barrel re-exports** — never create an `index.ts` that just re-exports from siblings. If you see `export { X } from './x'` in an index file, that's a barrel. Don't do it.
3. **Sub-components are siblings** — they sit next to `index.tsx`, not in a subfolder.
4. **Don't over-organize** — a single helper function above the component is cleaner than a `utils/` folder with one file. Only create subfolders when the count justifies it.
5. **File name = export name** — `get-bar-color.ts` exports `getBarColor`, `volume-row.tsx` exports `VolumeRow`.

## Import Patterns

### From outside the folder
```tsx
import { VolumeBars } from './_components/volume-bars';
import { SetRow } from '@/components/treino/set-row';
```

### Inside the folder (siblings importing each other)
```tsx
import { VolumeRow } from './volume-row';
import type { Landmark } from './types';
```

## Full Example: volume-bars (folder — has sub-component + 2 inline utils)

```
volume-bars/
├── index.tsx              ← VolumeBars + getBarColor + getWarning (inline, only 2)
├── volume-row.tsx         ← VolumeRow sub-component
└── types.ts               ← Landmark type (shared by both)
```

```tsx
// index.tsx
import type { Landmark } from './types';
import { VolumeRow } from './volume-row';

function getBarColor(display: number, lm: Landmark): string { ... }
function getWarning(actual: number, lm: Landmark): { text: string; color: string } { ... }

export function VolumeBars({ landmarks, actualVolume, plannedVolume }: VolumeBarsProps) {
  // uses getBarColor and getWarning inline
}
```

## Full Example: set-row (folder — has sub-component + inline schema + inline constant)

```
set-row/
├── index.tsx              ← SetRow + setSchema + RIR_OPTIONS (all inline)
└── locked-actions.tsx     ← LockedActions sub-component
```

## When NOT to Create a Folder

A component stays as a single `.tsx` file when ALL of these are true:
- It has zero sub-components
- It has 0-2 utility functions (they stay inline)
- It has 0-2 constants (they stay inline)
- It has 0-2 schemas (they stay inline)

If the only reason to create a folder would be a single util or schema, don't — keep it inline.

## Shared vs Component-Scoped

- **App-wide constants** (used by 2+ features): `lib/constants/`
- **Component-scoped constants** (used only by this component): inline in the component file
- **App-wide types** (domain models): `types/`
- **Component-scoped types** (only used within this folder): `types.ts` sibling or inline

If something starts as component-scoped and later gets used elsewhere, promote it to the app-wide location.

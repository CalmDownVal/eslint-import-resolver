# eslint-import-resolver-typescript

This is a re-implementation of [eslint-import-resolver-typescript](https://github.com/alexgorbatchev/eslint-import-resolver-typescript)
(ISC license) by [Alex Gorbatchev](https://github.com/alexgorbatchev).

This version adds logic to take the location of tsconfig into account and won't
apply path mapping outside of its package.

## Example

```txt
├─ packages
│  ├─ client
│  │  ├─ src
│  │  │  └─ utils
│  │  │     └─ constants.ts
│  │  ├─ package.json
│  │  └─ tsconfig.json
│  └─ server
│     ├─ src
│     │  └─ utils
│     │     └─ constants.ts
│     ├─ package.json
│     └─ tsconfig.json
├─ .eslintrc
└─ package.json
```

Assume `~/*` maps to the `src` directory in both packages. Since the original
implementation uses all tsconfigs at once, resolving `~/utils/constants` yields
two paths:

- `packages/client/src/utils/constants.ts`
- `packages/server/src/utils/constants.ts`

It then blindly returns the first one found, which means the resolution works
correctly only for the first package. For the second package, the resolution
algorithm will point to the wrong file.

This version considers the location of tsconfig and won't apply path patterns
defined in configs that don't relate to the file being linted.

## Debugging

To show debug logs from this resolver, run ESLint with the DEBUG environment
variable set:

```sh
# Bash
DEBUG="eslint-import-resolver-typescript" yarn eslint .

# PowerShell
& { $env:DEBUG='eslint-import-resolver-typescript'; yarn eslint . }
```

## Changelog

- 1.1.0
  - Fixed resolution for projects with nested TS config files.
- 1.0.0
  - Initial implementation.

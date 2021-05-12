# eslint-import-resolver-typescript

This is a re-implementation of [eslint-import-resolver-typescript](https://github.com/alexgorbatchev/eslint-import-resolver-typescript)
(ISC license) by [Alex Gorbatchev](https://github.com/alexgorbatchev).

This package adds logic to take `baseDir` into account and won't apply path
mapping outside of its package.

For example:

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

It then simply takes the first one found and logs a warning, which breaks linter
rules inside of the server package (because it comes later alphabetically).

This implementation considers the path of the file being linted and only maps
paths defined in the tsconfig belonging to the current package.

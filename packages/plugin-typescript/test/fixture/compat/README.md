# TypeScript in Node.js: Compatibility Notes

I tested some different packages with different TS configurations, _and you won't believe what happened next._

## Matrix of Failure

The top row of this table lists _providers_--modules which export type definitions. The left-hand column lists _consumers_--modules which import type definitions from the _providers_.

Each consumer header cell will contain three (3) values:

1. CommonJS (CJS) or ECMAScript Module (ESM) format
2. TypeScript's `module` compiler option
3. TypeScript's `moduleResolution` compiler option

✔️ means "compiled successfully" and ❌ means "failed to compile".

|                                         | Provider: CJS | Provider: ESM | Provider: ESM / No `types` export |
| :-------------------------------------- | :-----------: | :-----------: | :-------------------------------: |
| **Consumer: CJS / `node16` / `node16`** |      ✔️       |      ❌       |                ❌                 |
| **Consumer: CJS / `commonjs` / `node`** |      ✔️       |      ✔️       |                ✔️                 |
| **Consumer: ESM / `node16` / `node16`** |      ✔️       |      ✔️       |                ❌*                 |
|  **Consumer: ESM / `esnext` / `node`**  |      ✔️       |      ✔️       |                ✔️                 |

*: In this case, the the `types.d.ts` file was not found--the `types` field was ignored--so the import of the "additional type" failed, but would have otherwise succeeded; [see below](#providers).

> Note: I'm _pretty sure_ `nodenext` can be used interchangeably with `node16` for both `module` and `moduleResolution` options, but I haven't tested it.

### Setup & Caveats

**This is only a test of compilation--not runtime.**

#### TypeScript

I used TS v5.2.2.

#### Providers

The `module` and `moduleResolution` settings of the provider do not matter; the compiler output is the same regardless.

Each provider has an entry point and a `types.d.ts` file. The entry point exposes a named export only. The `types.d.ts` file re-exports everything from the entry point and one additional type.

No CJS providers had `exports` fields in `package.json`. All providers had a `types` field in `package.json`.

Providers are all written in TypeScript.

#### Consumers

The `module` and `moduleResolution` options are important for consumers.

Each consumer imports the named export from the provider and the additional type from the `types.d.ts` file.

Consumers are all written in JavaScript with JSDoc-style types.

## Discussion

Getting this out of the way: _I don't care how the hell you configure your TypeScript_ and you will need to evaluate the tradeoffs for yourself. I'm just over here trying to understand why my build is failing.

_That being said_, here are some (hopefully worthwhile) observations:

- If a provider has an `exports` field _at all_, the consumer **should** use `node16`/`node16`, because this is how Node.js will resolve it.  That means it's _on the consumer_ to understand their dependencies and configure TS accordingly.  It may be possible for a CJS consumer to _just use the types_ from an ESM package via the `commonjs`/`node` combo, but I haven't tested it.
- It _looks_ like a CJS consumer could erroneously consume an ESM provider using `commonjs`/`node`--compilation may succeed but it will fail at runtime. I'm not sure.
- Providers concerned with compat should _always_ have a `types` field.  Older versions of TS (pre-v4.6) don't support `node16` module resolution. Putting it another way, the `types` export conditional(s) will be _ignored_ by anything that isn't `node16`/`nodenext`.
- I direct the reader to observe the cascade of green checks in the "Provider: CJS" column above. Just sayin'.
- A `types` conditional export is not needed if the provider ships declarations alongside its `.js` files (i.e., don't use `declarationDir`).

TIL: the `module` option `node16` causes TS to look at `package.json` to determine what kind of module system the compiler should target. This way, both CJS and ESM packages can use the same `tsconfig.json`.

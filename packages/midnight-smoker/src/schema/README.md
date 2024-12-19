# `midnight-smoker/schema`: Zod Schemas

This dir (and subdirs) contain all static [Zod](https://zod.dev) schemas and (sometimes) their associated types.

All schemas—_where possible_—should not export inferred types. Instead, discrete types should be defined and the schemas should consume them via `z.ZodType<T>`.

Zod types should _only_ be used where we accept user (or machine) input which needs validation (all of it). Unfortunately, there's a _lot_ of that due to the plugin system & configuration files.
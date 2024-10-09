# `#schema/meta`: Meta Schemas

This dir provides collections of schemas which are consumed by specific modules.

The aim here is to reduce the number of schemas that need to be explicitly imported from `schema/*` modules; internal modules are discouraged from importing barrels (`index.ts` files) due to the risk of cyclic dependencies.

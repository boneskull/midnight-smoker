# `midnight-smoker/machine`: State Machines & Actors

This dir contains all the [XState](https://github.com/statelyai/xstate) state machines and actors used by `midnight-smoker`. As such, it contains the bulk of the "business logic" of the application.

## State Machines

- `SmokeMachine`: The root state machine for `midnight-smoker`, which is instantiated by the main `smoke()` method. _All_ events flow through this machine one way or another (but it only originates a handful itself).
- `PkgManagerMachine`: One per `PkgManager`; responsible for the lifecycle of a `PkgManager` and invoking its `pack()`, `install()`, and `runScript()` callbacks. This includes linting (though the behavior is not defined by `PkgManager`s). These four (4) are known as _operations_.

  Most events originate here, and are sent back to the root `SmokeMachine`.

- `ReporterMachine`: Responsible for the `Reporter` lifecycle and invocation of event callbacks.
- `RuleMachine`: One per `Rule`; manages invocation of the `check()` method of a `Rule` using `LintManifest` objects.
- `RegistryMachine`: Handles plugin resolution, importing, and registration.
- `ComponentLoaderMachine`: Loads components from plugins, post-registration.
- `PkgManagerLoaderMachine` / `ParsePkgManagerSpecMachine`: Repsonsible for determining which `PkgManager`(s) should be used. This involes both user configuration and a set of heuristics. It is very complicated.

- Bus machines: There are a few _event bus_ (or _bus_) machines (in `bus/`) whose purpose is to receive events from the root `SmokeMachine` and re-emit them to the `ReporterMachine`s. The only reason these exist is because `SmokeMachine` was getting too big.

  These are the only machines which communicate with machines _other_ than their parent, and rely on XState's "system ID"s to do so.

## Actors

[Actors](https://stately.ai/docs/actors) live in `actor/`. These are all asynchronous _Promise actors_, and are either invoked or spawned by the state machines. The only subgroup is in `actor/operation/`; these are exclusively invoked by `PkgManagerMachine` when performing operations.

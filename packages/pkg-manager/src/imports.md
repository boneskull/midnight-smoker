```ts
import {
  SmokerReferenceError,
  MachineError,
  LifecycleError,
  TimeoutError,
} from 'midnight-smoker/error';
import {
  DEFAULT_PKG_MANAGER_NAME,
  SYSTEM,
  ERROR,
  FINAL,
  OK,
  PARALLEL,
  InstallEvents,
  WildcardEvents,
} from 'midnight-smoker/constants';
import {
  type PkgManager,
  type PkgManagerContext,
  type PkgManagerOpts,
} from 'midnight-smoker/defs/pkg-manager';
import {type Executor} from 'midnight-smoker/defs/executor';
import {
  type PkgManagerEnvelope,
  type PluginMetadata,
  type ComponentRegistry,
} from 'midnight-smoker/plugin';
import {
  type ExecFn,
  parseRange,
  type StaticPkgManagerSpec,
  type DesiredPkgManager,
  parseDesiredPkgManagerSpec,
  type PartialStaticPkgManagerSpec,
} from 'midnight-smoker/schema';
import {
  caseInsensitiveEquals,
  exec,
  assert,
  fromUnknownError,
  isKnownPkgManagerSpec,
  isStaticPkgManagerSpec,
  isFunction,
  isString,
  castArray,
  R,
  serialize,
  uniqueId,
} from 'midnight-smoker/util';
import {
  normalizeVersionAgainstPkgManager,
  PkgManagerSpec,
  getRange,
  type InstallManifest,
  type WorkspaceInfo,
} from 'midnight-smoker/pkg-manager';
```

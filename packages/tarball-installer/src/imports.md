```ts
import {
  type PkgManagerInstallContext,
  type InstallManifest,
  type PkgManagerContext,
  type PkgManagerPackContext,
  type WorkspaceInstallManifest,
} from 'midnight-smoker/defs/pkg-manager';
import {
  AbortError,
  asValidationError,
  PackError,
  PackParseError,
  InstallError,
  type SomePackError,
} from 'midnight-smoker/error';
// TODO: assertWorkspaceInstallManifest(allegedManifest);
import {
  type ExecOutput,
  type InstallResult,
  type WorkspaceInfo,
  WorkspaceInstallManifestSchema,
} from 'midnight-smoker/schema';
import {InstallEvents, PackEvents} from 'midnight-smoker/events';
import {
  debugFactory,
  assertExecOutput,
  fromUnknownError,
  assert,
  isWorkspaceInstallManifest,
  R,
  toResult,
  isSmokerError,
  uniqueId,
} from 'midnight-smoker/util';
import {constant} from 'midnight-smoker/constants';
import {
  type AbortEvent,
  DEFAULT_INIT_ACTION,
  INIT_ACTION,
  type MachineEvent,
  type SmokeMachinePkgInstallBeginEvent,
  type SmokeMachinePkgInstallFailedEvent,
  type SmokeMachinePkgInstallOkEvent,
  type SmokeMachinePkgPackBeginEvent,
  type SmokeMachinePkgPackFailedEvent,
  type SmokeMachinePkgPackOkEvent,
} from 'midnight-smoker/machine';
import {type PkgManagerEnvelope} from 'midnight-smoker/plugin';
import {toWorkspaceInfo} from 'midnight-smoker/pkg-manager';
```

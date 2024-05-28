import {
  type PkgInstallBeginEventData,
  type PkgInstallFailedEventData,
  type PkgInstallOkEventData,
  type PkgManagerInstallBeginEventData,
  type PkgManagerInstallFailedEventData,
  type PkgManagerInstallOkEventData,
} from '#event/install-events';
import {type MachineEvent} from '#machine/util';
import {type ComputedPkgEventFields} from './pkg-events';

export type ComputedPkgManagerInstallFields = 'totalPkgs' | 'totalPkgManagers';

export type CtrlInstallEvents =
  | CtrlPkgInstallBeginEvent
  | CtrlPkgInstallOkEvent
  | CtrlPkgInstallFailedEvent
  | CtrlPkgManagerInstallBeginEvent
  | CtrlPkgManagerInstallOkEvent
  | CtrlPkgManagerInstallFailedEvent;

export type CtrlPkgInstallBeginEvent = MachineEvent<
  'INSTALL.PKG_INSTALL_BEGIN',
  Omit<PkgInstallBeginEventData, ComputedPkgEventFields>
>;

export type CtrlPkgInstallFailedEvent = MachineEvent<
  'INSTALL.PKG_INSTALL_FAILED',
  Omit<PkgInstallFailedEventData, ComputedPkgEventFields>
>;

export type CtrlPkgInstallOkEvent = MachineEvent<
  'INSTALL.PKG_INSTALL_OK',
  Omit<PkgInstallOkEventData, ComputedPkgEventFields>
>;

export type CtrlPkgManagerInstallBeginEvent = MachineEvent<
  'INSTALL.PKG_MANAGER_INSTALL_BEGIN',
  Omit<PkgManagerInstallBeginEventData, ComputedPkgManagerInstallFields>
>;

export type CtrlPkgManagerInstallFailedEvent = MachineEvent<
  'INSTALL.PKG_MANAGER_INSTALL_FAILED',
  Omit<PkgManagerInstallFailedEventData, ComputedPkgManagerInstallFields>
>;

export type CtrlPkgManagerInstallOkEvent = MachineEvent<
  'INSTALL.PKG_MANAGER_INSTALL_OK',
  Omit<PkgManagerInstallOkEventData, ComputedPkgManagerInstallFields>
>;

import {
  type PkgInstallBeginEventData,
  type PkgInstallFailedEventData,
  type PkgInstallOkEventData,
  type PkgManagerInstallBeginEventData,
  type PkgManagerInstallFailedEventData,
  type PkgManagerInstallOkEventData,
} from '#event';
import {type MachineEvent} from '#machine/util';
import {type ComputedPkgEventFields} from './control-machine-events';

export type ComputedPkgManagerInstallFields = 'totalPkgs' | 'totalPkgManagers';

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

export interface AnyInstallEvent {
  type: 'INSTALL.*' &
    'INSTALL.PKG_INSTALL_BEGIN' &
    'INSTALL.PKG_INSTALL_FAILED' &
    'INSTALL.PKG_INSTALL_OK' &
    'INSTALL.PKG_MANAGER_INSTALL_BEGIN' &
    'INSTALL.PKG_MANAGER_INSTALL_FAILED' &
    'INSTALL.PKG_MANAGER_INSTALL_OK';
}

export type CtrlInstallEvents =
  | CtrlPkgInstallBeginEvent
  | CtrlPkgInstallOkEvent
  | CtrlPkgInstallFailedEvent
  | CtrlPkgManagerInstallBeginEvent
  | CtrlPkgManagerInstallOkEvent
  | CtrlPkgManagerInstallFailedEvent;

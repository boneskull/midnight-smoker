/**
 * @todo Unclear how we're supposed to type this; xstate documentation issue
 */

import type {
  PkgManagerPackBeginEventData,
  PkgManagerPackFailedEventData,
  PkgManagerPackOkEventData,
  PkgPackBeginEventData,
  PkgPackFailedEventData,
  PkgPackOkEventData,
} from '#event';
import type {MachineEvent} from '#machine/util';

export type ComputedPkgEventFields = 'currentPkg' | 'totalPkgs';

export interface AnyPackEvent {
  type: 'PACK.*' &
    'PACK.PKG_PACK_BEGIN' &
    'PACK.PKG_PACK_FAILED' &
    'PACK.PKG_PACK_OK' &
    'PACK.PKG_MANAGER_PACK_BEGIN' &
    'PACK.PKG_MANAGER_PACK_FAILED' &
    'PACK.PKG_MANAGER_PACK_OK';
}

export type CtrlPkgPackBeginEvent = MachineEvent<
  'PACK.PKG_PACK_BEGIN',
  Omit<PkgPackBeginEventData, ComputedPkgEventFields>
>;

export type CtrlPkgPackFailedEvent = MachineEvent<
  'PACK.PKG_PACK_FAILED',
  Omit<PkgPackFailedEventData, ComputedPkgEventFields>
>;

export type CtrlPkgPackOkEvent = MachineEvent<
  'PACK.PKG_PACK_OK',
  Omit<PkgPackOkEventData, ComputedPkgEventFields>
>;

export type ComputedPkgManagerPackFields = 'totalPkgs' | 'totalPkgManagers';

export type CtrlPkgManagerPackBeginEvent = MachineEvent<
  'PACK.PKG_MANAGER_PACK_BEGIN',
  Omit<PkgManagerPackBeginEventData, ComputedPkgManagerPackFields>
>;

export type CtrlPkgManagerPackFailedEvent = MachineEvent<
  'PACK.PKG_MANAGER_PACK_FAILED',
  Omit<PkgManagerPackFailedEventData, ComputedPkgManagerPackFields>
>;

export type CtrlPkgManagerPackOkEvent = MachineEvent<
  'PACK.PKG_MANAGER_PACK_OK',
  Omit<PkgManagerPackOkEventData, ComputedPkgManagerPackFields>
>;

export type CtrlPackEvents =
  | CtrlPkgManagerPackBeginEvent
  | CtrlPkgManagerPackOkEvent
  | CtrlPkgManagerPackFailedEvent
  | CtrlPkgPackBeginEvent
  | CtrlPkgPackFailedEvent
  | CtrlPkgPackOkEvent;

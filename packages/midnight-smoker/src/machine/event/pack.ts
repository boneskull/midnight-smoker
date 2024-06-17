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
} from '#event/pack-events';
import type {MachineEvent} from '#machine/util';
import {type ComputedPkgEventFields} from './pkg';

export type ComputedPkgManagerPackFields = 'totalPkgs' | 'totalPkgManagers';

export type CtrlPackEvents =
  | CtrlPkgManagerPackBeginEvent
  | CtrlPkgManagerPackOkEvent
  | CtrlPkgManagerPackFailedEvent
  | CtrlPkgPackBeginEvent
  | CtrlPkgPackFailedEvent
  | CtrlPkgPackOkEvent;

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

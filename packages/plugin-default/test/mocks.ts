import Debug from 'debug';
import {Console} from 'node:console';
import sinon from 'sinon';

export type ConsoleMock = sinon.SinonStubbedInstance<Console>;

export type DebugMock = sinon.SinonStubbedMember<typeof Debug>;

export const mockDebug: DebugMock = sinon
  .stub<[namespace: string], Debug.Debugger>()
  .callsFake((arg) => sinon.stub(Debug(arg)));

export const mockConsole: ConsoleMock = sinon.createStubInstance(Console);

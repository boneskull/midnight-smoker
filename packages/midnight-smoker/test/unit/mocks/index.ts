import Debug from 'debug';
import {Console} from 'node:console';
import path from 'node:path';
import sinon from 'sinon';

export * from './null-pm-controller';
export type ConsoleMock = sinon.SinonStubbedInstance<Console>;
export type DebugMock = sinon.SinonStubbedMember<typeof Debug>;

export const mockDebug: DebugMock = sinon
  .stub<[namespace: string], Debug.Debugger>()
  .callsFake((arg) => sinon.stub(Debug(arg)));
export const mockConsole: ConsoleMock = sinon.createStubInstance(Console);

export const MOCK_TMPROOT = '/some/tmp';
export const MOCK_TMPDIR = path.join(MOCK_TMPROOT, 'midnight-smoker-');

import Debug from 'debug';
import sinon from 'sinon';

export type DebugMock = sinon.SinonStubbedMember<typeof Debug>;

export const mockDebug: DebugMock = sinon
  .stub<[namespace: string], Debug.Debugger>()
  .callsFake((arg) => sinon.stub(Debug(arg)));

export const MOCK_TMPROOT = '/some/tmp';

export * from './fs';

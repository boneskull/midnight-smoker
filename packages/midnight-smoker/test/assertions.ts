import type {ExecaReturnValue} from 'execa';
import type unexpected from 'unexpected';
import {readPackageJsonSync} from '../src/util';

const {packageJson} = readPackageJsonSync({cwd: __dirname, strict: true});
export default {
  name: 'unexpected-midnight-smoker-internal',
  version: packageJson.version,
  installInto(expect: typeof unexpected) {
    expect
      .addType({
        name: 'ExecaReturnValue',
        base: 'object',
        identify(v: any): v is ExecaReturnValue {
          return (
            v &&
            typeof v === 'object' &&
            typeof v.command === 'string' &&
            typeof v.exitCode === 'number' &&
            typeof v.stdout === 'string' &&
            typeof v.stderr === 'string' &&
            typeof v.failed === 'boolean'
          );
        },
      })
      .addAssertion(
        '<ExecaReturnValue> [not] to have failed',
        (expect: typeof unexpected, result: ExecaReturnValue) => {
          expect(result.failed, '[not] to be true');
        },
      )
      .addAssertion(
        '<ExecaReturnValue> [not] to have succeeded',
        (expect: typeof unexpected, result: ExecaReturnValue) => {
          expect(result.failed, '[not] to be false');
        },
      )
      .addAssertion(
        '<ExecaReturnValue> to output valid JSON',
        (expect: typeof unexpected, result: ExecaReturnValue) => {
          expect(() => JSON.parse(result.stdout), 'not to throw');
        },
      )
      .addAssertion(
        '<ExecaReturnValue> to output <string>',
        (expect: typeof unexpected, result: ExecaReturnValue, str: string) => {
          expect(result.stdout, 'to equal', str);
        },
      );
  },
};

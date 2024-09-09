/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import type {ExecaReturnValue} from 'execa';
import type unexpected from 'unexpected';

import {isBoolean, isInteger, isObject, isString} from 'lodash';

export default {
  installInto(expect: typeof unexpected) {
    expect
      .addType({
        base: 'object',
        identify(v: any): v is ExecaReturnValue {
          return (
            isObject(v) &&
            'command' in v &&
            isString(v.command) &&
            'exitCode' in v &&
            isInteger(v.exitCode) &&
            'stdout' in v &&
            isString(v.stdout) &&
            'stderr' in v &&
            isString(v.stderr) &&
            'failed' in v &&
            isBoolean(v.failed)
          );
        },
        name: 'ExecaReturnValue',
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
  name: 'unexpected-midnight-smoker-internal',
};

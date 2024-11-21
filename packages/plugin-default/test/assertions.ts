/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import type unexpected from 'unexpected';

import {type ExecOutput} from 'midnight-smoker/defs/executor';
import {isExecOutput} from 'midnight-smoker/util';

export default {
  installInto(expect: typeof unexpected) {
    expect
      .addType({
        base: 'object',
        identify(v: any): v is ExecOutput {
          return isExecOutput(v);
        },
        name: 'ExecaReturnValue',
      })
      .addAssertion(
        '<ExecaReturnValue> [not] to have failed',
        (expect: typeof unexpected, result: ExecOutput) => {
          expect(result.exitCode, '[not] to be greater than', 0);
        },
      )
      .addAssertion(
        '<ExecaReturnValue> [not] to have succeeded',
        (expect: typeof unexpected, result: ExecOutput) => {
          expect(result.exitCode, '[not] to be', 0);
        },
      )
      .addAssertion(
        '<ExecaReturnValue> to output valid JSON',
        (expect: typeof unexpected, result: ExecOutput) => {
          expect(() => JSON.parse(result.stdout), 'not to throw');
        },
      )
      .addAssertion(
        '<ExecaReturnValue> to output <string>',
        (expect: typeof unexpected, result: ExecOutput, str: string) => {
          expect(result.stdout, 'to equal', str);
        },
      );
  },
  name: 'unexpected-midnight-smoker-internal',
};

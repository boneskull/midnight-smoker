import type {
  LintLogicOutput,
  LintLogicOutputError,
} from '#machine/actor/operation/lint-logic';

export interface CheckErrorEvent {
  output: LintLogicOutputError;
  type: 'CHECK_ERROR';
}

export interface CheckResultEvent {
  output: LintLogicOutput;
  type: 'CHECK_RESULT';
}

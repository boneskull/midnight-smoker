/**
 * Stuff necessary for implementing an `Executor`
 *
 * @privateRemarks
 * **NOT FOR INTERNAL CONSUMPTION**
 * @module midnight-smoker/executor
 * @public
 */

export {ExecError} from '#error/exec-error';

export * from '#schema/exec-result';

export * from '#schema/executor';

export {assertExecOutput} from '#util/guard/assert/exec-output';

export {isExecOutput} from '#util/guard/exec-output';

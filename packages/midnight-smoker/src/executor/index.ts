/**
 * Stuff necessary for implementing an `Executor`
 *
 * @privateRemarks
 * **NOT FOR INTERNAL CONSUMPTION**
 * @module midnight-smoker/executor
 * @public
 */

export * from '#defs/executor';

export {ExecError} from '#error/exec-error';

export * from '#schema/exec-output';

export {assertExecOutput} from '#util/guard/assert/exec-output';

export {isExecOutput} from '#util/guard/exec-output';

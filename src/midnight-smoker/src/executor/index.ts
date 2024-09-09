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

export {isExecResult} from '#util/guard/exec-result';

export {isExecaError} from '#util/guard/execa-error';

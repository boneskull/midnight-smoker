/**
 * Contains `Promise`-based actors performing _operations_.
 *
 * An operation is one of the four major tasks `midnight-smoker` performs:
 *
 * 1. Packing a workspace into a tarball
 * 2. Installing the tarball into a temporary directory
 * 3. Running rules against the installed package
 * 4. Running custom scripts within the installed package
 *
 * @packageDocumenation
 * @todo Need `meta` modules for error and schema
 */
import {type PkgManagerContext} from 'midnight-smoker/defs/pkg-manager';
import {type PkgManagerEnvelope} from 'midnight-smoker/plugin';

/**
 * Common input for various actors
 */
export interface OperationLogicInput<Ctx extends PkgManagerContext> {
  ctx: Omit<Ctx, 'signal'>;
  envelope: PkgManagerEnvelope;
}

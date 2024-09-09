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
import {type PkgManagerEnvelope} from '#plugin/component-envelope';
import {type PkgManagerContext} from '#schema/pkg-manager';

/**
 * Common input for various actors
 */
export interface OperationLogicInput<Ctx extends PkgManagerContext> {
  ctx: Omit<Ctx, 'signal'>;
  envelope: PkgManagerEnvelope;
}

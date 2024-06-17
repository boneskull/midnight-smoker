/**
 * Stuff you might want when creating a `PkgManagerDef`
 *
 * @privateRemarks
 * **NOT FOR INTERNAL CONSUMPTION**
 * @module midnight-smoker/pkg-manager
 * @public
 * @todo Audit these exports--what does `plugin-default` actually need?
 */

export * from '#error/pkg-manager';

export type {ExecResult} from '#schema/exec-result';

export * from '#schema/install-manifest';

export * from '#schema/install-result';

export * from '#schema/pack-options';

export * from '#schema/pkg-manager-def';

export * from '#schema/run-script-manifest';

export * from '#schema/run-script-result';

export * from '#schema/static-pkg-manager-spec';

export {SemVer} from 'semver';

export * from './pkg-manager-loader';

export * from './pkg-manager-spec';

export * from './pkg-manager-version';

export * from '#schema/workspace-info';

export * from '#schema/version';

export * from '#util/result';

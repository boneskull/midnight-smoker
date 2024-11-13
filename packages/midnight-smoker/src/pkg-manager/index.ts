/**
 * Stuff you might want when creating a `PkgManager`
 *
 * @privateRemarks
 * **NOT FOR INTERNAL CONSUMPTION**
 * @module midnight-smoker/pkg-manager
 * @public
 * @todo Audit these exports--what does `plugin-default` actually need?
 */

export * from '#defs/pkg-manager';

export * from '#error/pkg-manager';

export * from '#schema/desired-pkg-manager';

export type {ExecOutput} from '#schema/exec-output';

export * from '#schema/install-manifest';

export * from '#schema/install-result';

export * from '#schema/pack-options';

export * from '#schema/run-script-manifest';

export * from '#schema/run-script-result';

export * from '#schema/static-pkg-manager-spec';

export * from '#schema/version';

export * from '#schema/workspace-info';

export * from '#util/result';

export * from './pkg-manager-spec';

export * from './version-normalizer';

export {SemVer} from 'semver';

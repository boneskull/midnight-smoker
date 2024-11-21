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

export * from '#schema/pkg-manager/desired-pkg-manager';

export type {ExecOutput} from '#schema/exec/exec-output';

export * from '#schema/pkg-manager/install-manifest';

export * from '#schema/pkg-manager/install-result';

export * from '#schema/pkg-manager/pack-options';

export * from '#schema/pkg-manager/run-script-manifest';

export * from '#schema/pkg-manager/run-script-result';

export * from '#schema/pkg-manager/static-pkg-manager-spec';

export * from '#schema/util/version';

export * from '#schema/workspace-info';

export * from '#util/result';

export * from './pkg-manager-spec';

export * from './version-normalizer';

export {SemVer} from 'semver';

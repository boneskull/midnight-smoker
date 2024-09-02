import {type StaticPluginMetadata} from '#plugin/static-plugin-metadata';
import {type SmokerOptions} from '#schema/smoker-options';
import {type PackageJson} from 'type-fest';

/**
 * The reporter context is like a `this`, but it's passed as an argument.
 *
 * The context has some base properties that are always available, and the
 * implementor can define extra properties as desired.
 */
export type ReporterContext<Ctx = unknown> = {
  opts: SmokerOptions;
  pkgJson: PackageJson;
  plugin: StaticPluginMetadata;
  signal: AbortSignal;
} & Ctx;

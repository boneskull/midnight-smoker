/**
 * Defines the {@link ReporterDef} type.
 *
 * @packageDocumentation
 */

import {z} from 'zod';
import {zBaseSmokerOptions} from '../../options/options';
import {
  customSchema,
  zDefaultTrue,
  zEventEmitter,
  zNonEmptyString,
  zPackageJson,
} from '../../util/schema-util';
import type {
  ReporterDef,
  ReporterFn,
  ReporterParams,
  ReporterWhenFn,
} from '../reporter/reporter-types';

export const zConsole = customSchema<Console>();

export const zWritableStream = customSchema<NodeJS.WritableStream>();

export const zReporterParams = customSchema<ReporterParams>(
  z.object({
    console: zConsole,
    emitter: zEventEmitter,
    opts: zBaseSmokerOptions,
    pkgJson: zPackageJson,
    stdout: zWritableStream,
    stderr: zWritableStream,
  }),
);

export const zReporterFn = customSchema<ReporterFn>(
  z
    .function(z.tuple([zReporterParams] as [typeof zReporterParams]))
    .returns(z.void()),
);

export const zWhenFn = customSchema<ReporterWhenFn>(
  z
    .function(
      z.tuple([zBaseSmokerOptions] as [opts: typeof zBaseSmokerOptions]),
    )
    .returns(z.boolean()),
);

export const zWritableStreamOrFn = z.union([
  zWritableStream,
  z.function().returns(zWritableStream),
  z.function().returns(z.promise(zWritableStream)),
]);

export const zReporterDef = customSchema<ReporterDef>(
  z.object({
    description: zNonEmptyString,
    isReporter: zDefaultTrue,
    name: zNonEmptyString,
    reporter: zReporterFn,
    stdout: zWritableStreamOrFn.optional(),
    stderr: zWritableStreamOrFn.optional(),
    when: zWhenFn.optional(),
  }),
);

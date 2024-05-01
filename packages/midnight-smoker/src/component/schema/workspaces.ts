import {
  NonEmptyStringArraySchema,
  NonEmptyStringSchema,
} from '#util/schema-util';
import {type Opaque} from 'type-fest';
import {z} from 'zod';

export const WorkspacesSchema = NonEmptyStringArraySchema;

export const WorkspacesConfigSchema = WorkspacesSchema.or(
  z
    .object({
      packages: NonEmptyStringArraySchema,
    })
    .transform(({packages}) => packages)
    .pipe(WorkspacesSchema),
);

export const WorkspaceInfoSchema = z.object({
  pkgName: NonEmptyStringSchema,
  localPath: NonEmptyStringSchema,
});

export type WorkspaceInfo = Opaque<
  z.infer<typeof WorkspaceInfoSchema>,
  'WorkspaceInfo'
>;

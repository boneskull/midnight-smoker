import {
  NonEmptyStringArraySchema,
  NonEmptyStringSchema,
  PackageJsonSchema,
} from '#util/schema-util';
import {type Except} from 'type-fest';
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

export const WorkspaceInfoSchema = z.strictObject({
  pkgName: NonEmptyStringSchema,
  localPath: NonEmptyStringSchema,
  pkgJson: PackageJsonSchema,
  pkgJsonPath: NonEmptyStringSchema,
});

export type WorkspaceInfo = z.infer<typeof WorkspaceInfoSchema>;

export function asResultSchema<T extends typeof WorkspaceInfoSchema>(
  schema: T,
) {
  return schema.omit({pkgJson: true}).strict();
}

export type Result<T extends Partial<WorkspaceInfo>> = Except<
  T,
  'pkgJson',
  {requireExactProps: true}
>;

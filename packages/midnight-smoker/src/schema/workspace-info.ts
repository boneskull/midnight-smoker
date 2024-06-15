import {
  NonEmptyStringArraySchema,
  NonEmptyStringSchema,
  PackageJsonSchema,
} from '#util/schema-util';
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

export type WorkspaceInfoLike = Partial<WorkspaceInfo>;

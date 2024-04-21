import {z} from 'zod';
import {NonEmptyStringArraySchema} from '../../util';

export const WorkspacesSchema = NonEmptyStringArraySchema;

export const WorkspacesConfigSchema = WorkspacesSchema.or(
  z
    .object({
      packages: NonEmptyStringArraySchema,
    })
    .transform(({packages}) => packages)
    .pipe(WorkspacesSchema),
);

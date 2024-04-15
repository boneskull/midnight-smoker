import {NonEmptyStringSchema, NonNegativeIntSchema} from '#util/schema-util';
import {z} from 'zod';

export type PackOptions = z.infer<typeof PackOptionsSchema>;

export const PackOptionsSchema = z
  .object({
    cwd: NonEmptyStringSchema.optional().describe(
      'The current working directory',
    ),
    allWorkspaces: z
      .boolean()
      .optional()
      .describe('If true, pack all workspaces'),
    includeWorkspaceRoot: z
      .boolean()
      .optional()
      .describe('Include the workspace root when packing'),
    workspaces: z
      .array(NonEmptyStringSchema)
      .optional()
      .describe('List of workspaces to pack'),
    timeout: NonNegativeIntSchema.optional().describe(
      'Timeout for packing operation (in ms)',
    ),
  })
  .describe('Options for a Packer component');

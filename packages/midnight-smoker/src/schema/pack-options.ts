import {NonEmptyStringSchema, NonNegativeIntSchema} from '#util/schema-util';
import {z} from 'zod';

export type PackOptions = z.infer<typeof PackOptionsSchema>;

export const PackOptionsSchema = z
  .object({
    allWorkspaces: z
      .boolean()
      .optional()
      .describe('If true, pack all workspaces'),
    cwd: NonEmptyStringSchema.describe('The current working directory'),
    // includeWorkspaceRoot: z
    //   .boolean()
    //   .optional()
    timeout: NonNegativeIntSchema.optional().describe(
      'Timeout for packing operation (in ms)',
    ),
    //   .describe('Include the workspace root when packing'),
    workspaces: z
      .array(NonEmptyStringSchema)
      .optional()
      .describe('List of workspaces to pack'),
  })
  .describe('Options for a Packer component');

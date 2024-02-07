import {z} from 'zod';
import {NonEmptyStringSchema} from '../../util/schema-util';

export type PackOptions = z.infer<typeof PackOptionsSchema>;
export const PackOptionsSchema = z
  .object({
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
  })
  .describe('Options for a Packer component');

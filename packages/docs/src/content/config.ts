import {docsSchema} from '@astrojs/starlight/schema';
import {z} from 'astro/zod';
import {defineCollection} from 'astro:content';

export const collections = {
  docs: defineCollection({schema: docsSchema()}),
  'rule-examples': defineCollection({
    schema: z.object({
      description: z.string().min(1).optional(),
      label: z.string().min(1),
      rule: z.string().min(1).optional(),
    }),
  }),
};

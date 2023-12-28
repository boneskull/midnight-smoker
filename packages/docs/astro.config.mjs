// @ts-check

import starlight from '@astrojs/starlight';
import {defineConfig} from 'astro/config';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import remarkCodeImport from 'remark-code-import';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const exampleDir = path.resolve(__dirname, '..', '..', 'example');

// https://astro.build/config
export default defineConfig({
  site: 'https://boneskull.github.io/midnight-smoker',
  integrations: [
    starlight({
      title: 'midnight-smoker',
      logo: {
        src: './src/assets/logo.svg',
      },
      social: {
        github: 'https://github.com/boneskull/midnight-smoker',
      },
      customCss: ['./src/styles/main.css'],
      sidebar: [
        {
          label: 'Guides',
          autogenerate: {
            directory: 'guides',
          },
        },
        {
          label: 'Reference',
          autogenerate: {
            directory: 'reference',
          },
        },
      ],
      components: {
        Footer: './src/components/Footer.astro',
      },
    }),
  ],
  markdown: {
    remarkPlugins: [
      // @ts-expect-error - nonsense type
      remarkCodeImport.bind(null, {rootDir: exampleDir}),
    ],
  },
});

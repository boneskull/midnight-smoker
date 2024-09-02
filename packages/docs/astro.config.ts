import type {RemarkPlugin} from '@astrojs/markdown-remark';

import starlight from '@astrojs/starlight';
import {defineConfig} from 'astro/config';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import remarkCodeImport from 'remark-code-import';
import starlightTypeDocPlugin, {typeDocSidebarGroup} from 'starlight-typedoc';

import {rehypeAutolink} from './plugin/rehype-autolink';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const exampleDir = path.resolve(__dirname, '..', '..', 'example');

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      components: {
        Footer: './src/components/Footer.astro',
      },
      customCss: ['./src/styles/main.css'],
      logo: {
        src: './src/assets/logo.svg',
      },
      plugins: [
        starlightTypeDocPlugin({
          entryPoints: [
            '../midnight-smoker',
            '../plugin-default',
            '../test-util',
          ],
          sidebar: {
            collapsed: true,
          },
          tsconfig: '../../tsconfig.json',
          typeDoc: {
            entryPointStrategy: 'packages',
            hideGenerator: true,
            plugin: ['typedoc-plugin-zod', 'typedoc-plugin-mdn-links'],
            // broken in v4.0.0-next.38
            // useCodeBlocks: true,
          },
        }),
      ],
      sidebar: [
        {
          items: [
            {label: 'Getting Started', link: '/guides/getting-started'},
            {label: 'General Usage', link: '/guides/usage'},
            {label: 'Configuration', link: '/guides/config'},
            {label: 'Using Custom Scripts', link: '/guides/custom-scripts'},
            {label: 'Using Plugins', link: '/guides/plugins'},
          ],
          label: 'Guides',
        },
        {
          items: [
            {label: 'Overview', link: '/reference'},
            {label: 'CLI', link: '/reference/cli'},
            {label: 'Configuration', link: '/reference/config'},
            {label: 'Rules', link: '/reference/rules'},
          ],
          label: 'Reference',
        },
        {
          items: [
            {label: 'Overview', link: '/developer'},
            {label: 'Developing Plugins', link: '/developer/plugin-overview'},
            {label: 'Creating Rules', link: '/developer/plugin-rule'},
            {label: 'Creating Reporters', link: '/developer/plugin-reporter'},
          ],
          label: 'Development',
        },
        typeDocSidebarGroup,
      ],
      social: {
        github: 'https://github.com/boneskull/midnight-smoker',
      },
      title: 'midnight-smoker',
    }),
  ],
  markdown: {
    rehypePlugins: [...rehypeAutolink()],
    remarkPlugins: [[remarkCodeImport as RemarkPlugin, {rootDir: exampleDir}]],
  },
  site: 'https://boneskull.github.io/midnight-smoker',
});

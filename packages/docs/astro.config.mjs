import starlight from '@astrojs/starlight';
import {defineConfig} from 'astro/config';

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
});

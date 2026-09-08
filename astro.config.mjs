import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';


// 배포 주소. 커스텀 도메인을 붙이면 여기만 바꾸면 됩니다.
// 예) 'https://notquitenowhere.com'  또는  'https://notquitenowhere.github.io'
const SITE = process.env.SITE_URL ?? 'https://notquitenowhere.github.io';

export default defineConfig({
  site: SITE,
  trailingSlash: 'ignore',
  integrations: [mdx(), sitemap()],
  markdown: {

    shikiConfig: {
      themes: { light: 'vitesse-light', dark: 'vitesse-dark' },
      wrap: true,
    },
  },
  build: { format: 'directory' },
});

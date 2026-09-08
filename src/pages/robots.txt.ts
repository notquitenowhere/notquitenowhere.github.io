import type { APIRoute } from 'astro';

/** robots.txt 는 사이트 주소가 바뀌어도 따라오도록 라우트로 만든다. */
export const GET: APIRoute = ({ site }) =>
  new Response(
    `User-agent: *
Allow: /

Sitemap: ${new URL('sitemap-index.xml', site)}
`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );

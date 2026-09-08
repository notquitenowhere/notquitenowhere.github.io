import type { APIRoute } from 'astro';
import { SITE, THEME } from '../consts';

/**
 * RSS 를 브라우저에서 열었을 때 쓰이는 껍데기.
 *
 * 피드 자체는 기계가 읽는 XML 이지만, 사람이 주소를 눌러 들어오는 일도 있습니다.
 * 그때 날것의 XML 대신 이 쪽이 보입니다. 피드 리더는 이 파일을 무시합니다.
 */
export const GET: APIRoute = () => {
  const l = THEME.light;
  const d = THEME.dark;

  const xsl = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="ko">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title><xsl:value-of select="/rss/channel/title"/> — 구독</title>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&amp;family=Hahmlet:wght@300..700&amp;display=swap"/>
        <style>
          :root {
            --paper: ${l.paper}; --ink: ${l.ink}; --accent: ${l.accent};
            color-scheme: light;
          }
          @media (prefers-color-scheme: dark) {
            :root { --paper: ${d.paper}; --ink: ${d.ink}; --accent: ${d.accent}; color-scheme: dark; }
          }
          :root {
            --ink-2: color-mix(in srgb, var(--ink) 74%, var(--paper));
            --ink-3: color-mix(in srgb, var(--ink) 48%, var(--paper));
            --rule:  color-mix(in srgb, var(--ink) 13%, var(--paper));
          }
          * { box-sizing: border-box; }
          body {
            margin: 0; background: var(--paper); color: var(--ink);
            font-family: "Gowun Batang", Georgia, serif;
            line-height: 1.9; word-break: keep-all;
            -webkit-font-smoothing: antialiased;
          }
          .wrap { width: min(100% - 2.5rem, 44rem); margin: 0 auto; padding: clamp(3rem,9vw,6rem) 0 5rem; }
          .label {
            font-family: system-ui, sans-serif; font-size: 11px; letter-spacing: .14em;
            text-transform: uppercase; color: var(--ink-3); margin: 0;
          }
          h1 {
            font-family: "Hahmlet", serif; font-weight: 400; letter-spacing: -.035em;
            font-size: clamp(2rem,6vw,3rem); line-height: 1.1; margin: .5rem 0 0;
          }
          .lede { color: var(--ink-2); margin: 1rem 0 0; max-width: 32rem; }
          .how {
            margin: 2.5rem 0 0; padding: 1.1rem 1.3rem;
            border-left: 2px solid var(--accent); background: color-mix(in srgb, var(--accent) 7%, var(--paper));
            font-size: .95rem; line-height: 1.85;
          }
          .how code {
            font-family: ui-monospace, monospace; font-size: .88em;
            background: color-mix(in srgb, var(--ink) 7%, var(--paper));
            padding: .1em .4em; border-radius: 3px; word-break: break-all;
          }
          .items { margin-top: 3.5rem; border-top: 1px solid var(--rule); }
          .item { padding: 1.6rem 0; border-bottom: 1px solid var(--rule); }
          .item a {
            font-family: "Hahmlet", serif; font-size: 1.3rem; font-weight: 400;
            letter-spacing: -.025em; color: inherit; text-decoration: none;
          }
          .item a:hover { color: var(--accent); }
          .item p { color: var(--ink-2); font-size: .95rem; margin: .5rem 0 0; }
          .empty { padding: 3rem 0; color: var(--ink-3); }
          .home {
            display: inline-block; margin-top: 3rem; color: var(--ink-2);
            font-family: system-ui, sans-serif; font-size: .9rem; text-decoration: none;
          }
          .home:hover { color: var(--accent); }
        </style>
      </head>

      <body>
        <div class="wrap">
          <p class="label">RSS 피드</p>
          <h1><xsl:value-of select="/rss/channel/title"/></h1>
          <p class="lede"><xsl:value-of select="/rss/channel/description"/></p>

          <div class="how">
            이 쪽은 <strong>구독용 주소</strong>입니다. 아래 주소를 쓰는 피드 리더에 넣으면
            새 글이 올라올 때마다 받아볼 수 있습니다.<br/>
            <code><xsl:value-of select="/rss/channel/link"/>/rss.xml</code>
          </div>

          <div class="items">
            <xsl:for-each select="/rss/channel/item">
              <div class="item">
                <a href="{link}"><xsl:value-of select="title"/></a>
                <p><xsl:value-of select="description"/></p>
              </div>
            </xsl:for-each>
            <xsl:if test="not(/rss/channel/item)">
              <p class="empty">아직 올린 글이 없습니다.</p>
            </xsl:if>
          </div>

          <a class="home" href="{/rss/channel/link}">← ${SITE.title}</a>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
`;

  return new Response(xsl, {
    headers: { 'Content-Type': 'application/xslt+xml; charset=utf-8' },
  });
};

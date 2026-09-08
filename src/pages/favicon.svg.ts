import type { APIRoute } from 'astro';
import { THEME } from '../consts';

/**
 * 파비콘도 「페이지 → 색」에서 고른 색을 따라갑니다.
 * 정적 파일이 아니라 라우트라, 색을 바꾸면 다음 빌드에 함께 바뀝니다.
 */
export const GET: APIRoute = () => {
  const l = THEME.light;
  const d = THEME.dark;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <style>
    .bg   { fill: ${l.paper}; }
    .mark { fill: ${l.accent}; }
    .hole { fill: ${l.paper}; }
    @media (prefers-color-scheme: dark) {
      .bg   { fill: ${d.paper}; }
      .mark { fill: ${d.accent}; }
      .hole { fill: ${d.paper}; }
    }
  </style>
  <rect class="bg" width="64" height="64" rx="14"/>
  <g transform="rotate(-9 32 30)">
    <path class="mark" d="M32 9c7.6 0 13.8 6.2 13.8 13.8 0 9-10.8 19.8-13 21.9a1.2 1.2 0 0 1-1.6 0c-2.2-2.1-13-12.9-13-21.9C18.2 15.2 24.4 9 32 9Z"/>
    <circle class="hole" cx="32" cy="22.2" r="5.1"/>
  </g>
  <ellipse class="mark" cx="32" cy="52" rx="4.8" ry="2.2" opacity="0.3"/>
</svg>
`;

  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' },
  });
};

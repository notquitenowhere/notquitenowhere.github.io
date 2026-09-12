import data from './data/site.json';

/**
 * 사이트의 모든 문구는 src/data/site.json 한 곳에 있습니다.
 * 편집기(`npm run write`)의 「페이지」 탭에서 고칠 수 있고,
 * 파일을 직접 열어 고쳐도 됩니다.
 */
export const SITE = data.site;
/** '노트'는 개인 메모장이라 실제 배포본 메뉴에는 넣지 않는다 — 로컬 개발 중에만 보인다. */
export const NAV = data.nav.filter((item) => import.meta.env.DEV || item.href !== '/notes');
export const BANNERS = data.banners;
export const THEME = data.theme;

export type Banner = { kicker?: string; title?: string; lede?: string };

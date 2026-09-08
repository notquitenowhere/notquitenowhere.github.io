import data from './data/site.json';

/**
 * 사이트의 모든 문구는 src/data/site.json 한 곳에 있습니다.
 * 편집기(`npm run write`)의 「페이지」 탭에서 고칠 수 있고,
 * 파일을 직접 열어 고쳐도 됩니다.
 */
export const SITE = data.site;
export const NAV = data.nav;
export const BANNERS = data.banners;

export type Banner = { kicker?: string; title?: string; lede?: string };

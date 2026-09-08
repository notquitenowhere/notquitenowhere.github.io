export const SITE = {
  /** 사이트 이름 — 로고 자리에 조판됩니다. */
  title: 'notquitenowhere',
  /**
   * 워드마크를 두 굵기로 나누는 지점(글자 수).
   * 8이면 not quite | nowhere 로 갈라져 한 낱말 안에 리듬이 생깁니다.
   * 0으로 두면 균일하게 조판됩니다.
   */
  titleSplitAt: 8,
  /** 이름 옆에 작게 붙는 글씨. 쓰는 사람이 누구인지. */
  titleLatin: '최아성',
  /** 한 줄 소개. 홈 상단과 메타 태그에 쓰입니다. */
  description: '읽고, 생각하고, 남겨두는 곳. 기술과 사람 사이에서 오래 붙잡고 있던 문장들.',
  /** 저자 */
  author: '최아성',
  email: 'ahseongchoi@gmail.com',
  /** 사이트 시작 연도 — 푸터 저작권 표기 */
  since: 2026,
  /** 소셜/외부 링크. 비우면 표시되지 않습니다. */
  links: [
    { label: 'GitHub', href: 'https://github.com/ahseongchoi' },
    { label: 'Email', href: 'mailto:ahseongchoi@gmail.com' },
    { label: 'RSS', href: '/rss.xml' },
  ],
} as const;

export const NAV = [
  { label: '글', sub: 'Essays', href: '/essays' },
  { label: '노트', sub: 'Notes', href: '/notes' },
  { label: '연대기', sub: 'Archive', href: '/archive' },
  { label: '소개', sub: 'About', href: '/about' },
];

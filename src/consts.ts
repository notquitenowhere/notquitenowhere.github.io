export const SITE = {
  /** 사이트 이름 — 로고 자리에 조판됩니다. */
  title: '아성',
  /** 로마자 표기 — 한글 옆에 작게 붙습니다. */
  titleLatin: 'Ahseong Choi',
  /** 한 줄 소개. 홈 상단과 메타 태그에 쓰입니다. */
  description: '읽고, 생각하고, 남겨두는 곳. 기술과 사람 사이에서 오래 붙잡고 있던 문장들.',
  /** 저자 */
  author: 'Ahseong Choi',
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

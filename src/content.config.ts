import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 값을 비워둔 항목(`subtitle:`)은 YAML에서 null이 된다. 빈 문자열도 마찬가지로
 * "안 쓴 것"으로 봐야 하므로, 셋 다 undefined 로 모아준다.
 * 프런트매터에 빈 줄을 남겨둬도 빌드가 깨지지 않게 하려는 것.
 */
const optionalText = z
  .string()
  .nullish()
  .transform((v) => {
    const trimmed = v?.trim();
    return trimmed ? trimmed : undefined;
  });

const optionalUrl = optionalText.refine(
  (v) => v === undefined || /^https?:\/\/|^mailto:/.test(v),
  { message: 'http(s):// 또는 mailto: 로 시작하는 주소여야 합니다' },
);

const essays = defineCollection({
  loader: glob({ base: './src/content/essays', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    /** 부제 — 제목 아래 한 줄. 없으면 생략됩니다. */
    subtitle: optionalText,
    /** 목록에 쓰이는 발췌. 없으면 본문 앞부분을 씁니다. */
    excerpt: optionalText,
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).nullish().transform((v) => v ?? []),
    /** 이 글만의 강조색. 링크·드롭캡·괘선에 반영됩니다. */
    accent: optionalText,
    /** 표지 이미지 (public/ 기준 경로 또는 절대 URL) */
    cover: optionalText,
    coverAlt: optionalText,
    /** 이미지 대신 쓸 큰 조판용 헤드라인 (없으면 title) */
    kicker: optionalText,
    /** 홈 상단에 크게 걸 글 */
    featured: z.boolean().nullish().transform((v) => v ?? false),
    draft: z.boolean().nullish().transform((v) => v ?? false),
  }),
});

const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).nullish().transform((v) => v ?? []),
    /** 인용한 출처가 있으면 */
    source: optionalText,
    sourceUrl: optionalUrl,
    draft: z.boolean().nullish().transform((v) => v ?? false),
  }),
});

export const collections = { essays, notes };

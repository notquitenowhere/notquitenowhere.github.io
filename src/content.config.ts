import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const essays = defineCollection({
  loader: glob({ base: './src/content/essays', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    /** 부제 — 제목 아래 한 줄. 없으면 생략됩니다. */
    subtitle: z.string().optional(),
    /** 목록에 쓰이는 발췌. 없으면 본문 앞부분을 씁니다. */
    excerpt: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    /** 이 글만의 강조색. 링크·드롭캡·괘선에 반영됩니다. */
    accent: z.string().optional(),
    /** 표지 이미지 (public/ 기준 경로 또는 절대 URL) */
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    /** 이미지 대신 쓸 큰 조판용 헤드라인 (없으면 title) */
    kicker: z.string().optional(),
    /** 홈 상단에 크게 걸 글 */
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    /** 인용한 출처가 있으면 */
    source: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { essays, notes };

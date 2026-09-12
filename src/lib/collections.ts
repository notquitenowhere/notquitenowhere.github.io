import { getCollection, type CollectionEntry } from 'astro:content';

const visible = ({ data }: { data: { draft: boolean } }) => import.meta.env.DEV || !data.draft;

export async function allEssays(): Promise<CollectionEntry<'essays'>[]> {
  const items = await getCollection('essays', visible);
  return items.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** 노트는 개인 메모장이라 실제 배포본에는 올리지 않는다 — 로컬 개발 중에만 보인다. */
export async function allNotes(): Promise<CollectionEntry<'notes'>[]> {
  if (!import.meta.env.DEV) return [];
  const items = await getCollection('notes', visible);
  return items.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function tagCounts() {
  const essays = await allEssays();
  const map = new Map<string, number>();
  for (const e of essays) for (const t of e.data.tags) map.set(t, (map.get(t) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
}

import { getCollection, type CollectionEntry } from 'astro:content';

const visible = ({ data }: { data: { draft: boolean } }) => import.meta.env.DEV || !data.draft;

export async function allEssays(): Promise<CollectionEntry<'essays'>[]> {
  const items = await getCollection('essays', visible);
  return items.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function allNotes(): Promise<CollectionEntry<'notes'>[]> {
  const items = await getCollection('notes', visible);
  return items.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function tagCounts() {
  const essays = await allEssays();
  const map = new Map<string, number>();
  for (const e of essays) for (const t of e.data.tags) map.set(t, (map.get(t) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'));
}

import rss from '@astrojs/rss';
import { SITE } from '../consts';
import { allEssays, allNotes } from '../lib/collections';
import { autoExcerpt } from '../lib/text';

export async function GET(context) {
  const essays = await allEssays();
  const notes = await allNotes();

  const items = [
    ...essays.map((e) => ({
      title: e.data.title,
      pubDate: e.data.date,
      description: e.data.excerpt ?? e.data.subtitle ?? autoExcerpt(e.body, 220),
      link: `/essays/${e.id}`,
      categories: e.data.tags,
    })),
    ...notes.map((n) => ({
      title: n.data.title,
      pubDate: n.data.date,
      description: autoExcerpt(n.body, 220),
      link: `/notes#${n.id}`,
      categories: n.data.tags,
    })),
  ].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return rss({
    title: `${SITE.title} — ${SITE.titleLatin}`,
    description: SITE.description,
    site: context.site,
    items,
    // 브라우저로 열었을 때 사람이 읽을 수 있게 (피드 리더는 무시합니다)
    stylesheet: '/rss.xsl',
    // 끄지 않으면 주소 끝에 / 가 붙어 노트의 #앵커가 깨진다
    //   /notes#slug/  ← 이렇게
    trailingSlash: false,
    customData: '<language>ko</language>',
  });
}

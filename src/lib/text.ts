/** 마크다운 원문에서 사람이 읽는 텍스트만 남긴다. */
export function plain(md = ''): string {
  return md
    .replace(/^---[\s\S]*?---/, '')          // 프런트매터
    .replace(/```[\s\S]*?```/g, ' ')          // 코드 블록
    .replace(/`[^`]*`/g, ' ')                  // 인라인 코드
    .replace(/<[^>]+>/g, ' ')                  // JSX·HTML 태그
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')   // 이미지
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 링크는 글자만
    .replace(/^[>#\-*+]\s*/gm, '')            // 인용·제목·목록 기호
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 한글 500자/분, 라틴 230단어/분으로 잡은 읽기 시간. */
export function readingMinutes(md = ''): number {
  const text = plain(md);
  const hangul = (text.match(/[가-힣]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z0-9']+/g) ?? []).length;
  return Math.max(1, Math.round(hangul / 500 + latin / 230));
}

/** 발췌가 없을 때 본문 앞부분을 잘라 쓴다. */
export function autoExcerpt(md = '', max = 96): string {
  const text = plain(md);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('다. '), cut.lastIndexOf(' '));
  return (stop > max * 0.5 ? cut.slice(0, stop) : cut).trim() + '…';
}

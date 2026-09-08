#!/usr/bin/env node
/**
 * 새 글의 뼈대를 만든다.
 *   npm run new -- "제목" [--note] [--slug my-slug]
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const isNote = args.includes('--note');
const title = args.find((a) => !a.startsWith('--')) ?? '제목 없음';

const slugFlag = args.indexOf('--slug');
const slug =
  slugFlag > -1
    ? args[slugFlag + 1]
    : title
        .toLowerCase()
        .replace(/[^가-힣a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || String(Date.now());

const today = new Date().toISOString().slice(0, 10);
const dir = path.join('src', 'content', isNote ? 'notes' : 'essays');
const ext = isNote ? 'md' : 'mdx';
const file = path.join(dir, `${slug}.${ext}`);

if (existsSync(file)) {
  console.error(`이미 있습니다: ${file}`);
  process.exit(1);
}

const essay = `---
title: ${title}
date: ${today}
tags: []
draft: true
# 아래는 선택 항목입니다. 쓸 때 # 을 지우세요.
# subtitle: 제목 아래 붙는 한 줄
# excerpt: 목록에 쓸 발췌 (없으면 본문 앞부분을 자동으로 씁니다)
# accent: '#a8321e'    이 글만의 강조색
# featured: true       홈 맨 위에 크게 걸기
---

여기서부터 씁니다.

{/* 쓸 수 있는 것들 —
    각주는 마크다운 그대로: 문장[^1] ... 아래에 [^1]: 설명
    <Sidenote n="1">여백에 붙는 주석</Sidenote>
    <Pullquote cite="출처">크게 거는 문장</Pullquote>
    <Figure src="/images/foo.jpg" alt="설명" caption="캡션" size="wide" />
*/}
`;

const note = `---
title: ${title}
date: ${today}
tags: []
draft: true
# 인용한 곳이 있으면
# source: 누구의 말
# sourceUrl: https://...
---

짧게 적습니다.
`;

await mkdir(dir, { recursive: true });
await writeFile(file, isNote ? note : essay, 'utf8');
console.log(`만들었습니다 → ${file}`);

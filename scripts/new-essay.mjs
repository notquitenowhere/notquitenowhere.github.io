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
subtitle:
excerpt:
date: ${today}
tags: []
draft: true
---

여기서부터 씁니다.
`;

const note = `---
title: ${title}
date: ${today}
tags: []
draft: true
---

짧게 적습니다.
`;

await mkdir(dir, { recursive: true });
await writeFile(file, isNote ? note : essay, 'utf8');
console.log(`만들었습니다 → ${file}`);

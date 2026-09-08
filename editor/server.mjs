#!/usr/bin/env node
/**
 * 글 편집기 — 로컬 전용.
 *
 *   npm run write   →  http://localhost:4322
 *
 * 127.0.0.1 에만 묶여 있어 바깥에서는 접속할 수 없다.
 * 하는 일은 세 가지뿐이다: 콘텐츠 파일 읽고 쓰기, 이미지 저장, git 발행.
 */
import http from 'node:http';
import { readFile, writeFile, readdir, mkdir, rename, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import YAML from 'yaml';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const UI = path.join(ROOT, 'editor', 'ui');
const IMAGES = path.join(ROOT, 'public', 'images');
const DIRS = {
  essays: path.join(ROOT, 'src', 'content', 'essays'),
  notes: path.join(ROOT, 'src', 'content', 'notes'),
  pages: path.join(ROOT, 'src', 'content', 'pages'),
};
const SITE_JSON = path.join(ROOT, 'src', 'data', 'site.json');

const PORT = Number(process.env.EDITOR_PORT ?? 4322);

/* ── 파일 경로 안전장치 ──────────────────────────────────────────────── */

/** 콘텐츠 폴더 밖으로 나가는 경로는 거부한다. */
function resolveContent(rel) {
  if (typeof rel !== 'string' || !rel) throw new HttpError(400, '파일 경로가 없습니다');
  const full = path.resolve(ROOT, rel);
  const ok = Object.values(DIRS).some((d) => full.startsWith(d + path.sep));
  if (!ok) throw new HttpError(403, '콘텐츠 폴더 밖의 파일입니다');
  if (!/\.mdx?$/.test(full)) throw new HttpError(403, '마크다운 파일이 아닙니다');
  return full;
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/* ── 프런트매터 ─────────────────────────────────────────────────────── */

const FM = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function parsePost(raw) {
  const m = raw.match(FM);
  if (!m) return { data: {}, body: raw.trim() };
  let data = {};
  try {
    data = YAML.parse(m[1]) ?? {};
  } catch {
    data = {};
  }
  return { data, body: raw.slice(m[0].length).replace(/^\n+/, '') };
}

/** 날짜는 항상 YYYY-MM-DD 문자열로 다룬다. 시간대 때문에 하루씩 밀리는 걸 막는다. */
function toDateString(v) {
  if (!v) return new Date().toISOString().slice(0, 10);
  if (v instanceof Date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
  }
  return String(v).slice(0, 10);
}

/** 편집기가 보낸 값을 파일에 쓸 순서대로 정리한다. 빈 값은 아예 넣지 않는다. */
function buildPost(kind, data, body) {
  const out = {};
  out.title = String(data.title ?? '').trim() || '제목 없음';

  if (kind === 'pages') {
    // 고정 쪽은 날짜도 태그도 없다. 배너 세 줄과 본문뿐.
    const page = { title: out.title };
    if (data.kicker?.trim()) page.kicker = data.kicker.trim();
    if (data.lede?.trim()) page.lede = data.lede.trim();
    const yamlPage = YAML.stringify(page, { lineWidth: 0 }).trimEnd();
    return `---
${yamlPage}
---

${String(body ?? '').trim()}
`;
  }

  if (kind === 'essays') {
    if (data.subtitle?.trim()) out.subtitle = data.subtitle.trim();
    if (data.excerpt?.trim()) out.excerpt = data.excerpt.trim();
  }

  out.date = toDateString(data.date);

  const tags = (Array.isArray(data.tags) ? data.tags : [])
    .map((t) => String(t).trim())
    .filter(Boolean);
  out.tags = tags;

  if (kind === 'essays') {
    if (data.accent?.trim()) out.accent = data.accent.trim();
    if (data.cover?.trim()) out.cover = data.cover.trim();
    if (data.coverAlt?.trim()) out.coverAlt = data.coverAlt.trim();
    if (data.featured) out.featured = true;
  } else {
    if (data.source?.trim()) out.source = data.source.trim();
    if (data.sourceUrl?.trim()) out.sourceUrl = data.sourceUrl.trim();
  }

  if (data.draft) out.draft = true;

  const yaml = YAML.stringify(out, { lineWidth: 0 }).trimEnd();
  return `---\n${yaml}\n---\n\n${String(body ?? '').trim()}\n`;
}

/* ── 파일 이름 ──────────────────────────────────────────────────────── */

function slugify(title) {
  return (
    String(title)
      .toLowerCase()
      .replace(/[^가-힣a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || String(Date.now())
  );
}

/** 파일이 어느 컬렉션에 속하는지 */
function kindOf(full) {
  for (const [kind, dir] of Object.entries(DIRS)) {
    if (full.startsWith(dir + path.sep)) return kind;
  }
  return 'essays';
}

async function uniqueFile(dir, slug, ext) {
  let name = `${slug}.${ext}`;
  let i = 2;
  while (existsSync(path.join(dir, name))) name = `${slug}-${i++}.${ext}`;
  return path.join(dir, name);
}

/* ── 목록 ───────────────────────────────────────────────────────────── */

async function listPosts() {
  const out = [];
  for (const [kind, dir] of Object.entries(DIRS)) {
    let names = [];
    try {
      names = await readdir(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!/\.mdx?$/.test(name)) continue;
      const full = path.join(dir, name);
      const { data } = parsePost(await readFile(full, 'utf8'));
      out.push({
        kind,
        file: path.relative(ROOT, full).split(path.sep).join('/'),
        slug: name.replace(/\.mdx?$/, ''),
        ext: name.endsWith('.mdx') ? 'mdx' : 'md',
        title: data.title ?? name,
        date: data.date ? toDateString(data.date) : '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        draft: data.draft === true,
      });
    }
  }
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return out;
}

/* ── git ────────────────────────────────────────────────────────────── */

function git(args) {
  return new Promise((resolve) => {
    execFile('git', args, { cwd: ROOT, windowsHide: true }, (err, stdout, stderr) => {
      resolve({ ok: !err, out: (stdout || '') + (stderr || '') });
    });
  });
}

/* ── 서버 ───────────────────────────────────────────────────────────── */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.map': 'application/json',
};

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function serveFile(res, dir, rel) {
  const full = path.resolve(dir, '.' + rel);
  if (!full.startsWith(dir)) return send(res, 403, { error: '거부' });
  try {
    const buf = await readFile(full);
    send(res, 200, buf, MIME[path.extname(full)] ?? 'application/octet-stream');
  } catch {
    send(res, 404, { error: '없음' });
  }
}

function readBody(req, limit = 32 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new HttpError(413, '파일이 너무 큽니다 (32MB 넘음)'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const routes = {
  async 'GET /api/posts'() {
    return { posts: await listPosts() };
  },

  async 'GET /api/post'(req, url) {
    const full = resolveContent(url.searchParams.get('file'));
    const raw = await readFile(full, 'utf8');
    const { data, body } = parsePost(raw);
    return {
      file: path.relative(ROOT, full).split(path.sep).join('/'),
      slug: path.basename(full).replace(/\.mdx?$/, ''),
      ext: full.endsWith('.mdx') ? 'mdx' : 'md',
      kind: kindOf(full),
      data: { ...data, date: toDateString(data.date) },
      body,
    };
  },

  async 'POST /api/new'(req, url, payload) {
    const kind = payload.kind === 'notes' ? 'notes' : 'essays';
    const dir = DIRS[kind];
    await mkdir(dir, { recursive: true });
    const title = String(payload.title ?? '').trim() || '제목 없는 글';
    const file = await uniqueFile(dir, slugify(title), 'md');
    await writeFile(file, buildPost(kind, { title, draft: true }, ''), 'utf8');
    return { file: path.relative(ROOT, file).split(path.sep).join('/') };
  },

  async 'POST /api/post'(req, url, payload) {
    let full = resolveContent(payload.file);
    const kind = kindOf(full);

    // 본문에 MDX 부품이 있으면 확장자를 .mdx 로 올린다 (없으면 .md 로 유지)
    const needsMdx = /<(Sidenote|Pullquote|Figure)\b/.test(payload.body ?? '');
    const wantExt = needsMdx ? 'mdx' : 'md';

    const dir = path.dirname(full);
    const desiredSlug = slugify(payload.slug || payload.data?.title || 'untitled');
    const target = path.join(dir, `${desiredSlug}.${wantExt}`);

    let renamedFrom = null;
    if (target !== full) {
      if (existsSync(target)) throw new HttpError(409, `같은 이름의 파일이 이미 있습니다: ${desiredSlug}`);
      renamedFrom = path.relative(ROOT, full).split(path.sep).join('/');
      await rename(full, target);
      full = target;
    }

    // 내용이 같으면 손대지 않는다. 쓸데없는 수정 시각 변경과
    // 혹시 모를 변환 사고를 한 겹 더 막아준다.
    const next = buildPost(kind, payload.data ?? {}, payload.body ?? '');
    const prev = await readFile(full, 'utf8').catch(() => null);
    if (prev !== next) await writeFile(full, next, 'utf8');
    return {
      file: path.relative(ROOT, full).split(path.sep).join('/'),
      ext: wantExt,
      renamedFrom,
      url: `/${kind === 'notes' ? 'notes' : 'essays'}/${desiredSlug}`,
    };
  },

  async 'POST /api/delete'(req, url, payload) {
    const full = resolveContent(payload.file);
    await unlink(full);
    return { ok: true };
  },

  async 'POST /api/image'(req, url) {
    const raw = await readBody(req);
    const original = url.searchParams.get('name') ?? 'image';
    const ext = (path.extname(original) || '.png').toLowerCase();
    const base = slugify(path.basename(original, path.extname(original))).slice(0, 60) || 'image';
    await mkdir(IMAGES, { recursive: true });
    let name = `${base}${ext}`;
    let i = 2;
    while (existsSync(path.join(IMAGES, name))) name = `${base}-${i++}${ext}`;
    await writeFile(path.join(IMAGES, name), raw);
    return { url: `/images/${name}` };
  },

  async 'GET /api/site'() {
    return JSON.parse(await readFile(SITE_JSON, 'utf8'));
  },

  async 'POST /api/site'(req, url, payload) {
    if (!payload || typeof payload !== 'object' || !payload.site || !payload.banners) {
      throw new HttpError(400, '사이트 정보 형태가 올바르지 않습니다');
    }
    await writeFile(SITE_JSON, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    return { ok: true };
  },

  async 'GET /api/status'() {
    const branch = await git(['branch', '--show-current']);
    const status = await git(['status', '--porcelain']);
    return {
      branch: branch.out.trim(),
      dirty: status.out.trim().split('\n').filter(Boolean).length,
    };
  },

  async 'POST /api/publish'(req, url, payload) {
    const message = String(payload.message ?? '').trim() || '글 갱신';

    const add = await git(['add', '-A']);
    if (!add.ok) return { ok: false, step: 'add', out: add.out };

    // 초안은 올리지 않는다. 내 컴퓨터에만 남는다.
    // 한 번 올렸던 글을 다시 초안으로 돌리면 저장소에서도 내린다.
    const drafts = (await listPosts()).filter((p) => p.draft).map((p) => p.file);
    const held = [];
    for (const file of drafts) {
      const tracked = await git(['ls-files', '--error-unmatch', '--', file]);
      const step = tracked.ok
        ? await git(['rm', '--cached', '--quiet', '--', file])
        : await git(['reset', '--quiet', '--', file]);
      if (step.ok) held.push(file);
    }

    const staged = await git(['diff', '--cached', '--name-only']);
    if (!staged.out.trim()) {
      return { ok: false, step: 'nothing', out: '올릴 변경이 없습니다.', held };
    }

    const commit = await git(['commit', '-m', message]);
    if (!commit.ok) return { ok: false, step: 'commit', out: commit.out, held };

    const push = await git(['push', 'origin', 'HEAD']);
    return { ok: push.ok, step: push.ok ? 'done' : 'push', out: push.out, held };
  },
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const key = `${req.method} ${url.pathname}`;

  try {
    if (routes[key]) {
      const payload =
        req.method === 'POST' && !url.pathname.endsWith('/image')
          ? JSON.parse((await readBody(req)).toString('utf8') || '{}')
          : null;
      return send(res, 200, await routes[key](req, url, payload));
    }

    if (req.method === 'GET') {
      if (url.pathname.startsWith('/images/')) {
        return serveFile(res, IMAGES, url.pathname.replace('/images', ''));
      }
      return serveFile(res, UI, url.pathname === '/' ? '/index.html' : url.pathname);
    }

    send(res, 404, { error: '없는 주소' });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    send(res, status, { error: err.message ?? '알 수 없는 오류' });
  }
});

// 편집기 번들이 없으면(새로 받은 저장소 등) 시작할 때 한 번 만든다.
if (!existsSync(path.join(UI, 'vendor', 'toastui.js'))) {
  console.log('  편집기 번들을 준비합니다…');
  const { buildVendor } = await import('./build-vendor.mjs');
  await buildVendor({ quiet: true });
}

// 포트가 이미 물려 있으면 스택 트레이스 대신 사람이 읽을 수 있는 안내를 낸다.
server.on('error', async (err) => {
  if (err.code !== 'EADDRINUSE') throw err;

  // 이미 우리 편집기가 떠 있는 것인지 확인해 본다.
  let mine = false;
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/status`, {
      signal: AbortSignal.timeout(1500),
    });
    mine = res.ok;
  } catch {
    mine = false;
  }

  if (mine) {
    console.log(`\n  편집기가 이미 열려 있습니다.\n  → http://localhost:${PORT}\n`);
    console.log('  브라우저에서 그 주소를 여시면 됩니다.\n');
  } else {
    console.error(`\n  ${PORT} 번 포트를 다른 프로그램이 쓰고 있습니다.\n`);
    console.error('  둘 중 하나를 하세요.\n');
    console.error('  1) 다른 포트로 열기');
    console.error(`       EDITOR_PORT=4323 npm run write        (PowerShell: $env:EDITOR_PORT=4323; npm run write)\n`);
    console.error('  2) 그 프로그램을 끄기 (PowerShell)');
    console.error(
      `       Get-NetTCPConnection -LocalPort ${PORT} -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }\n`,
    );
  }
  process.exit(mine ? 0 : 1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  글 편집기가 열렸습니다\n  → http://localhost:${PORT}\n`);
  console.log(`  미리보기를 같이 보려면 다른 창에서: npm run dev\n`);
});

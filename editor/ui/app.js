/* 글 편집기 — 화면 쪽 전부. */

const $ = (id) => document.getElementById(id);

const state = {
  kind: 'essays',
  posts: [],
  current: null, // { file, slug, ext, kind, data, body }
  dirty: false,      // 뭐라도 바뀌었나 (저장 필요)
  bodyDirty: false,  // 본문을 사람이 직접 고쳤나
  saving: false,
  loading: false,    // 글을 여는 중에는 저장하지 않는다
  originalBody: '',  // 파일에서 읽은 본문 그대로
};

/**
 * 위지윅이 되살리지 못하는 문법들.
 * 각주·MDX 부품·직접 쓴 HTML 이 있으면 위지윅을 거치는 순간 망가지므로
 * 마크다운 모드로 연다.
 */
const UNSAFE = /<(Sidenote|Pullquote|Figure)|^\[\^[^\]]+\]:|\[\^[^\]]+\]|^<\w+/m;

let editor = null;
let saveTimer = null;
let composing = false; // 한글 조합 중에는 편집기를 건드리지 않는다

/* ── 잔심부름 ───────────────────────────────────────────────────────── */

async function api(path, options) {
  const res = await fetch(path, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `요청 실패 (${res.status})`);
  return body;
}

let toastTimer = null;
function toast(message, kind = 'ok', ms = 3200) {
  const el = $('toast');
  el.innerHTML = message;
  el.className = 'toast' + (kind === 'bad' ? ' toast--bad' : '');
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), ms);
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ── 목록 ───────────────────────────────────────────────────────────── */

async function loadList(keepSelection = true) {
  const { posts } = await api('/api/posts');
  state.posts = posts;
  renderList();
  if (keepSelection && state.current) highlight(state.current.file);
}

function renderList() {
  const ul = $('list');
  const rows = state.posts.filter((p) => p.kind === state.kind);

  if (!rows.length) {
    ul.innerHTML = `<li class="dim" style="cursor:default;padding:18px 10px">아직 없습니다.</li>`;
    return;
  }

  ul.innerHTML = rows
    .map(
      (p) => `
      <li data-file="${escapeHtml(p.file)}">
        <div class="row-title">${escapeHtml(p.title)}</div>
        <div class="row-meta">
          <span>${p.date}</span>
          ${p.draft ? '<span class="badge">초안</span>' : ''}
          ${p.ext === 'mdx' ? '<span class="badge">MDX</span>' : ''}
        </div>
      </li>`,
    )
    .join('');

  ul.querySelectorAll('li[data-file]').forEach((li) => {
    li.addEventListener('click', () => openPost(li.dataset.file));
  });
}

function highlight(file) {
  document.querySelectorAll('#list li').forEach((li) => {
    li.classList.toggle('is-on', li.dataset.file === file);
  });
}

/* ── 열기 · 채우기 ──────────────────────────────────────────────────── */

async function openPost(file) {
  if (state.dirty) await save({ quiet: true });

  const post = await api(`/api/post?file=${encodeURIComponent(file)}`);
  state.current = post;

  $('empty').hidden = true;
  $('pane').hidden = false;

  const d = post.data ?? {};
  $('title').value = d.title ?? '';
  $('subtitle').value = d.subtitle ?? '';
  $('date').value = d.date ?? '';
  $('slug').value = post.slug ?? '';
  $('tags').value = (d.tags ?? []).join(', ');
  $('excerpt').value = d.excerpt ?? '';
  $('accent').value = d.accent ?? '#a8321e';
  // 원래 강조색이 없던 글에 기본값을 몰래 심지 않는다
  $('accent').dataset.use = d.accent ? '1' : '0';
  $('source').value = d.source ?? '';
  $('sourceUrl').value = d.sourceUrl ?? '';
  $('featured').checked = d.featured === true;
  $('draft').checked = d.draft === true;

  document.querySelectorAll('[data-only]').forEach((el) => {
    el.style.display = el.dataset.only === post.kind ? '' : 'none';
  });

  // 위지윅이 되살리지 못하는 문법(각주·MDX 부품·직접 쓴 HTML)이 있으면
  // 마크다운 모드로 연다. 위지윅을 거치면 그대로 망가지기 때문.
  const unsafe = UNSAFE.test(post.body ?? '');
  $('mdx-note').hidden = !unsafe;

  state.loading = true;
  state.originalBody = post.body ?? '';
  editor.setMarkdown(state.originalBody, false);
  editor.changeMode(unsafe ? 'markdown' : 'wysiwyg', true);
  state.loading = false;

  state.dirty = false;
  state.bodyDirty = false;
  markSaved('열림');
  updateMetaPeek();
  highlight(post.file);
}

function collect() {
  const kind = state.current.kind;
  return {
    file: state.current.file,
    slug: $('slug').value.trim(),
    // 손대지 않은 본문은 편집기를 거치지 않고 원본 그대로 돌려보낸다.
    body: state.bodyDirty ? editor.getMarkdown() : state.originalBody,
    data: {
      title: $('title').value,
      subtitle: $('subtitle').value,
      excerpt: $('excerpt').value,
      date: $('date').value,
      tags: $('tags').value.split(',').map((t) => t.trim()).filter(Boolean),
      accent: $('accent').dataset.use === '1' ? $('accent').value : '',
      source: $('source').value,
      sourceUrl: $('sourceUrl').value,
      featured: kind === 'essays' && $('featured').checked,
      draft: $('draft').checked,
    },
  };
}

function updateMetaPeek() {
  const tags = $('tags').value.trim();
  $('meta-peek').textContent = [$('date').value, tags].filter(Boolean).join(' · ');
}

/* ── 저장 ───────────────────────────────────────────────────────────── */

function markSaved(text) {
  $('saved').textContent = text;
}

function touch() {
  if (state.loading || !state.current) return;
  state.dirty = true;
  markSaved('…');
  updateMetaPeek();
  clearTimeout(saveTimer);
  if (composing) return; // 조합이 끝나면 다시 건다
  saveTimer = setTimeout(() => save({ quiet: true }), 2000);
}

/** 본문이 실제로 사람 손을 탄 경우에만 다시 쓴다. */
function touchBody() {
  if (state.loading || !state.current) return;
  state.bodyDirty = true;
  touch();
}

async function save({ quiet = false } = {}) {
  if (!state.current || state.saving) return;
  if (composing) {
    // 글자를 조합하는 중에 본문을 읽으면 조합이 끊긴다. 조금 뒤에 다시.
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => save({ quiet }), 600);
    return;
  }
  state.saving = true;
  clearTimeout(saveTimer);

  try {
    const payload = collect();
    const res = await api('/api/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    state.current.file = res.file;
    state.current.ext = res.ext;
    state.originalBody = payload.body;
    state.dirty = false;
    state.bodyDirty = false;

    const now = new Date();
    markSaved(`저장됨 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);

    await loadList();
    highlight(res.file);
    if (!quiet) toast('저장했습니다.');
  } catch (err) {
    markSaved('저장 실패');
    toast(escapeHtml(err.message), 'bad', 5000);
  } finally {
    state.saving = false;
  }
}

/* ── 발행 ───────────────────────────────────────────────────────────── */

async function publish() {
  if (!state.current) return;

  if ($('draft').checked) {
    const go = confirm('이 글은 아직 초안입니다.\n초안을 풀고 사이트에 올릴까요?');
    if (!go) return;
    $('draft').checked = false;
  }

  $('publish').disabled = true;
  markSaved('올리는 중…');

  try {
    await save({ quiet: true });
    const title = $('title').value.trim() || '글';
    const res = await api('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `${title}` }),
    });

    if (res.step === 'nothing') {
      toast('올릴 변경이 없습니다. 이미 최신입니다.');
    } else if (res.ok) {
      const slug = $('slug').value.trim();
      const base = state.current.kind === 'notes' ? '/notes' : `/essays/${slug}`;
      toast(
        `올렸습니다. 30초쯤 뒤 반영됩니다.\n<a href="https://notquitenowhere.github.io${base}" target="_blank" rel="noopener">사이트에서 보기 ↗</a>`,
        'ok',
        9000,
      );
    } else {
      toast(`${res.step} 단계에서 막혔습니다:\n${escapeHtml(res.out.slice(0, 400))}`, 'bad', 12000);
    }
  } catch (err) {
    toast(escapeHtml(err.message), 'bad', 8000);
  } finally {
    $('publish').disabled = false;
    markSaved('');
    refreshStatus();
  }
}

/* ── 새 글 · 삭제 ───────────────────────────────────────────────────── */

async function newPost() {
  const title = prompt(state.kind === 'notes' ? '노트 제목' : '글 제목');
  if (title === null) return;

  const res = await api('/api/new', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: state.kind, title }),
  });

  await loadList(false);
  await openPost(res.file);
  $('title').focus();
}

async function removePost() {
  if (!state.current) return;
  const title = $('title').value || state.current.slug;
  if (!confirm(`「${title}」을(를) 지웁니다.\n되돌릴 수 없습니다. 계속할까요?`)) return;

  await api('/api/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: state.current.file }),
  });

  state.current = null;
  state.dirty = false;
  $('pane').hidden = true;
  $('empty').hidden = false;
  await loadList(false);
  toast('지웠습니다.');
}

/* ── 이미지 ─────────────────────────────────────────────────────────── */

async function uploadImage(blob, name) {
  const res = await fetch(`/api/image?name=${encodeURIComponent(name || 'image.png')}`, {
    method: 'POST',
    body: blob,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? '이미지 저장 실패');
  return body.url;
}

/* ── MDX 부품 넣기 (마크다운 모드에서) ──────────────────────────────── */

function insertBlock(text) {
  if (editor.isWysiwygMode()) {
    editor.changeMode('markdown', true);
    $('mdx-note').hidden = false;
  }
  editor.insertText('\n\n' + text + '\n\n');
  editor.focus();
  touch();
}

/* ── 상태 ───────────────────────────────────────────────────────────── */

async function refreshStatus() {
  try {
    const s = await api('/api/status');
    $('branch').textContent = s.dirty ? `${s.branch} · 안 올린 변경 ${s.dirty}` : s.branch;
  } catch {
    $('branch').textContent = '';
  }
}

/* ── 시작 ───────────────────────────────────────────────────────────── */

function boot() {
  editor = new toastui.Editor({
    el: $('body'),
    height: '100%',
    initialEditType: 'wysiwyg',
    previewStyle: 'tab',
    language: 'ko-KR',
    usageStatistics: false,
    autofocus: false,
    toolbarItems: [
      ['heading', 'bold', 'italic'],
      ['hr', 'quote'],
      ['ul', 'ol'],
      ['table', 'image', 'link'],
      ['code', 'codeblock'],
      [
        {
          name: 'sidenote',
          tooltip: '여백주석 — 본문 오른쪽 여백에 붙는 짧은 덧말',
          text: '주',
          className: 'toastui-editor-toolbar-icons',
          style: { backgroundImage: 'none', fontSize: '13px', fontWeight: '700' },
          command: 'sidenote',
        },
        {
          name: 'pullquote',
          tooltip: '큰 인용 — 본문 중간에 크게 거는 문장',
          text: '❝',
          className: 'toastui-editor-toolbar-icons',
          style: { backgroundImage: 'none', fontSize: '15px' },
          command: 'pullquote',
        },
      ],
    ],
    hooks: {
      async addImageBlobHook(blob, callback) {
        try {
          const url = await uploadImage(blob, blob.name);
          callback(url, '');
          toast(`이미지를 넣었습니다 — public${url}`);
        } catch (err) {
          toast(escapeHtml(err.message), 'bad');
        }
        return false;
      },
    },
    events: {
      change: touchBody,
    },
  });

  // 한글 조합 감시 — 조합 중 저장이 끼어들면 자모가 풀린다
  const bodyEl = $('body');
  bodyEl.addEventListener('compositionstart', () => {
    composing = true;
    clearTimeout(saveTimer);
  });
  bodyEl.addEventListener('compositionend', () => {
    composing = false;
    touchBody();
  });

  // 빨간 맞춤법 밑줄은 한글에서 거슬리기만 한다
  const noSpellcheck = () =>
    bodyEl.querySelectorAll('[contenteditable="true"], textarea').forEach((el) => {
      el.setAttribute('spellcheck', 'false');
      el.setAttribute('autocorrect', 'off');
      el.setAttribute('autocapitalize', 'off');
    });
  noSpellcheck();
  new MutationObserver(noSpellcheck).observe(bodyEl, { childList: true, subtree: true });

  // 사용자 정의 도구 버튼
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.getAttribute('aria-label')?.includes('여백주석') || btn.textContent === '주') {
      insertBlock('<Sidenote n="1">덧붙일 말을 여기에.</Sidenote>');
    } else if (btn.getAttribute('aria-label')?.includes('큰 인용') || btn.textContent === '❝') {
      insertBlock('<Pullquote cite="출처">크게 걸고 싶은 문장.</Pullquote>');
    }
  });

  // 폼 입력은 전부 자동 저장 대상
  ['title', 'subtitle', 'date', 'slug', 'tags', 'excerpt', 'source', 'sourceUrl'].forEach((id) =>
    $(id).addEventListener('input', touch),
  );
  ['accent', 'featured', 'draft'].forEach((id) => $(id).addEventListener('change', touch));

  $('accent').addEventListener('input', () => ($('accent').dataset.use = '1'));
  $('accent-clear').addEventListener('click', () => {
    $('accent').dataset.use = '0';
    $('accent').value = '#a8321e';
    touch();
    toast('사이트 기본 강조색을 씁니다.');
  });

  $('save').addEventListener('click', () => save());
  $('publish').addEventListener('click', publish);
  $('delete').addEventListener('click', removePost);
  $('new-post').addEventListener('click', newPost);
  $('refresh').addEventListener('click', () => loadList());

  document.querySelectorAll('.tab').forEach((tab) =>
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-on', t === tab));
      state.kind = tab.dataset.kind;
      renderList();
    }),
  );

  // Ctrl/Cmd + S 로 저장
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      save();
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (state.dirty) e.preventDefault();
  });

  loadList(false);
  refreshStatus();
  setInterval(refreshStatus, 20000);
}

boot();

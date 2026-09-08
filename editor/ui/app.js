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
  site: null,        // src/data/site.json 전체
  siteKey: null,     // 지금 폼에 띄운 항목 (site | home | essays | ...)
};

/** 「페이지」 탭에 뜨는 항목들. 배너 문구는 전부 여기서 고친다. */
const SITE_ITEMS = [
  { key: 'site',     name: '사이트 이름·소개' },
  { key: 'theme',    name: '색' },
  { key: 'home',     name: '홈 배너' },
  { key: 'essays',   name: '글 배너' },
  { key: 'notes',    name: '노트 배너' },
  { key: 'archive',  name: '연대기 배너' },
  { key: 'notFound', name: '없는 쪽 (404)' },
];

const BANNER_FIELDS = [
  { id: 'kicker', label: '작은 제목', tag: 'input' },
  { id: 'title',  label: '큰 제목',   tag: 'textarea', rows: 2 },
  { id: 'lede',   label: '한 줄 소개', tag: 'textarea', rows: 2 },
];

/** 고르는 색은 모드당 셋뿐. 나머지 톤은 사이트가 이 셋을 섞어 만든다. */
const THEME_FIELDS = [
  { id: 'paper',  label: '종이' },
  { id: 'ink',    label: '잉크' },
  { id: 'accent', label: '강조' },
];

/** 배경 하늘의 두 색 — 바탕과 구름. */
const SKY_FIELDS = [
  { id: 'base', label: '하늘 바탕' },
  { id: 'cloud', label: '구름' },
];

const THEME_PRESETS = [
  { name: '주칠',   light: ['#f6f3ec', '#16140f', '#a8321e'], dark: ['#14130f', '#ece7da', '#e07a56'] },
  { name: '창공',   light: ['#f2f4f9', '#111524', '#3c6cec'], dark: ['#0d1020', '#e4e8f5', '#7f9dff'] },
  { name: '쪽빛',   light: ['#f4f4f1', '#12151a', '#274c77'], dark: ['#101317', '#e6e8ea', '#7aa5d2'] },
  { name: '이끼',   light: ['#f3f4ef', '#151810', '#3f6b46'], dark: ['#101310', '#e4e8dd', '#7fb488'] },
  { name: '먹',     light: ['#f4f4f4', '#141414', '#404040'], dark: ['#121212', '#e8e8e8', '#b4b4b4'] },
  { name: '치자',   light: ['#f8f4e6', '#1a1710', '#b07d21'], dark: ['#15130d', '#efe9d8', '#d9ac52'] },
];

const SITE_FIELDS = [
  { id: 'title',       label: '사이트 이름',   tag: 'input' },
  { id: 'titleSplitAt',label: '이름을 가늘게 바꿀 위치 (글자 수)', tag: 'input', type: 'number' },
  { id: 'titleLatin',  label: '이름 옆 작은 글씨', tag: 'input' },
  { id: 'description', label: '한 줄 소개',    tag: 'textarea', rows: 2 },
  { id: 'author',      label: '저자',          tag: 'input' },
  { id: 'email',       label: '메일',          tag: 'input' },
  { id: 'since',       label: '시작 연도',      tag: 'input', type: 'number' },
];

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

  if (state.kind === 'pages') return renderPageList();

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

/** 「페이지」 탭: 배너 항목들 + 고정 쪽 콘텐츠 파일 */
function renderPageList() {
  const ul = $('list');
  const files = state.posts.filter((p) => p.kind === 'pages');

  ul.innerHTML =
    SITE_ITEMS.map(
      (it) => `<li data-site="${it.key}"><div class="row-title">${escapeHtml(it.name)}</div></li>`,
    ).join('') +
    files
      .map(
        (p) => `
        <li data-file="${escapeHtml(p.file)}">
          <div class="row-title">${escapeHtml(p.title)}</div>
          <div class="row-meta"><span>본문</span></div>
        </li>`,
      )
      .join('');

  ul.querySelectorAll('li[data-site]').forEach((li) =>
    li.addEventListener('click', () => openSite(li.dataset.site)),
  );
  ul.querySelectorAll('li[data-file]').forEach((li) =>
    li.addEventListener('click', () => openPost(li.dataset.file)),
  );
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
  $('site-pane').hidden = true;
  state.siteKey = null;
  $('pane').hidden = false;

  const d = post.data ?? {};
  $('title').value = d.title ?? '';
  $('kicker').value = d.kicker ?? '';
  $('subtitle').value = d.subtitle ?? d.lede ?? '';
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
  // 고정 쪽은 날짜도 태그도 초안도 없다
  const isPage = post.kind === 'pages';
  $('meta').style.display = isPage ? 'none' : '';
  document.querySelector('.check--draft').style.display = isPage ? 'none' : '';
  $('delete').style.display = isPage ? 'none' : '';
  $('kicker').hidden = !isPage;
  $('subtitle').placeholder = isPage ? '한 줄 소개' : '부제';

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
      // 고정 쪽에서는 부제 칸이 곧 배너의 한 줄 소개다
      kicker: $('kicker').value,
      lede: kind === 'pages' ? $('subtitle').value : '',
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

/* ── 배너·사이트 정보 ───────────────────────────────────────────────── */

/** 배너 문구의 작은 문법을 화면에서와 똑같이 그린다: *강조*, 줄바꿈 */
function richLine(text = '') {
  return escapeHtml(text)
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/\r?\n/g, '<br>');
}

/** 「색」 화면. 모드별로 종이·잉크·강조 셋만 고르고 나머지는 사이트가 섞어 만든다. */
function openTheme() {
  state.siteKey = 'theme';
  state.current = null;

  $('pane').hidden = true;
  $('empty').hidden = true;
  $('site-pane').hidden = false;
  $('site-preview').hidden = true;
  $('site-title').textContent = '색';

  const group = (mode, label) => `
    <div class="theme-col">
      <p class="theme-col__head">${label}</p>
      ${THEME_FIELDS.map((f) => {
        const v = state.site.theme[mode][f.id];
        return `<label class="theme-row">
          <input type="color" id="tf-${mode}-${f.id}" value="${escapeHtml(v)}" />
          <span>${f.label}</span>
          <input class="theme-hex" id="th-${mode}-${f.id}" value="${escapeHtml(v)}" spellcheck="false" />
        </label>`;
      }).join('')}
      ${SKY_FIELDS.map((f) => {
        const v = (state.site.theme.sky?.[mode] ?? {})[f.id] ?? '#000000';
        return `<label class="theme-row theme-row--sky">
          <input type="color" id="sf-${mode}-${f.id}" value="${escapeHtml(v)}" />
          <span>${f.label}</span>
          <input class="theme-hex" id="sh-${mode}-${f.id}" value="${escapeHtml(v)}" spellcheck="false" />
        </label>`;
      }).join('')}
      <div class="theme-preview" id="tp-${mode}"></div>
    </div>`;

  $('site-form').innerHTML = `
    <div class="theme-presets">
      ${THEME_PRESETS.map((p, i) => `<button type="button" class="btn btn--tiny" data-preset="${i}">${escapeHtml(p.name)}</button>`).join('')}
    </div>
    <div class="theme-grid">
      ${group('light', '밝을 때')}
      ${group('dark', '어두울 때')}
    </div>
    ${skyFormHtml()}`;

  $('site-form')
    .querySelectorAll('input[type="color"], .theme-hex')
    .forEach((el) => el.addEventListener('input', onThemeInput));

  $('site-form')
    .querySelectorAll('[data-preset]')
    .forEach((btn) =>
      btn.addEventListener('click', () => {
        const p = THEME_PRESETS[Number(btn.dataset.preset)];
        for (const mode of ['light', 'dark']) {
          THEME_FIELDS.forEach((f, i) => {
            $(`tf-${mode}-${f.id}`).value = p[mode][i];
            $(`th-${mode}-${f.id}`).value = p[mode][i];
          });
        }
        onThemeInput();
      }),
    );

  bindSkyForm();
  renderThemePreview();
  markSiteSaved('열림');
  document.querySelectorAll('#list li').forEach((li) => li.classList.toggle('is-on', li.dataset.site === 'theme'));
}

/** 「색」 화면 아래에 붙는 하늘 설정. */
function skyFormHtml() {
  const s = state.site.theme.sky ?? { on: true, strength: 0.55 };
  return `
    <div class="sky-box">
      <label class="check sky-on">
        <input type="checkbox" id="sky-on" ${s.on !== false ? 'checked' : ''} />
        <span>배경에 하늘</span>
      </label>
      <label class="sky-strength">
        <span>세기 <b id="sky-num">${Math.round((s.strength ?? 0.55) * 100)}</b></span>
        <input type="range" id="sky-str" min="0" max="100" step="5"
               value="${Math.round((s.strength ?? 0.55) * 100)}" />
      </label>
    </div>`;
}

function bindSkyForm() {
  const on = $('sky-on');
  const str = $('sky-str');
  if (!on || !str) return;

  const sync = () => {
    $('sky-num').textContent = str.value;
    str.disabled = !on.checked;
    touchSite();
  };
  on.addEventListener('change', sync);
  str.addEventListener('input', sync);
  str.disabled = !on.checked;
}

function onThemeInput(e) {
  // 색 고르개와 hex 칸을 서로 맞춰준다
  const el = e?.target;
  if (el?.id?.startsWith('tf-')) $(el.id.replace('tf-', 'th-')).value = el.value;
  if (el?.id?.startsWith('th-') && /^#[0-9a-fA-F]{6}$/.test(el.value)) {
    $(el.id.replace('th-', 'tf-')).value = el.value;
  }
  if (el?.id?.startsWith('sf-')) $(el.id.replace('sf-', 'sh-')).value = el.value;
  if (el?.id?.startsWith('sh-') && /^#[0-9a-fA-F]{6}$/.test(el.value)) {
    $(el.id.replace('sh-', 'sf-')).value = el.value;
  }
  renderThemePreview();
  touchSite();
}

/** 사이트와 똑같은 공식으로 섞어 미리 보여준다. */
function renderThemePreview() {
  for (const mode of ['light', 'dark']) {
    const get = (id) => $(`tf-${mode}-${id}`)?.value ?? '#000000';
    const paper = get('paper');
    const ink = get('ink');
    const accent = get('accent');
    const box = $(`tp-${mode}`);
    if (!box) continue;

    const mix = (a, b, pct) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;
    box.style.setProperty('--p', paper);
    box.style.setProperty('--i', ink);
    box.style.setProperty('--a', accent);
    box.style.setProperty('--rule', mix(ink, paper, 13));
    box.style.setProperty('--dim', mix(ink, paper, 48));
    box.style.background = paper;
    box.style.color = ink;
    box.innerHTML = `
      <p class="tp-kicker">Essays</p>
      <p class="tp-title">느리게 읽고 <em>오래</em> 씁니다.</p>
      <p class="tp-body">본문은 이런 밝기로 읽힙니다. 괘선과 흐린 글씨가 이 셋에서 나옵니다.</p>
      <p class="tp-meta">2026년 8월 24일 · 3분</p>`;
  }
}

async function openSite(key) {
  if (state.dirty) await save({ quiet: true });
  if (!state.site) state.site = await api('/api/site');
  if (key === 'theme') return openTheme();

  state.siteKey = key;
  state.current = null;

  $('pane').hidden = true;
  $('empty').hidden = true;
  $('site-pane').hidden = false;

  const isSite = key === 'site';
  const fields = isSite ? SITE_FIELDS : BANNER_FIELDS;
  const values = isSite ? state.site.site : (state.site.banners[key] ?? {});

  $('site-title').textContent = SITE_ITEMS.find((i) => i.key === key)?.name ?? key;

  $('site-form').innerHTML = fields
    .map((f) => {
      const v = escapeHtml(values[f.id] ?? '');
      const input =
        f.tag === 'textarea'
          ? `<textarea id="sf-${f.id}" rows="${f.rows ?? 2}">${v}</textarea>`
          : `<input id="sf-${f.id}" type="${f.type ?? 'text'}" value="${v}" autocomplete="off" />`;
      return `<label><span>${escapeHtml(f.label)}</span>${input}</label>`;
    })
    .join('');

  if (isSite) {
    $('site-form').insertAdjacentHTML(
      'beforeend',
      `<label><span>바깥 링크</span><div id="link-rows"></div></label>`,
    );
    renderLinkRows();
  }

  $('site-preview').hidden = isSite;
  $('site-form')
    .querySelectorAll('input, textarea')
    .forEach((el) => el.addEventListener('input', () => {
      renderSitePreview();
      touchSite();
    }));

  renderSitePreview();
  markSiteSaved('열림');
  document.querySelectorAll('#list li').forEach((li) => li.classList.toggle('is-on', li.dataset.site === key));
}

/** 바깥 링크 — 이름 칸과 주소 칸으로 나눠 받는다. 형식을 설명할 필요가 없게. */
function renderLinkRows() {
  const box = $('link-rows');
  if (!box) return;
  const links = state.site.site.links ?? [];

  box.innerHTML =
    links
      .map(
        (l, i) => `
        <div class="link-row" data-i="${i}">
          <input class="lr-label" value="${escapeHtml(l.label ?? '')}" placeholder="이름" autocomplete="off" />
          <input class="lr-href" value="${escapeHtml(l.href ?? '')}" placeholder="https://" autocomplete="off" spellcheck="false" />
          <button type="button" class="btn btn--ghost lr-del" title="지우기">×</button>
        </div>`,
      )
      .join('') + `<button type="button" class="btn btn--tiny" id="link-add">＋ 링크 추가</button>`;

  box.querySelectorAll('.link-row input').forEach((el) => el.addEventListener('input', collectLinks));
  box.querySelectorAll('.lr-del').forEach((btn) =>
    btn.addEventListener('click', () => {
      state.site.site.links.splice(Number(btn.closest('.link-row').dataset.i), 1);
      renderLinkRows();
      touchSite();
    }),
  );
  $('link-add').addEventListener('click', () => {
    (state.site.site.links ??= []).push({ label: '', href: '' });
    renderLinkRows();
    $('link-rows').querySelector('.link-row:last-of-type .lr-label')?.focus();
  });
}

/** 칸에 적힌 값을 state 로 옮긴다. 둘 다 빈 줄은 저장할 때 걸러진다. */
function collectLinks() {
  state.site.site.links = [...document.querySelectorAll('#link-rows .link-row')].map((row) => ({
    label: row.querySelector('.lr-label').value.trim(),
    href: row.querySelector('.lr-href').value.trim(),
  }));
  touchSite();
}

function renderSitePreview() {
  if ($('site-preview').hidden) return;
  const g = (id) => document.getElementById(`sf-${id}`)?.value ?? '';
  $('site-preview').querySelector('.preview__kicker').textContent = g('kicker');
  $('site-preview').querySelector('.preview__title').innerHTML = richLine(g('title'));
  $('site-preview').querySelector('.preview__lede').innerHTML = richLine(g('lede'));
}

function markSiteSaved(text) {
  $('site-saved').textContent = text;
}

let siteTimer = null;
function touchSite() {
  markSiteSaved('…');
  clearTimeout(siteTimer);
  siteTimer = setTimeout(saveSite, 1200);
}

async function saveSite({ quiet = true } = {}) {
  if (!state.site || !state.siteKey) return;
  clearTimeout(siteTimer);

  const g = (id) => document.getElementById(`sf-${id}`)?.value ?? '';

  if (state.siteKey === 'theme') {
    for (const mode of ['light', 'dark']) {
      for (const f of THEME_FIELDS) {
        state.site.theme[mode][f.id] = document.getElementById(`tf-${mode}-${f.id}`).value;
      }
    }
    const skyColors = {};
    for (const mode of ['light', 'dark']) {
      skyColors[mode] = {};
      for (const f of SKY_FIELDS) skyColors[mode][f.id] = $(`sf-${mode}-${f.id}`).value;
    }
    state.site.theme.sky = {
      on: $('sky-on').checked,
      strength: Number($('sky-str').value) / 100,
      ...skyColors,
    };
  } else if (state.siteKey === 'site') {
    for (const f of SITE_FIELDS) {
      const raw = g(f.id).trim();
      state.site.site[f.id] = f.type === 'number' ? Number(raw) || 0 : raw;
    }
    // 링크는 칸에서 이미 state 로 옮겨져 있다. 반쪽짜리만 걸러낸다.
    state.site.site.links = (state.site.site.links ?? []).filter((l) => l.label && l.href);
  } else {
    const b = {};
    for (const f of BANNER_FIELDS) b[f.id] = g(f.id).trim();
    state.site.banners[state.siteKey] = b;
  }

  try {
    await api('/api/site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.site),
    });
    const now = new Date();
    markSiteSaved(`저장됨 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    if (!quiet) toast('저장했습니다.');
    refreshStatus();
  } catch (err) {
    markSiteSaved('저장 실패');
    toast(escapeHtml(err.message), 'bad', 5000);
  }
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

/** commit + push. 글이든 배너든 이 한 곳을 지난다. */
async function publishAll(message, viewPath) {
  try {
    const res = await api('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    const held = res.held?.length ? `\n초안 ${res.held.length}편은 올리지 않았습니다.` : '';
    if (res.step === 'nothing') {
      toast('올릴 변경이 없습니다.' + held);
    } else if (res.ok) {
      const link = viewPath
        ? `\n<a href="https://notquitenowhere.github.io${viewPath}" target="_blank" rel="noopener">사이트에서 보기 ↗</a>`
        : '';
      toast(`올렸습니다. 30초쯤 뒤 반영됩니다.${held}${link}`, 'ok', 9000);
    } else {
      toast(`${res.step} 단계에서 막혔습니다:\n${escapeHtml(res.out.slice(0, 400))}`, 'bad', 12000);
    }
  } catch (err) {
    toast(escapeHtml(err.message), 'bad', 8000);
  } finally {
    refreshStatus();
  }
}

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
    const slug = $('slug').value.trim();
    const view =
      state.current.kind === 'notes'
        ? '/notes'
        : state.current.kind === 'pages'
          ? `/${slug}`
          : `/essays/${slug}`;
    await publishAll(title, view);
  } finally {
    $('publish').disabled = false;
    markSaved('');
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
  ['title', 'kicker', 'subtitle', 'date', 'slug', 'tags', 'excerpt', 'source', 'sourceUrl'].forEach((id) =>
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

  $('site-save').addEventListener('click', () => saveSite({ quiet: false }));
  $('site-publish').addEventListener('click', async () => {
    await saveSite();
    await publishAll('배너 문구 수정');
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

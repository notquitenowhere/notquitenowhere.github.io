# notquitenowhere — 개인 에세이 사이트

기능은 개인 블로그처럼 단순하게, 조판은 잡지처럼. 정적 사이트라 서버도 데이터베이스도 없습니다.

- **틀** Astro 7 (정적 생성) · MDX · 콘텐츠 컬렉션
- **활자** 표제 [Hahmlet](https://fonts.google.com/specimen/Hahmlet), 본문 [Gowun Batang](https://fonts.google.com/specimen/Gowun+Batang), 메타 [Pretendard](https://github.com/orioncactus/pretendard)
- **배포** GitHub Pages (`.github/workflows/deploy.yml`)

---

## 1. 시작하기

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ 에 정적 파일 생성
npm run preview  # 빌드 결과 확인
```

## 2. 글 쓰기

### 편집기로 (권장)

```bash
npm run write     # http://localhost:4322
```

브라우저에 편집기가 열립니다. 마크다운 문법을 몰라도 됩니다.

- 왼쪽에 글 목록, 오른쪽에 편집 화면
- 본문은 **보이는 대로** 씁니다 — 굵게·제목·인용·목록은 버튼
- 이미지는 **끌어다 놓으면** `public/images/` 에 저장되고 본문에 들어갑니다
- 1초쯤 쉬면 **자동 저장**. `Ctrl+S` 로 바로 저장
- **초안** 체크를 풀고 **발행하기** 를 누르면 commit·push 까지 한 번에

파일은 그대로 마크다운이라, 같은 글을 Obsidian·VS Code 로 열어도 똑같습니다.

미리보기를 같이 보려면 다른 창에서 `npm run dev` 를 띄워두세요.

> **각주·여백주석이 들어 있는 글**은 편집기가 마크다운 모드로 엽니다.
> 위지윅 변환이 그 문법들을 되살리지 못하기 때문입니다. 본문을 건드리지 않으면
> 파일은 한 글자도 바뀌지 않습니다.

### 터미널로

```bash
npm run new -- "글 제목"           # src/content/essays/글-제목.md
npm run new -- "짧은 생각" --note  # src/content/notes/짧은-생각.md
```

새로 만든 글에는 `draft: true`가 붙어 있습니다. **개발 서버에서는 보이고, 빌드에서는 빠집니다.**
공개할 준비가 되면 그 줄을 지우세요.

### 프런트매터

| 항목 | 필수 | 설명 |
|---|---|---|
| `title` | ✔ | 제목 |
| `date` | ✔ | `2026-08-24` 형식 |
| `subtitle` | | 제목 아래 한 줄 |
| `excerpt` | | 목록에 쓰일 발췌. 없으면 본문 앞부분을 자동으로 씁니다 |
| `tags` | | `[기술, 시간]` |
| `accent` | | 이 글만의 강조색. 예: `'#2f5d50'` — 링크·드롭캡·괘선에 반영됩니다 |
| `cover` / `coverAlt` | | 표지 이미지 (`public/` 기준 경로) |
| `featured` | | `true`면 홈 상단에 크게 걸립니다 |
| `draft` | | `true`면 빌드에서 제외 |

노트(`src/content/notes/`)는 `title`, `date`, `tags`, `source`, `sourceUrl`만 씁니다.

선택 항목은 값을 비워두거나(`subtitle:`) 아예 줄을 지워도 됩니다. 둘 다 "안 쓴 것"으로 처리합니다.

### 본문에서 쓸 수 있는 것들

일반 마크다운에 더해, `.mdx` 파일에서는 세 가지 조판 요소를 쓸 수 있습니다. 따로 import 하지
않아도 됩니다.

```mdx
<Sidenote n="1">
  넓은 화면에서는 본문 오른쪽 여백에, 좁은 화면에서는 본문 흐름 안에 놓입니다.
</Sidenote>

<Pullquote cite="출처 (생략 가능)">
  본문 중간에 크게 거는 문장.
</Pullquote>

<Figure
  src="/images/foo.jpg"
  alt="대체 텍스트"
  caption="설명 (생략 가능)"
  size="wide"   {/* text | wide | bleed */}
/>
```

각주는 마크다운 표준 문법(`[^1]`)을 그대로 쓰면 됩니다. `.md` 파일에서도 동작합니다.

**그림은 `.md` 에서도 넣을 수 있습니다.** 바로 아래 줄에 기울임 한 줄을 쓰면 캡션으로 조판됩니다.

```markdown
![대체 텍스트](/images/foo.jpg)

*캡션이 됩니다.*
```

`<Figure>` 가 필요한 경우는 캡션이 아니라 **폭을 넓힐 때**(`size="wide"`, `size="bleed"`)입니다.

## 3. 사이트 정보 고치기

거의 모든 텍스트가 [`src/consts.ts`](src/consts.ts) 한 곳에 모여 있습니다 — 이름, 로마자 표기,
소개 문구, 소셜 링크, 메뉴.

홈 첫 화면의 큰 문장("느리게 읽고 / 오래 씁니다")은
[`src/pages/index.astro`](src/pages/index.astro)에, 소개 글은
[`src/pages/about.astro`](src/pages/about.astro)에 있습니다.

## 4. 디자인 손보기

색·활자·간격은 전부 [`src/styles/global.css`](src/styles/global.css) 맨 위 토큰에 있습니다.

```css
--paper: #f6f3ec;   /* 종이 */
--ink:   #16140f;   /* 잉크 */
--accent:#a8321e;   /* 주칠(朱漆) */
--w-text: 36rem;    /* 본문 한 줄 폭 — 한글 약 32자 */
```

다크 모드는 `:root[data-theme="dark"]` 블록에서 같은 토큰을 덮어씁니다. 두 곳만 고치면 사이트
전체의 인상이 바뀝니다.

한글 조판에서 특히 신경 쓴 것들:

- `word-break: keep-all` — 단어 중간에서 줄을 끊지 않습니다
- 행간 1.9~1.95 — 라틴 문자보다 넉넉하게
- 부제·인용에 기울임(italic)을 쓰지 않습니다. 한글에는 어울리지 않으니까요
- 본문 한 줄을 32자 안팎으로 묶어 시선이 되돌아오기 쉽게 했습니다

## 5. 배포 — GitHub Pages

1. GitHub에 저장소를 만듭니다.
   - **개인 사이트로 쓰려면** 이름을 `<사용자이름>.github.io` 로 (주소: `https://<사용자이름>.github.io`)
   - 다른 이름으로 만들면 주소가 `https://<사용자이름>.github.io/<저장소이름>/` 이 되고,
     `astro.config.mjs`에 `base: '/<저장소이름>'`을 추가해야 합니다.

2. 밀어 넣습니다.

   ```bash
   git remote add origin https://github.com/<사용자이름>/<저장소이름>.git
   git branch -M main
   git push -u origin main
   ```

3. 저장소 **Settings → Pages → Source**를 **GitHub Actions**로 바꿉니다.

이후 `main`에 push할 때마다 자동으로 빌드·배포됩니다.

### 커스텀 도메인을 붙일 때

1. 도메인 DNS에 레코드를 넣습니다.

   | 종류 | 이름 | 값 |
   |---|---|---|
   | A | `@` | `185.199.108.153` `185.199.109.153` `185.199.110.153` `185.199.111.153` |
   | AAAA | `@` | `2606:50c0:8000::153` `2606:50c0:8001::153` `2606:50c0:8002::153` `2606:50c0:8003::153` |
   | CNAME | `www` | `<사용자이름>.github.io` |

2. **Settings → Pages → Custom domain**에 도메인을 넣고 *Enforce HTTPS*를 켭니다.
   (GitHub이 `CNAME` 파일을 저장소에 자동으로 만들어 줍니다.)

3. 저장소 **Settings → Secrets and variables → Actions → Variables**에
   `SITE_URL`을 `https://내도메인` 으로 추가합니다. RSS와 사이트맵의 절대 주소에 쓰입니다.

## 6. 들어 있는 것들

```
src/
├─ consts.ts              사이트 이름·소개·링크·메뉴
├─ content.config.ts      프런트매터 스키마
├─ content/
│  ├─ essays/             긴 글 (.md / .mdx)
│  └─ notes/              짧은 글 (.md)
├─ components/            머리·꼬리·목록 행·조판 요소
├─ layouts/               Base(공통) · Essay(글)
├─ lib/                   읽기 시간·발췌·정렬
├─ pages/                 홈 · 글 · 노트 · 연대기 · 소개 · 태그 · RSS · 404
└─ styles/global.css      디자인 시스템 전부

editor/                    글 편집기 (npm run write). 사이트에는 안 올라갑니다
├─ server.mjs              127.0.0.1 에만 열리는 로컬 서버
├─ build-vendor.mjs        편집기 번들 만들기 (없으면 자동 실행)
└─ ui/                     편집기 화면
```

RSS는 `/rss.xml`, 사이트맵은 `/sitemap-index.xml`에 자동 생성됩니다.

## 7. 지워도 되는 것들

예시로 넣어둔 글 세 편과 노트 두 편, 그리고 삽화 하나입니다. 직접 쓰기 시작할 때 지우세요.

```bash
rm src/content/essays/*.md src/content/essays/*.mdx
rm src/content/notes/*.md
rm public/images/arcs.svg
```

---

글은 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ko), 코드는 MIT.

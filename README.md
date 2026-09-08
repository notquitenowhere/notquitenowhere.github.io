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

포트 4322 를 다른 프로그램이 쓰고 있으면 다른 포트로 열 수 있습니다.

```powershell
$env:EDITOR_PORT=4323; npm run write
```

> **각주·여백주석이 들어 있는 글**은 편집기가 마크다운 모드로 엽니다.
> 위지윅 변환이 그 문법들을 되살리지 못하기 때문입니다. 본문을 건드리지 않으면
> 파일은 한 글자도 바뀌지 않습니다.

### 터미널로

```bash
npm run new -- "글 제목"           # src/content/essays/글-제목.md
npm run new -- "짧은 생각" --note  # src/content/notes/짧은-생각.md
```

### 비공개 저장 (초안)

새 글에는 **초안** 표시가 붙습니다. 초안은

- 사이트에 **올라가지 않습니다**
- 저장소에도 **올라가지 않습니다** — 발행할 때 건너뜁니다
- 내 컴퓨터의 `npm run dev` 미리보기에서는 보입니다

공개할 준비가 되면 편집기 아래의 **초안** 체크를 풀고 **발행하기**를 누르세요.
반대로 이미 올린 글에 초안을 다시 체크하고 발행하면 저장소에서도 내려갑니다.

파일로는 프런트매터의 `draft: true` 한 줄입니다.

터미널에서 직접 커밋할 때도 막히도록 커밋 훅을 둡니다. 저장소를 새로 받았다면 한 번만:

```bash
git config core.hooksPath .githooks
```

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

## 3. 배너와 사이트 정보 고치기

`npm run write` 의 **「페이지」 탭**에서 전부 고칠 수 있습니다.

| 항목 | 무엇 |
|---|---|
| 사이트 이름·소개 | 이름, 이름 옆 작은 글씨, 한 줄 소개, 저자, 메일, 바깥 링크 |
| 색 | 밝을 때·어두울 때 각각 종이·잉크·강조 세 색 |
| 홈 배너 | 첫 화면의 큰 문장과 그 아래 한 줄 |
| 글·노트·연대기 배너 | 각 목록 쪽 머리말 |
| 없는 쪽 (404) | 404 화면 |
| 소개 | 배너 + 본문 전체 |

**큰 제목에 쓰는 문법은 둘뿐입니다.**

```
느리게 읽고
*오래* 씁니다.
```

줄을 바꾸면 그대로 줄이 바뀌고, `*별표*` 로 감싼 부분이 강조색이 됩니다. 폼 아래에 실제
조판된 모습이 그대로 보입니다.

파일로 직접 고쳐도 됩니다 — 배너·사이트 정보는 [`src/data/site.json`](src/data/site.json),
소개 쪽 본문은 [`src/content/pages/about.md`](src/content/pages/about.md).

## 4. 디자인 손보기

### 색

**고르는 색은 모드당 셋뿐입니다** — 종이, 잉크, 강조. 나머지 열 가지 톤(괘선, 흐린 글씨,
가라앉은 배경, 선택 영역…)은 사이트가 이 셋을 `color-mix()` 로 섞어 만듭니다. 그래서 세 색만
바꾸면 사이트 전체의 인상이 한 번에 바뀝니다.

편집기의 「페이지 → 색」에서 고르세요. 준비된 조합(주칠·쪽빛·이끼·먹·치자)을 눌러보고
거기서 손봐도 됩니다. 두 모드의 미리보기가 나란히 뜹니다.

글마다 다른 강조색을 쓰고 싶으면 그 글의 `accent` 항목을 채우세요. 사이트 색보다 우선합니다.

### 배경 하늘

배경의 구름은 **흑백 그림 한 장을 마스크로** 씁니다
([`src/components/Sky.astro`](src/components/Sky.astro)). 모양은 그림이 정하고
색은 테마가 정하므로, 팔레트를 바꾸면 하늘색도 함께 바뀝니다.

움직임은 `transform` 뿐이라 매 프레임 다시 그리지 않습니다. 세 겹이 서로
나누어떨어지지 않는 주기(181·127·89초 × 97·71·53초)로 흘러서, 궤적이 한참
동안 같은 모양으로 돌아오지 않습니다.

「페이지 → 색」에서 켜고 끄고, 세기와 두 색과 그림 경로를 정합니다.

구름 그림을 새로 뽑으려면:

```bash
node scripts/make-clouds.mjs --seed 12 --cover 0.4
```

`--seed` 는 모양, `--cover` 는 구름이 덮는 넓이(0~1)입니다. 직접 만든 흑백
구름 이미지를 써도 됩니다 — **밝기가 아니라 알파에 모양이 담겨야** 합니다
(투명한 곳이 하늘, 불투명한 곳이 구름).

### 마크

사이트 마크는 **아직 내려앉지 않은 핀**입니다 — 지도 핀이 살짝 기울어 떠 있고, 그 아래에
닿아야 할 자리가 점으로 찍혀 있습니다. 아직 어디에도 완전히 도착하지 않았다는 뜻.

[`src/components/Logo.astro`](src/components/Logo.astro) 한 파일이고, 색은 강조색을 따릅니다.
파비콘도 [`src/pages/favicon.svg.ts`](src/pages/favicon.svg.ts) 라우트라 고른 색을 그대로
따라가고, 밝을 때·어두울 때가 따로 있습니다.

### 그 밖

활자와 간격은 [`src/styles/global.css`](src/styles/global.css) 맨 위 토큰에 있습니다.

```css
--w-text: 36rem;    /* 본문 한 줄 폭 — 한글 약 32자 */
--gutter: clamp(1.25rem, 5vw, 4.5rem);
```

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
├─ consts.ts              site.json 을 읽어 넘겨주는 얇은 껍데기
├─ data/site.json         이름·소개·링크·메뉴·배너 문구 전부
├─ content.config.ts      프런트매터 스키마
├─ content/
│  ├─ essays/             긴 글 (.md / .mdx)
│  ├─ notes/              짧은 글 (.md)
│  └─ pages/              소개처럼 고정된 쪽
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

---

글은 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ko), 코드는 MIT.

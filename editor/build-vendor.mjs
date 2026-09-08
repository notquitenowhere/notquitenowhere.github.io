/**
 * Toast UI 편집기를 자체 포함 번들로 묶는다.
 *
 * npm 으로 받은 dist/toastui-editor.js 는 ProseMirror 를 바깥에서 가져다 쓰는
 * UMD 라서 <script> 로 그냥 못 붙인다. 여기서 의존까지 전부 한 파일로 말아
 * editor/ui/vendor/ 에 떨어뜨린다. 서버가 시작할 때 없으면 알아서 만든다.
 */
import { build } from 'esbuild';
import { writeFile, mkdir, copyFile, readFile, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = path.join(ROOT, 'editor', 'ui', 'vendor');
const PKG = path.join(ROOT, 'node_modules', '@toast-ui', 'editor', 'dist');

export async function buildVendor({ quiet = false } = {}) {
  await mkdir(OUT, { recursive: true });

  // 편집기 본체만 묶는다. 한국어 로케일은 전역 toastui.Editor 가 생긴 뒤에
  // 읽혀야 하는 UMD 라서 번들에 넣지 않고 파일 그대로 옆에 둔다.
  const entry = path.join(OUT, '.entry.mjs');
  await writeFile(entry, "export { default as Editor } from '@toast-ui/editor';\n", 'utf8');

  await build({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    globalName: 'toastui',
    outfile: path.join(OUT, 'toastui.js'),
    minify: true,
    legalComments: 'none',
    absWorkingDir: ROOT,
    logLevel: quiet ? 'silent' : 'info',
  });

  // esbuild 의 iife 는 default export 를 toastui.Editor.default 에 담는다.
  // new toastui.Editor(...) 로 쓸 수 있게 한 줄 덧붙인다.
  const bundlePath = path.join(OUT, 'toastui.js');
  const code = await readFile(bundlePath, 'utf8');
  await writeFile(
    bundlePath,
    `${code}\n;(function(){var E=toastui.Editor;if(E&&E.default)toastui.Editor=E.default;})();\n`,
    'utf8',
  );

  await copyFile(path.join(PKG, 'toastui-editor.css'), path.join(OUT, 'toastui-editor.css'));
  await mkdir(path.join(OUT, 'i18n'), { recursive: true });
  await copyFile(path.join(PKG, 'i18n', 'ko-kr.js'), path.join(OUT, 'i18n', 'ko-kr.js'));
  await rm(entry, { force: true });

  if (!quiet) console.log('편집기 번들을 만들었습니다 → editor/ui/vendor/toastui.js');
}

// 직접 실행했을 때만 (Windows 경로도 맞도록 pathToFileURL 로 비교)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildVendor();
}

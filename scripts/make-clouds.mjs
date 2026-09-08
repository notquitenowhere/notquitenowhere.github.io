#!/usr/bin/env node
/**
 * 구름 마스크 텍스처를 만든다.
 *
 *   node scripts/make-clouds.mjs [--seed 7] [--size 512] [--out public/images/clouds.png]
 *
 * 이음매 없이 반복되는 흑백 PNG 한 장입니다. 흰 곳이 구름, 검은 곳이 하늘.
 * 색은 사이트가 입히므로 이 파일에는 색이 없습니다.
 *
 * 이 그림이 마음에 들지 않으면 --seed 를 바꿔 다시 뽑거나, 직접 만든
 * 흑백 구름 이미지로 갈아 끼우면 됩니다 (public/images/ 에 두고
 * 「페이지 → 색」의 하늘 그림 경로만 바꾸면 됩니다).
 */
import { deflateSync, crc32 } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

/* ── 인자 ────────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i > -1 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};

const SIZE = Number(arg('size', 512));
const SEED = Number(arg('seed', 7));
const OUT = arg('out', path.join('public', 'images', 'clouds.png'));

/* ── 난수와 잡음 ─────────────────────────────────────────────────────── */

/** 씨앗을 받는 작은 난수기. 같은 씨앗이면 같은 그림이 나온다. */
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

const smooth = (t) => t * t * (3 - 2 * t);

/**
 * 이음매 없는 값 잡음 한 겹.
 * cells 가 size 를 나누므로 좌우·상하가 자연스럽게 이어진다.
 */
function noiseLayer(size, cells, seed) {
  const rand = rng(seed);
  const grid = new Float32Array(cells * cells);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();

  const out = new Float32Array(size * size);
  const step = size / cells;

  for (let y = 0; y < size; y++) {
    const gy = y / step;
    const y0 = Math.floor(gy) % cells;
    const y1 = (y0 + 1) % cells;
    const fy = smooth(gy - Math.floor(gy));

    for (let x = 0; x < size; x++) {
      const gx = x / step;
      const x0 = Math.floor(gx) % cells;
      const x1 = (x0 + 1) % cells;
      const fx = smooth(gx - Math.floor(gx));

      const a = grid[y0 * cells + x0];
      const b = grid[y0 * cells + x1];
      const c = grid[y1 * cells + x0];
      const d = grid[y1 * cells + x1];

      out[y * size + x] = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }
  }
  return out;
}

/** 여러 겹을 겹쳐 구름의 잔결을 만든다 (fBm). */
function clouds(size, seed) {
  const octaves = [4, 8, 16, 32, 64, 128];
  const buf = new Float32Array(size * size);
  let amp = 1;
  let total = 0;

  octaves.forEach((cells, i) => {
    if (cells > size) return;
    const layer = noiseLayer(size, cells, seed + i * 977);
    for (let p = 0; p < buf.length; p++) buf[p] += layer[p] * amp;
    total += amp;
    amp *= 0.52;
  });

  for (let p = 0; p < buf.length; p++) buf[p] /= total;
  return buf;
}

/* ── PNG 쓰기 (의존성 없이) ──────────────────────────────────────────── */

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

/**
 * 회색조 + 알파 PNG.
 *
 * 구름 모양을 밝기가 아니라 **알파**에 담습니다. CSS 의 mask-image 는
 * 기본이 알파 마스크라, 이렇게 해야 브라우저마다 따로 손대지 않아도
 * 그대로 마스크로 쓸 수 있습니다. (밝기는 전부 흰색으로 채웁니다.)
 */
function grayPng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 비트 깊이
  ihdr[9] = 4; // 회색조 + 알파
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // 줄마다 앞에 필터 바이트 0, 픽셀마다 (밝기, 알파) 두 바이트
  const stride = size * 2 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x++) {
      const o = y * stride + 1 + x * 2;
      raw[o] = 255;
      raw[o + 1] = pixels[y * size + x];
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ── 만들기 ─────────────────────────────────────────────────────────── */

const field = clouds(SIZE, SEED);

// 구름이 덮을 비율을 먼저 정하고, 거기에 맞는 문턱을 값 분포에서 찾는다.
// 이렇게 하면 씨앗을 바꿔도 덮는 정도가 일정하게 유지된다.
const COVER = Number(arg('cover', 0.4)); // 0~1, 구름이 차지할 넓이
const SOFT = Number(arg('soft', 0.16)); // 가장자리가 번지는 폭

const sorted = Float32Array.from(field).sort();
const at = (q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];

const mid = at(1 - COVER); // 이 값 위가 구름
const band = (at(0.98) - at(0.02)) * SOFT || 1e-6;

const px = new Uint8Array(SIZE * SIZE);
for (let i = 0; i < field.length; i++) {
  const t = Math.min(1, Math.max(0, (field[i] - (mid - band)) / (band * 2)));
  px[i] = Math.round(smooth(t) * 255);
}

const white = px.reduce((n, v) => n + (v > 127 ? 1 : 0), 0) / px.length;

mkdirSync(path.dirname(OUT), { recursive: true });
const png = grayPng(SIZE, px);
writeFileSync(OUT, png);

console.log(
  `구름 텍스처를 만들었습니다 → ${OUT}
` +
    `  ${SIZE}×${SIZE} · ${(png.length / 1024).toFixed(0)}KB · seed ${SEED} · 구름이 덮은 넓이 ${(white * 100).toFixed(0)}%`,
);

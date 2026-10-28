/*
  A arte e as figuras do README, no vocabulário da arte original (+ 0 8 f).

  README_ART, hash, a rampa e as figuras da Moji e da Repaginata vêm do site pessoal
  (SitePessoal/src/lib/ascii/shapes.ts e field.ts) e foram copiados para este repositório
  não depender dele. A bigorna do ModlistForger é nova, desenhada do mesmo jeito.
*/

export const README_ART = [
  '+88                 +880',
  ' +880               ++80',
  ' ++88              +880',
  ' ++88             ++88',
  '  +880           ++88',
  '  +888         ++880',
  '  ++880       ++880',
  '  ++888     +++880',
  '  ++8888  +++8880++88',
  '  +++8888+++8880++8888',
  '   ++888++8888+++888888+80',
  '   ++88++8888++8888888++888',
  '   ++++++888888fx88888888888',
  '    ++++++88888888888888888',
  '    ++++++++000888888888888',
  '     +++++++00008f8888888888',
  '      +++++++00088888888888',
  '       +++++++0888f8888888',
];

export const hash = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

const RAMP = [' ', '.', '+', '0', '8'];
const rampChar = (d) => RAMP[d < 0.12 ? 0 : d < 0.3 ? 1 : d < 0.52 ? 2 : d < 0.74 ? 3 : 4];

const circle = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) < r;
const ellipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1;

/** Formas em coordenadas quadradas (x ∈ ±aspecto, y ∈ ±1, y para baixo), devolvendo densidade. */
const FIELDS = {
  // O urso da Moji (do site).
  moji(x, y) {
    const shade = 0.72 + 0.22 * (-x * 0.35 - y * 0.45);
    if (circle(x, y, -0.2, 0, 0.085) || circle(x, y, 0.2, 0, 0.085)) return 0;
    if (ellipse(x, y, 0, 0.26, 0.09, 0.06)) return 1;
    if (ellipse(x, y, 0, 0.3, 0.27, 0.19)) return 0.46;
    if (circle(x, y, -0.44, -0.46, 0.1) || circle(x, y, 0.44, -0.46, 0.1)) return 0.4;
    if (circle(x, y, -0.44, -0.46, 0.2) || circle(x, y, 0.44, -0.46, 0.2)) return shade;
    if (ellipse(x, y, 0, 0.08, 0.62, 0.56)) return shade;
    return 0;
  },
  // Repaginata: duas páginas, a de trás deslocada (do site).
  repaginata(x, y) {
    const front = x > -0.4 && x < 0.34 && y > -0.72 && y < 0.8;
    const back = x > -0.26 && x < 0.48 && y > -0.86 && y < 0.66;
    if (front) {
      if (x - 0.34 + (-0.72 - y) > -0.24) return x + y > -0.1 ? 0.9 : 0;
      if (y > -0.5 && y < -0.36 && x < 0.1) return 0.95;
      const line = Math.floor((y + 0.2) / 0.13);
      if (y > -0.24 && y < 0.64 && line % 2 === 0 && x < 0.2 - (line % 3) * 0.1) return 0.6;
      return 0.3;
    }
    if (back) return x > 0.34 || y < -0.72 ? 0.52 : 0;
    return 0;
  },
  // ModlistForger: uma bigorna, com faíscas.
  anvil(x, y) {
    const shade = 0.74 + 0.2 * (-x * 0.3 - y * 0.4);
    // faíscas
    if (circle(x, y, 0.18, -0.9, 0.06) || circle(x, y, 0.5, -0.8, 0.06) || circle(x, y, -0.1, -0.78, 0.05)) return 0.24;
    // chifre: afina até a ponta, à esquerda
    if (x < -0.5 && x > -1.25) {
      const t = (x + 1.25) / 0.75; // 0 na ponta, 1 junto da mesa
      const top = -0.5 + 0.2 * (1 - t) ** 1.6;
      const bottom = -0.5 + 0.06 + 0.3 * t;
      if (y > top && y < bottom) return y < top + 0.1 ? 0.92 : shade;
    }
    // mesa: face clara em cima e corpo
    if (x >= -0.5 && x < 0.78 && y > -0.5 && y < -0.14) return y < -0.38 ? 0.95 : shade;
    // cintura, mais estreita
    if (y >= -0.14 && y < 0.24 && x > -0.22 && x < 0.34) return shade - 0.1;
    // base, com dois pés
    if (y >= 0.24 && y < 0.62) {
      const w = 0.36 + (y - 0.24) * 0.95;
      if (x > -w + 0.06 && x < w + 0.06) {
        if (y > 0.5 && Math.abs(x - 0.06) < 0.16) return 0;
        return shade - 0.06;
      }
    }
    return 0;
  },
};

/** Uma figura como linhas de texto e as colunas em acento por linha. */
export function figure(name, cols, rows, aspect) {
  const fn = FIELDS[name];
  const kx = (cols * aspect) / rows;
  const lines = [];
  const accents = [];
  for (let r = 0; r < rows; r++) {
    let s = '';
    const acc = [];
    for (let c = 0; c < cols; c++) {
      const d = clamp01(fn((((c + 0.5) / cols) * 2 - 1) * kx, ((r + 0.5) / rows) * 2 - 1));
      const a = d > 0.5 && hash(c * 3.1, r * 1.7) < 0.045;
      s += a ? 'f' : rampChar(d);
      if (a) acc.push(c);
    }
    lines.push(s.replace(/\s+$/, ''));
    accents.push(acc);
  }
  return { lines, accents };
}

/** A arte original com as colunas em acento (f e x), como no site. */
export function readmeArt() {
  return {
    lines: README_ART,
    accents: README_ART.map((l) => [...l].flatMap((ch, i) => (ch === 'f' || ch === 'x' ? [i] : []))),
  };
}

const SCRAMBLE = '+08f.x';

/** Um quadro da arte se formando a partir do ruído (0 = ruído, 1 = pronta), como o cartão do curl. */
export function noiseFrame(lines, p, frame) {
  const w = Math.max(...lines.map((l) => l.length));
  return lines.map((line, r) => {
    const src = line.padEnd(w);
    let out = '';
    for (let c = 0; c < w; c++) {
      const ch = src[c];
      const local = clamp01((p - hash(c, r) * 0.6) / 0.4);
      let g = ch;
      if (local < 1) {
        if (ch === ' ') g = local < 0.5 && hash(c + frame, r) < 0.08 ? '.' : ' ';
        else g = local < 0.15 ? ' ' : SCRAMBLE[Math.floor(hash(c + frame * 7, r) * SCRAMBLE.length)];
      }
      out += g;
    }
    return out.replace(/\s+$/, '');
  });
}

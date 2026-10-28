/*
  Gera os SVGs do README: a janela do terminal (assets/whoami.svg), os botões do rodapé
  (assets/link-*.svg) e, com --cards, os cartões dos projetos (assets/card-*.svg).
  Rodar com `node scripts/build.mjs`, sem dependências.

  A identidade é a do site pessoal: paleta de src/lib/styles/tokens.css, a arte se formando a
  partir do ruído e o texto digitado, como o cartão do curl (src/lib/terminal/cartao.js).

  A fonte é a Martian Mono (SIL OFL 1.1, veja scripts/fonts/OFL.txt), reduzida aos caracteres usados:
    pyftsubset martian-mono-latin-wght-normal.woff2 --flavor=woff2 --layout-features='' \
      --unicodes="U+0020-007E,U+00B7,U+2014,U+00E9" --output-file=MartianMono-subset.woff2

  O estado sem animação é o quadro final: quem pede movimento reduzido vê tudo pronto.
*/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readmeArt, figure, noiseFrame, hash } from './figures.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONT = readFileSync(join(ROOT, 'scripts/fonts/MartianMono-subset.woff2')).toString('base64');

const C = {
  bg: '#0b0b0d',
  bar: '#121216',
  ink: '#ece9f1',
  ink2: '#a8a4b0',
  dim: '#6a6770',
  line: '#26252b',
  line2: '#3a3842',
  accent: '#5cb8ff',
};
/** Avanço da Martian Mono: 700 unidades por em. */
const ADV = 0.7;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const r2 = (n) => Math.round(n * 100) / 100;

/** Um trecho de texto: [cor, texto]. Vira <tspan>s numa linha só. */
const spans = (parts) => parts.map(([fill, t]) => `<tspan fill="${fill}">${esc(t)}</tspan>`).join('');

/** Linha de arte com as colunas de acento em azul e negrito. */
function artSpans(line, accents) {
  const parts = [];
  let cur = '';
  for (let i = 0; i < line.length; i++) {
    if (accents.includes(i)) {
      if (cur) parts.push([null, cur]);
      parts.push(['a', line[i]]);
      cur = '';
    } else cur += line[i];
  }
  if (cur) parts.push([null, cur]);
  return parts
    .map(([k, t]) => (k === 'a' ? `<tspan class="acc">${esc(t)}</tspan>` : esc(t)))
    .join('');
}

function style({ fs, extra = '' }) {
  return `<style>
@font-face{font-family:'Martian';src:url(data:font/woff2;base64,${FONT}) format('woff2');font-weight:100 800}
svg{font-size:${fs}px}
text{font-family:'Martian',ui-monospace,monospace;white-space:pre}
.art{fill:${C.ink2}}
.acc{fill:${C.accent};font-weight:700}
.noise{opacity:0;animation:flash var(--dt) linear var(--at)}
.final{animation:hide var(--at) linear}
.type{animation:type var(--d) steps(var(--n),end) var(--t) backwards}
.cursor{animation:hide var(--t) linear,blink 1.1s steps(1,end) var(--t) infinite}
@keyframes flash{from,to{opacity:1}}
@keyframes hide{from,to{opacity:0}}
@keyframes type{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes blink{0%{opacity:1}50%{opacity:0}}
${extra}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>`;
}

/** A moldura: janela com cantos arredondados, barra de título e três pontos. */
function frame({ w, h, title, barH }) {
  return `<defs><clipPath id="win"><rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="12"/></clipPath></defs>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="12" fill="${C.bg}"/>
<g clip-path="url(#win)"><rect x="0" y="0" width="${w}" height="${barH}" fill="${C.bar}"/></g>
<line x1="0.5" y1="${barH + 0.5}" x2="${w - 0.5}" y2="${barH + 0.5}" stroke="${C.line}"/>
<circle cx="22" cy="${barH / 2}" r="5.5" fill="${C.line2}"/>
<circle cx="40" cy="${barH / 2}" r="5.5" fill="${C.line2}"/>
<circle cx="58" cy="${barH / 2}" r="5.5" fill="${C.accent}"/>
<text x="${w / 2}" y="${barH / 2 + 4}" text-anchor="middle" fill="${C.dim}" style="font-size:12px">${esc(title)}</text>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="12" fill="none" stroke="${C.line}"/>`;
}

/** Os quadros de ruído e o quadro final de uma arte, posicionados em (x, y0). */
function artBlock({ lines, accents, x, y0, lh, frames, dt, start = 0 }) {
  let out = '';
  for (let k = 0; k < frames; k++) {
    const noise = noiseFrame(lines, (k / frames) * 1.15, k);
    out += `<g class="noise art" style="--dt:${dt}s;--at:${r2(start + k * dt)}s">`;
    noise.forEach((l, r) => {
      if (l) out += `<text x="${x}" y="${r2(y0 + r * lh)}">${esc(l)}</text>`;
    });
    out += '</g>';
  }
  out += `<g class="final art" style="--at:${r2(start + frames * dt)}s">`;
  lines.forEach((l, r) => {
    if (l) out += `<text x="${x}" y="${r2(y0 + r * lh)}">${artSpans(l, accents[r])}</text>`;
  });
  return out + '</g>';
}

/** Uma linha "digitada": revela da esquerda para a direita, um caractere por passo. */
function typed({ x, y, parts, t, extraStyle = '' }) {
  const n = Math.max(1, parts.reduce((s, [, txt]) => s + txt.length, 0));
  const d = r2(Math.min(0.55, 0.12 + n * 0.012));
  return `<text class="type" x="${x}" y="${r2(y)}" style="--n:${n};--d:${d}s;--t:${r2(t)}s${extraStyle}">${spans(parts)}</text>`;
}

/* ---------- a janela do terminal ---------- */

function whoami() {
  const fs = 13;
  const adv = fs * ADV;
  const lh = 20;
  const barH = 38;
  const padX = 30;
  const top = barH + 28;
  const w = 820;
  const art = readmeArt();
  const textX = r2(padX + 32 * adv);
  const base = (r) => top + r * lh + fs;

  const kv = (k, v) => [
    [C.dim, `  ${k.padEnd(9)}`],
    [C.ink, v],
  ];
  const right = [
    [[C.dim, '# USER PROFILE LOADED ----------------------------']],
    kv('NAME:', 'Arthur Fazioni'),
    kv('ROLE:', 'Full-Stack Software Engineer'),
    kv('DEGREE:', 'B.Sc. Computer Science @ UNISAGRADO'),
    kv('WORK:', 'Full-Stack Developer @ Next SI'),
    [[C.dim, '--------------------------------------------------']],
    null,
    [
      [C.accent, '>'],
      [C.ink2, ' Reading bio.txt...'],
    ],
    null,
    [[C.ink, '"I build B2B products end to end: React and']],
    [[C.ink, ' TypeScript on the front, Node.js, PHP and SQL']],
    [[C.ink, ' on the back, Docker and Linux underneath, from']],
    [[C.ink, ' the first sketch all the way to production.']],
    null,
    [[C.ink, ' I started in IT infrastructure, which taught me']],
    [[C.ink, ' that code has to hold up in production: tested,']],
    [[C.ink, ' simple to deploy and easy to maintain. Open to']],
    [[C.ink, ' Software Engineer roles in Ireland and remote."']],
  ];

  const frames = 7;
  const dt = 0.08;
  const typeStart = 0.35;
  let body = artBlock({ lines: art.lines, accents: art.accents, x: padX, y0: base(0), lh, frames, dt });

  let i = 0;
  right.forEach((parts, r) => {
    if (!parts) return;
    body += typed({ x: textX, y: base(r), parts, t: typeStart + i++ * 0.09 });
  });

  const stackRow = right.length + 1;
  body += typed({
    x: padX,
    y: base(stackRow),
    parts: [
      [C.accent, '>'],
      [C.dim, ' stack  '],
      [C.ink2, 'typescript · react · node.js · python · php · sql · docker · linux'],
    ],
    t: typeStart + i++ * 0.09,
  });

  const promptRow = stackRow + 1;
  const prompt = [
    [C.ink2, 'artfaz@github'],
    [C.dim, ':~$ '],
  ];
  const promptT = typeStart + i++ * 0.09;
  body += typed({ x: padX, y: base(promptRow), parts: prompt, t: promptT });
  const promptLen = prompt.reduce((s, [, t]) => s + t.length, 0);
  const cursorT = r2(promptT + 0.4);
  body += `<rect class="cursor" x="${r2(padX + promptLen * adv)}" y="${r2(base(promptRow) - fs + 1)}" width="${r2(adv)}" height="${fs + 3}" fill="${C.accent}" style="--t:${cursorT}s"/>`;

  const h = Math.round(base(promptRow) + 26);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d">
<title id="t">Arthur Fazioni: Full-Stack Software Engineer</title>
<desc id="d">Terminal window running whoami: Arthur Fazioni, Full-Stack Software Engineer, B.Sc. Computer Science at UNISAGRADO, Full-Stack Developer at Next SI. Builds B2B products end to end with React, TypeScript, Node.js, PHP, SQL, Docker and Linux. Open to Software Engineer roles in Ireland and remote.</desc>
${style({ fs })}
${frame({ w, h, title: 'artfaz@github:~$ ./whoami --verbose', barH })}
${body}
</svg>
`;
}

/* ---------- os cartões dos projetos ---------- */

const CARDS = [
  {
    slug: 'modlistforger',
    fig: 'anvil',
    name: 'ModlistForger',
    desc: [
      'A Minecraft modlist builder that runs in the',
      'browser. It resolves dependencies, catches',
      'conflicts and imports and exports modpacks.',
    ],
    tech: 'svelte · typescript · modrinth api · indexeddb',
    link: 'github.com/ArtFaz/ModlistForger',
  },
  {
    slug: 'moji',
    fig: 'moji',
    name: 'Moji',
    desc: [
      'A programming language where emojis are the',
      'syntax. A full interpreter in pure Python,',
      'my Compilers final project.',
    ],
    tech: 'python · interpreters · compilers',
    link: 'github.com/ArtFaz/Moji',
  },
  {
    slug: 'repaginata',
    fig: 'repaginata',
    name: 'Repaginata',
    desc: [
      'Brand and website for my independent web',
      'studio, with dither engravings drawn on canvas',
      'and accessibility as a rule.',
    ],
    tech: 'sveltekit · typescript · cloudflare pages',
    link: 'repaginata.com.br',
  },
];

function card(c) {
  const w = 820;
  const barH = 34;
  const ffs = 10;
  const fadv = ffs * ADV;
  const flh = 12.5;
  const cols = 34;
  const rowsAll = 15;
  const fig = figure(c.fig, cols, rowsAll, fadv / flh);
  // Recorta as linhas vazias e centraliza a figura numa área de `keep` linhas, igual nos três cartões.
  const keep = 13;
  const used = fig.lines.map((l, r) => (l.trim() ? r : -1)).filter((r) => r >= 0);
  const first = used[0];
  const last = used[used.length - 1];
  let lines = fig.lines.slice(first, last + 1);
  // No máximo dois "f" em acento, os de menor hash, como estão espalhados na arte original.
  const all = fig.accents.slice(first, last + 1).flatMap((cs, r) => cs.map((c) => ({ r, c, k: hash(c * 3.1, r * 1.7) })));
  const kept = all.sort((a, b) => a.k - b.k).slice(0, 2);
  lines = lines.map((l, r) => [...l].map((ch, c) => (ch === 'f' && !kept.some((a) => a.r === r && a.c === c) ? '8' : ch)).join(''));
  const accents = lines.map((_, r) => kept.filter((a) => a.r === r).map((a) => a.c));
  const lead = Math.min(...lines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length));
  const width = Math.max(...lines.map((l) => l.length)) - lead;
  const figTop = barH + 18;
  const h = figTop + keep * flh + 14;
  const figX = r2(26 + ((cols - width) / 2 - lead) * fadv);
  const figY = figTop + ffs + ((keep - lines.length) / 2) * flh;

  let body = `<g style="font-size:${ffs}px">` + artBlock({ lines, accents, x: figX, y0: figY, lh: flh, frames: 5, dt: 0.08 }) + '</g>';

  const tx = r2(26 + cols * fadv + 30);
  const fs = 13;
  const lh = 19;
  const blockH = 26 + c.desc.length * lh + 10 + lh + lh;
  let y = barH + (h - barH - blockH) / 2 + 18;
  let t = 0.3;
  body += typed({ x: tx, y, parts: [[C.ink, c.name]], t, extraStyle: ';font-size:20px;font-weight:600' });
  y += 30;
  for (const line of c.desc) {
    t += 0.08;
    body += typed({ x: tx, y, parts: [[C.ink2, line]], t });
    y += lh;
  }
  y += 8;
  t += 0.08;
  body += typed({ x: tx, y, parts: [[C.dim, c.tech]], t, extraStyle: ';font-size:12px' });
  y += lh;
  t += 0.08;
  body += typed({
    x: tx,
    y,
    parts: [
      [C.accent, '-> '],
      [C.accent, c.link],
    ],
    t,
    extraStyle: ';font-size:12px',
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d">
<title id="t">${esc(c.name)}</title>
<desc id="d">${esc(c.desc.join(' '))} Built with ${esc(c.tech.replace(/ · /g, ', '))}. ${esc(c.link)}</desc>
${style({ fs })}
${frame({ w, h, title: `~/projects/${c.slug}`, barH })}
${body}
</svg>
`;
}

/* ---------- os botões do rodapé ---------- */

const LINKS = [
  { slug: 'linkedin', text: 'linkedin.com/in/arthurfazioni', label: 'LinkedIn' },
  { slug: 'repaginata', text: 'repaginata.com.br', label: 'Repaginata, my web studio' },
];

/** Um botão no estilo do terminal: "> endereço" numa janelinha com a mesma moldura. */
function link(l) {
  const fs = 13;
  const adv = fs * ADV;
  const padX = 18;
  const h = 44;
  // Largura num número inteiro de 1% da janela (820 px): no README os botões levam width em %,
  // e assim os dois ficam com a mesma altura em qualquer tela.
  const step = 8.2;
  const w = r2(Math.ceil((padX * 2 + (l.text.length + 2) * adv) / step) * step);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t">
<title id="t">${esc(l.label)}: ${esc(l.text)}</title>
${style({ fs })}
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="10" fill="${C.bg}" stroke="${C.line}"/>
<text x="${r2(w / 2)}" y="${h / 2 + 4.5}" text-anchor="middle">${spans([
    [C.accent, '> '],
    [C.ink2, l.text],
  ])}</text>
</svg>
`;
}

// Os cartões dos projetos saíram do README (os repositórios fixados já fazem a vitrine).
// Para gerá-los de novo: node scripts/build.mjs --cards
mkdirSync(join(ROOT, 'assets'), { recursive: true });
const outputs = [
  ['whoami.svg', whoami()],
  ...LINKS.map((l) => [`link-${l.slug}.svg`, link(l)]),
  ...(process.argv.includes('--cards') ? CARDS.map((c) => [`card-${c.slug}.svg`, card(c)]) : []),
];
for (const [name, svg] of outputs) {
  writeFileSync(join(ROOT, 'assets', name), svg);
  const width = Number(svg.match(/width="([\d.]+)"/)[1]);
  console.log(name, Math.round(svg.length / 1024), 'KB', name.startsWith('link-') ? `${Math.round(width / 8.2)}% no README` : '');
}

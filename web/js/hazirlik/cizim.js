/* ÖğretmeniM 0.24 — Yazılı hazırlık çizimleri (SVG). İçerikte "c": "kod" olarak kullanılır.
   Kodlar:
     evre:<yeniay|hilal|ilkdordun|siskin|dolunay|siskin2|sondordun|hilal2>   Ay'ın Dünya'dan görünüşü (Kuzey yarım küre)
     dizilis:<yeniay|dolunay|dordun>     Güneş – Dünya – Ay dizilişi (üstten bakış)
     gda                                 Güneş, Dünya ve Ay büyüklük modeli
     yorunge                             Dünya Güneş'in, Ay Dünya'nın etrafında (dönme/dolanma)
     aci:<derece>[:ABC]                  açı (köşe ortadaki harf), ölçüsü yazılı
     acisiz:<derece>[:ABC]               açı, ölçüsü yazılmamış (tahmin/sınıflandırma)
     aciolcer:<derece>                   açıölçer üzerinde açı (sağdaki 0'dan)
     dogrular:<paralel|dik|kesisen>      iki doğru
     kesisen:<derece>                    O'da kesişen iki doğru; bir açı verilmiş, diğerleri a, b, c
     kesen:<derece>                      iki paralel doğru ve kesen; açılar 1–8 numaralı, 2 numaralı açı verilmiş
     cokgen:<n>[:kosegen]                düzgün çokgen (köşeler A, B, C …); kosegen: A'dan köşegenler
     cokgensiz:<n>                       düzgün olmayan çokgen
     cember                              merkez, yarıçap, çap
     sembol:<dogru|isin|dogruparcasi>    doğru, ışın, doğru parçası çizimi */
"use strict";

const CZ = { ink: "currentColor", soluk: "#94A3B8", vurgu: "#FEB500", mavi: "#60A5FA", ay: "#CBD5E1", koyu: "#1E293B" };
const svgSar = (g, w = 260, h = 200, ek = "") => `<svg class="cizim" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" ${ek}>${g}</svg>`;
const yazi = (x, y, t, o = {}) => `<text x="${x}" y="${y}" fill="${o.renk || CZ.ink}" font-size="${o.boy || 14}" font-weight="${o.kalin ? 700 : 500}" text-anchor="${o.hiza || "middle"}" dominant-baseline="middle">${t}</text>`;
const cizgi = (x1, y1, x2, y2, o = {}) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.renk || CZ.ink}" stroke-width="${o.k || 2.5}" ${o.kesik ? 'stroke-dasharray="6 5"' : ""} stroke-linecap="round"/>`;
const nokta = (x, y, r = 3.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${CZ.ink}"/>`;
const ok = (x1, y1, x2, y2, renk) => {
  const a = Math.atan2(y2 - y1, x2 - x1), u = 9;
  return cizgi(x1, y1, x2, y2, { renk }) + `<polygon points="${x2},${y2} ${x2 - u * Math.cos(a - 0.4)},${y2 - u * Math.sin(a - 0.4)} ${x2 - u * Math.cos(a + 0.4)},${y2 - u * Math.sin(a + 0.4)}" fill="${renk || CZ.ink}"/>`;
};
const rad = d => d * Math.PI / 180;

/* Ay evresi: aydınlık kesir f (0 yeni ay … 1 dolunay), buyuyen: sağ taraf aydınlık */
function ayEvresiSvg(f, buyuyen, r = 56, cx = 80, cy = 70) {
  let aydinlik = "";
  if (f >= 0.999) aydinlik = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${CZ.ay}"/>`;
  else if (f > 0.001) {
    const rx = Math.abs(1 - 2 * f) * r;
    const sweep2 = f < 0.5 ? 0 : 1;
    aydinlik = `<path d="M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweep2} ${cx} ${cy - r} Z" fill="${CZ.ay}"/>`;
    if (!buyuyen) aydinlik = `<g transform="translate(${2 * cx} 0) scale(-1 1)">${aydinlik}</g>`;
  }
  return svgSar(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${CZ.koyu}" stroke="${CZ.soluk}" stroke-width="1.5"/>${aydinlik}`, 160, 140);
}
const EVRE = { yeniay: [0, true], hilal: [0.25, true], ilkdordun: [0.5, true], siskin: [0.78, true], dolunay: [1, true],
  siskin2: [0.78, false], sondordun: [0.5, false], hilal2: [0.25, false] };

function dizilisSvg(tur) {
  const gunes = `<circle cx="34" cy="80" r="30" fill="#FBBF24"/>${yazi(34, 128, "Güneş", { boy: 12 })}`;
  const isinlar = [60, 80, 100].map(y => ok(70, y, 104, y, "#FBBF24")).join("");
  const dunya = x => `<circle cx="${x}" cy="80" r="16" fill="${CZ.mavi}"/>${yazi(x, 112, "Dünya", { boy: 12 })}`;
  const ay = x => `<circle cx="${x}" cy="80" r="8" fill="${CZ.ay}"/>${yazi(x, 102, "Ay", { boy: 12 })}`;
  let g = gunes + isinlar;
  if (tur === "yeniay") g += ay(150) + dunya(220);
  else if (tur === "dolunay") g += dunya(160) + ay(232);
  else g += dunya(170) + `<circle cx="170" cy="30" r="8" fill="${CZ.ay}"/>${yazi(196, 30, "Ay", { boy: 12 })}` + cizgi(170, 64, 170, 40, { kesik: true, k: 1.5, renk: CZ.soluk });
  return svgSar(g, 260, 150);
}

function gdaSvg() {
  return svgSar(`<circle cx="90" cy="110" r="88" fill="#FBBF24"/>${yazi(90, 110, "Güneş", { kalin: true, renk: "#1E293B" })}
    <circle cx="214" cy="150" r="14" fill="${CZ.mavi}"/>${yazi(214, 178, "Dünya", { boy: 12 })}
    <circle cx="248" cy="156" r="4" fill="${CZ.ay}"/>${yazi(250, 140, "Ay", { boy: 12 })}`, 270, 200);
}
function yorungeSvg() {
  return svgSar(`<ellipse cx="130" cy="95" rx="105" ry="62" fill="none" stroke="${CZ.soluk}" stroke-dasharray="5 5"/>
    <circle cx="130" cy="95" r="24" fill="#FBBF24"/>${yazi(130, 95, "Güneş", { boy: 11, renk: "#1E293B", kalin: true })}
    <circle cx="235" cy="95" r="12" fill="${CZ.mavi}"/>${yazi(235, 125, "Dünya", { boy: 11 })}
    <circle cx="235" cy="95" r="26" fill="none" stroke="${CZ.soluk}" stroke-dasharray="3 4"/>
    <circle cx="235" cy="69" r="5" fill="${CZ.ay}"/>${yazi(252, 62, "Ay", { boy: 11 })}`, 270, 170);
}

/* Açı: köşe (90,150), bir kol sağa yatay, diğeri derece kadar açık */
function aciSvg(d, harf = "ABC", olcuYaz = true) {
  const [A, B, C] = harf.split("");
  const bx = 100, by = 150, L = 120;
  const ax = bx + L * Math.cos(rad(d)), ay = by - L * Math.sin(rad(d));
  const yay = d >= 179.9 ? `<path d="M ${bx + 26} ${by} A 26 26 0 0 0 ${bx - 26} ${by}" fill="none" stroke="${CZ.vurgu}" stroke-width="2"/>`
    : d === 90 ? `<path d="M ${bx + 18} ${by} L ${bx + 18} ${by - 18} L ${bx} ${by - 18}" fill="none" stroke="${CZ.vurgu}" stroke-width="2"/>`
    : `<path d="M ${bx + 28} ${by} A 28 28 0 0 0 ${bx + 28 * Math.cos(rad(d))} ${by - 28 * Math.sin(rad(d))}" fill="none" stroke="${CZ.vurgu}" stroke-width="2"/>`;
  const om = rad(d / 2);
  return svgSar(cizgi(bx, by, bx + L, by) + cizgi(bx, by, ax, ay) + nokta(bx, by) + yay
    + yazi(bx - 2, by + 16, B, { kalin: true }) + yazi(bx + L + 4, by + 14, C, { kalin: true }) + yazi(ax + (d > 100 ? -10 : 8), ay - 8, A, { kalin: true })
    + (olcuYaz ? yazi(bx + 52 * Math.cos(om), by - 52 * Math.sin(om), d + "°", { renk: CZ.vurgu, kalin: true }) : ""), 260, 175);
}

function aciolcerSvg(d) {
  const cx = 150, cy = 165, r = 120;
  let g = `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z" fill="rgba(96,165,250,.12)" stroke="${CZ.soluk}"/>`;
  for (let a = 0; a <= 180; a += 10) {
    const u = a % 30 === 0 ? 14 : 8;
    g += cizgi(cx + r * Math.cos(rad(a)), cy - r * Math.sin(rad(a)), cx + (r - u) * Math.cos(rad(a)), cy - (r - u) * Math.sin(rad(a)), { k: 1.2, renk: CZ.soluk });
    if (a % 30 === 0) g += yazi(cx + (r - 26) * Math.cos(rad(a)), cy - (r - 26) * Math.sin(rad(a)), a, { boy: 11, renk: CZ.soluk });
  }
  g += cizgi(cx, cy, cx + r + 10, cy, { k: 3 }) + cizgi(cx, cy, cx + (r + 10) * Math.cos(rad(d)), cy - (r + 10) * Math.sin(rad(d)), { k: 3, renk: CZ.vurgu }) + nokta(cx, cy, 4);
  return svgSar(g, 300, 185);
}

function dogrularSvg(t) {
  const uc = (x, y, h) => yazi(x, y, h, { kalin: true, boy: 13 });
  if (t === "paralel") return svgSar(cizgi(20, 60, 240, 60) + cizgi(20, 120, 240, 120) + uc(14, 46, "A") + uc(246, 46, "B") + uc(14, 106, "C") + uc(246, 106, "D"), 260, 160);
  if (t === "dik") return svgSar(cizgi(20, 110, 240, 110) + cizgi(130, 15, 130, 160) + `<path d="M 130 96 L 144 96 L 144 110" fill="none" stroke="${CZ.vurgu}" stroke-width="2"/>`
    + uc(14, 96, "A") + uc(246, 96, "B") + uc(144, 14, "C") + uc(144, 160, "D"), 260, 175);
  return svgSar(cizgi(20, 40, 240, 140) + cizgi(20, 140, 240, 40) + uc(14, 28, "A") + uc(246, 152, "B") + uc(14, 152, "C") + uc(246, 28, "D"), 260, 175);
}

function kesisenSvg(d) {
  const cx = 130, cy = 90, L = 110;
  const g = cizgi(cx - L, cy, cx + L, cy) + cizgi(cx - L * Math.cos(rad(d)), cy + L * Math.sin(rad(d)), cx + L * Math.cos(rad(d)), cy - L * Math.sin(rad(d))) + nokta(cx, cy)
    + yazi(cx + 4, cy + 16, "O", { kalin: true })
    + yazi(cx + 44 * Math.cos(rad(d / 2)), cy - 44 * Math.sin(rad(d / 2)), d + "°", { renk: CZ.vurgu, kalin: true })
    + yazi(cx + 40 * Math.cos(rad(90 + d / 2)), cy - 40 * Math.sin(rad(90 + d / 2)), "a", { kalin: true, renk: CZ.mavi })
    + yazi(cx - 44 * Math.cos(rad(d / 2)), cy + 44 * Math.sin(rad(d / 2)), "b", { kalin: true, renk: CZ.mavi })
    + yazi(cx - 40 * Math.cos(rad(90 + d / 2)), cy + 40 * Math.sin(rad(90 + d / 2)), "c", { kalin: true, renk: CZ.mavi });
  return svgSar(g, 260, 180);
}

/* İki paralel doğru (d1 üstte, d2 altta) ve kesen. Her kesişimde açılar: 1 sol üst, 2 sağ üst, 3 sağ alt, 4 sol alt (alt kesişimde 5–8).
   2 numaralı açı (sağ yatay kol ile yukarı kesen arası) = d derece. */
function kesenSvg(d) {
  const y1 = 60, y2 = 140, x1 = 120, dx = (y2 - y1) / Math.tan(rad(d)), x2 = x1 - dx;
  const L = 40, kx = Math.cos(rad(d)), ky = Math.sin(rad(d));
  const etiket = (x, y, n) => {
    const p = [[-1, -1], [1, -1], [1, 1], [-1, 1]][(n - 1) % 4];
    return yazi(x + p[0] * 20, y + p[1] * 13, n, { boy: 12, kalin: true, renk: n === 2 ? CZ.vurgu : CZ.mavi });
  };
  let g = cizgi(10, y1, 250, y1) + cizgi(10, y2, 250, y2) + cizgi(x1 + L * kx, y1 - L * ky, x2 - L * kx, y2 + L * ky)
    + yazi(256, y1, "d", { boy: 12 }) + yazi(256, y2, "e", { boy: 12 }) + yazi(x1 + L * kx + 6, y1 - L * ky - 8, "k", { boy: 12 });
  for (let n = 1; n <= 4; n++) g += etiket(x1, y1, n);
  for (let n = 5; n <= 8; n++) g += etiket(x2, y2, n);
  g += yazi(200, y1 - 22, `2 = ${d}°`, { boy: 12, renk: CZ.vurgu, kalin: true }) + yazi(36, 18, "d // e", { boy: 12, renk: CZ.soluk });
  return svgSar(g, 270, 200);
}

function cokgenSvg(n, kosegen, duzgun = true) {
  const cx = 130, cy = 100, r = 78, harf = "ABCDEFGH";
  const nok = Array.from({ length: n }, (_, i) => {
    const a = rad(90 + 180 / n + i * 360 / n);
    const rr = duzgun ? r : r * (i % 2 ? 0.78 : 1.0) * (i === 1 ? 0.9 : 1);
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  });
  let g = `<polygon points="${nok.map(p => p.join(",")).join(" ")}" fill="rgba(96,165,250,.12)" stroke="${CZ.ink}" stroke-width="2.5"/>`;
  if (kosegen) for (let i = 2; i < n - 1; i++) g += cizgi(nok[0][0], nok[0][1], nok[i][0], nok[i][1], { renk: CZ.vurgu, k: 2, kesik: true });
  nok.forEach(([x, y], i) => { g += nokta(x, y) + yazi(cx + (x - cx) * 1.2, cy + (y - cy) * 1.2, harf[i], { kalin: true }); });
  return svgSar(g, 260, 200);
}

function cemberSvg() {
  const cx = 130, cy = 95, r = 70;
  return svgSar(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${CZ.ink}" stroke-width="2.5"/>`
    + cizgi(cx - r, cy, cx + r, cy, { renk: CZ.mavi }) + cizgi(cx, cy, cx + r * Math.cos(rad(55)), cy - r * Math.sin(rad(55)), { renk: CZ.vurgu })
    + nokta(cx, cy) + nokta(cx - r, cy) + nokta(cx + r, cy) + nokta(cx + r * Math.cos(rad(55)), cy - r * Math.sin(rad(55)))
    + yazi(cx, cy + 16, "O", { kalin: true }) + yazi(cx - r - 12, cy, "B", { kalin: true }) + yazi(cx + r + 12, cy, "C", { kalin: true })
    + yazi(cx + (r + 12) * Math.cos(rad(55)), cy - (r + 12) * Math.sin(rad(55)), "A", { kalin: true }), 260, 190);
}

function sembolSvg(t) {
  const y = 60;
  if (t === "dogru") return svgSar(ok(130, y, 20, y) + ok(130, y, 240, y) + nokta(80, y) + nokta(180, y) + yazi(80, y + 20, "A", { kalin: true }) + yazi(180, y + 20, "B", { kalin: true }), 260, 100);
  if (t === "isin") return svgSar(ok(80, y, 240, y) + nokta(80, y) + nokta(180, y) + yazi(80, y + 20, "A", { kalin: true }) + yazi(180, y + 20, "B", { kalin: true }), 260, 100);
  return svgSar(cizgi(70, y, 200, y) + nokta(70, y) + nokta(200, y) + yazi(70, y + 20, "A", { kalin: true }) + yazi(200, y + 20, "B", { kalin: true }), 260, 100);
}

function cizim(kod) {
  if (!kod) return "";
  const [t, a, b] = String(kod).split(":");
  try {
    switch (t) {
      case "evre": { const e = EVRE[a]; return e ? ayEvresiSvg(e[0], e[1]) : ""; }
      case "dizilis": return dizilisSvg(a);
      case "gda": return gdaSvg();
      case "yorunge": return yorungeSvg();
      case "aci": return aciSvg(+a, b || "ABC", true);
      case "acisiz": return aciSvg(+a, b || "ABC", false);
      case "aciolcer": return aciolcerSvg(+a);
      case "dogrular": return dogrularSvg(a);
      case "kesisen": return kesisenSvg(+a);
      case "kesen": return kesenSvg(+a);
      case "cokgen": return cokgenSvg(+a, b === "kosegen");
      case "cokgensiz": return cokgenSvg(+a, false, false);
      case "cember": return cemberSvg();
      case "sembol": return sembolSvg(a);
      default: return "";
    }
  } catch (_) { return ""; }
}

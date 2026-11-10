const fs = require("fs"), R = require("../web/js/motor/rapor.js");
const satirlar = fs.readFileSync(process.argv[2], "utf8").trim().split("\n");
function esit(a, b, yol, f) {
  if (typeof a === "number" && typeof b === "number") { if (Math.abs(a - b) > 1e-9) f.push(`${yol}: ${a} ≠ ${b}`); return; }
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") { if (a !== b) f.push(`${yol}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); return; }
  for (const x of new Set([...Object.keys(a), ...Object.keys(b)])) esit(a[x], b[x], yol + "." + x, f);
}
let hata = 0;
satirlar.forEach((s, i) => {
  const { girdi: g, cikti, kiyas } = JSON.parse(s);
  let js, jk;
  try { js = R.raporHazirla(g); delete js.olusturma; const bas = g.bas;
    const P = require("../web/js/motor/planlayici.js");
    const o2 = R.raporHazirla(Object.assign({}, g, { bas: P.gunEkle(bas, -28), bit: P.gunEkle(bas, -1) })); jk = R.karsilastir(js, o2);
  } catch (e) { js = { HATA: e.stack }; }
  const f = []; esit(cikti, js, "", f); esit(kiyas, jk, "kiyas", f);
  if (f.length) { hata++; if (hata <= 4) console.log("#" + i, f.slice(0, 5).join("\n   ")); }
});
console.log(`senaryo ${satirlar.length}, farklı ${hata}`);

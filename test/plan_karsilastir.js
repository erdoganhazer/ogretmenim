const fs = require("fs"), P = require("../web/js/motor/planlayici.js");
const satirlar = fs.readFileSync(process.argv[2], "utf8").trim().split("\n");
function esit(a, b, yol, f) {
  if (typeof a === "number" && typeof b === "number") { if (Math.abs(a - b) > 1e-9) f.push(`${yol}: ${a} ≠ ${b}`); return; }
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") { if (a !== b) f.push(`${yol}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); return; }
  if (Array.isArray(a) !== Array.isArray(b)) { f.push(`${yol}: tür`); return; }
  const k = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const x of k) esit(a[x], b[x], yol + "." + x, f);
}
let hata = 0;
satirlar.forEach((s, i) => {
  const { girdi: g, cikti } = JSON.parse(s);
  let js;
  try { js = P.planHesapla(g.odevler, g.program, g.etkinlikler, g.ayarlar, g.ozel_gunler, g.calisma, g.sira, g.bugun, g.simdi_dk, g.dersler, g.secili); }
  catch (e) { js = { HATA: e.message }; }
  const f = []; esit(cikti, js, "", f);
  if (f.length) { hata++; if (hata <= 5) console.log("#" + i, f.slice(0, 6).join("\n   ")); }
});
console.log(`senaryo ${satirlar.length}, farklı ${hata}`);

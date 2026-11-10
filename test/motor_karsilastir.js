/* motor_uret.py çıktısını JS çekirdeğiyle yeniden oynatır ve her adımı karşılaştırır. */
global.Planlayici = require("../web/js/motor/planlayici.js");
global.Rapor = require("../web/js/motor/rapor.js");
global.TOHUM = require("../web/js/motor/tohum_veri.js");
const fs = require("fs"), { Motor } = require("../web/js/motor/cekirdek.js");
const yazili = JSON.parse(fs.readFileSync("/home/claude/ogretmenim/web/hazirlik/yazili1.json", "utf8"));
const kanon = x => Array.isArray(x) ? "[" + x.map(kanon).join(",") + "]" : x && typeof x === "object" ? "{" + Object.keys(x).sort((a, b) => Rapor.pyStrCmp(a, b)).map(k => JSON.stringify(k) + ":" + kanon(x[k])).join(",") + "}" : JSON.stringify(x);
function* satirOku(yol) {
  const fd = fs.openSync(yol, "r"), tampon = Buffer.alloc(1 << 24); let artik = "";
  for (;;) { const n = fs.readSync(fd, tampon, 0, tampon.length, null); if (!n) break; artik += tampon.toString("utf8", 0, n);
    const parca = artik.split("\n"); artik = parca.pop(); for (const p of parca) if (p) yield JSON.parse(p); }
  if (artik.trim()) yield JSON.parse(artik);
}
const satirlar = satirOku(process.argv[2]);
const PY_HATA = /invalid literal|could not convert|argument must be|not supported|object has no attribute|unsupported operand|int\(\)|'<' not/;
function fark(a, b, yol, f) {
  if (f.length > 6) return;
  if (typeof a === "number" && typeof b === "number") { if (Math.abs(a - b) > 1e-9) f.push(`${yol}: ${a} ≠ ${b}`); return; }
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") { if (a !== b) f.push(`${yol}: ${JSON.stringify(a)?.slice(0, 300)} ≠ ${JSON.stringify(b)?.slice(0, 300)}`); return; }
  if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length) f.push(`${yol}: uzunluk ${a.length} ≠ ${b.length}`);
  for (const x of new Set([...Object.keys(a), ...Object.keys(b)])) fark(a[x], b[x], yol + "." + x, f);
}
let m, sayac, saat, hataSay = 0, adimSay = 0, sn = -1;
const ortam = { tz: 180, yazili, simdi: () => new Date(Date.parse(saat)), kimlik: () => (++sayac.n).toString(16).padStart(32, "0") };
const durumAl = () => { const v = JSON.parse(JSON.stringify(m.veri)); delete v.guvenlik; delete v.esitleme;
  const kel = v.koleksiyonlar.kelimeler; v.koleksiyonlar.kelimeler = { sayi: kel.length, ozet: require("crypto").createHash("sha1").update(kanon(kel)).digest("hex") }; return v; };
for (const s of satirlar) {
  saat = s.saat;
  if (s.yeni) { sn++; sayac = { n: 0 }; m = new Motor(JSON.parse(JSON.stringify(s.veri)), ortam); m.tohumla(); }
  let js = null;
  if (!s.yeni) {
    js = m.api(s.yontem, s.yol, s.govde === null ? undefined : JSON.parse(JSON.stringify(s.govde)), { veli: s.veli, ad: "Hazer", veliKayit: { id: "f".repeat(32), ad: "Hazer" } });
    js = JSON.parse(JSON.stringify(js));
  }
  const f = [];
  if (js) {
    if (js.durum !== s.durum_kodu) f.push(`durum ${s.durum_kodu} ≠ ${js.durum}`);
    if (s.yol.startsWith("rapor") && s.cevap) { delete s.cevap.olusturma; delete js.govde.olusturma; }
    const pyMesaj = s.cevap && s.cevap.hata;
    if (!(pyMesaj && PY_HATA.test(pyMesaj))) fark(s.cevap, js.govde, "cevap", f);
  }
  fark(s.durum, durumAl(), "veri", f);
  adimSay++;
  if (f.length) {
    hataSay++;
    if (hataSay <= 5) console.log(`senaryo ${sn} ${s.yeni ? "TOHUM" : s.yontem + " " + s.yol} ${JSON.stringify(s.govde)?.slice(0, 200)} veli=${s.veli}\n   ` + f.join("\n   "));
    const kel = m.veri.koleksiyonlar.kelimeler; m.veri = JSON.parse(JSON.stringify(s.durum)); m.veri.koleksiyonlar.kelimeler = kel;        // sonraki adımlar bağımsız sınansın
  }
}
console.log(`adım ${adimSay}, farklı ${hataSay}`);

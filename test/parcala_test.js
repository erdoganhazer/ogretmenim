global.Planlayici = require("../web/js/motor/planlayici.js"); global.Rapor = require("../web/js/motor/rapor.js"); global.TOHUM = require("../web/js/motor/tohum_veri.js");
const { Motor } = require("../web/js/motor/cekirdek.js"), Pc = require("../web/js/motor/parcala.js"), assert = require("assert");
let t = Date.parse("2026-11-02T12:00:00Z");
const m = new Motor(null, { tz: 180, simdi: () => new Date(t) }); m.tohumla();
const V = { veli: true, ad: "Hazer" };
const o = m.api("POST", "k/odevler", { ders_id: m.veri.koleksiyonlar.dersler[1].id, teslim: "2026-11-05", kaynaklar: [{ ad: "MEB", sayfa: "1-6" }, { ad: "Defter", sayfa: "3" }] }, V).govde;
for (let i = 0; i < 30; i++) {
  t += 3600e3 * 7;
  m.api("GET", "plan", undefined, { veli: false });
  m.api("POST", "plan/islem", { tur: ["bitti", "yarim", "zor"][i % 3], odev_id: o.id, birim_bas: i % 4, birim_bit: (i % 4) + 1, dk_plan: 10, dk_gercek: 12 }, { veli: false });
  m.api("POST", "plan/islem", { tur: "ozel_gun", dk: 30 }, V);
  m.api("POST", "alistirma", { arac: "oyun", soru: "q" + i, dogru: i % 2 }, { veli: false });
  if (i % 5 === 0) m.api("POST", "plan/islem", { tur: "simdi", odev_id: o.id }, { veli: false });
}
const b = Pc.belgeler(m.veri);
const geri = Pc.birlestir(b, { alistirmalar: m.veri.alistirmalar, gunluk: m.veri.gunluk });
const sade = v => { const x = JSON.parse(JSON.stringify(v)); delete x.guvenlik; delete x.esitleme; return x; };
const a1 = sade(m.veri), a2 = sade(geri);
for (const k of ["uniteler", "konular", "notlar", "muzikler"]) delete a1.koleksiyonlar[k];
for (const k of Object.keys(a1)) assert.deepStrictEqual(a2[k], a1[k], k);
console.log("gidiş-dönüş tamam; belge sayısı", b.size, "plan_gun", [...b.keys()].filter(k => k.startsWith("plan_gun")).length);

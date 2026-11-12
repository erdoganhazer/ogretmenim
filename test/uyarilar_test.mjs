import assert from "node:assert";
import { uyarilariHesapla } from "../functions/ortak/uyarilar.mjs";
const temel = { ad: "Arın", bugun: "2026-11-12", saat: 20, etkinlikler: [], notlar: {}, mesajlar: [], dersler: { m: "Matematik", f: "Fen" }, planGunler: {} };
let r = uyarilariHesapla({ ...temel, odevler: [{ id: "o1", ders_id: "m", teslim: "2026-11-13", bitti: false }] });
assert.deepStrictEqual(r.uyarilar.map(u => u.anahtar), ["plan:2026-11-12", "yarin:o1"]);
r = uyarilariHesapla({ ...temel, odevler: [{ id: "o1", ders_id: "m", teslim: "2026-11-13", bitti: false }],
  planGunler: { "2026-11-12": { gun: { planlanan: 60, plan_odevler: ["o1"] }, calisma: [{ odev_id: "o1", durum: "bitti", dk_plan: 60, birim_bit: 2 }] } } });
assert.deepStrictEqual(r.uyarilar.map(u => u.anahtar), []);
r = uyarilariHesapla({ ...temel, saat: 15, odevler: [{ id: "o2", ders_id: "f", teslim: "2026-11-10", bitti: false }], etkinlikler: [{ id: "s1", tur: "sinav", ders_id: "f", tarih: "2026-11-05" }],
  mesajlar: [{ id: "m1", kimden: "ogrenci", tur: "istek", metin: "Pergel lazım", tamam: false }] });
assert.deepStrictEqual(r.uyarilar.map(u => u.tur), ["geciken", "istek", "not"]);
console.log("uyarı kuralları: tamam");

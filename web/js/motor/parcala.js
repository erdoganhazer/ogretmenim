/* ÖğretmeniM web — motor verisi ↔ Firestore belgeleri.
   Motor tek bir veri nesnesiyle çalışır; Firestore'da her kayıt ayrı belgedir (güvenlik kuralları kayıt başına denetler).
   Yollar öğrenci belgesine göredir: "" = ogrenciler/{oid}, "odevler/<id>", "plan/ayarlar", "plan_gun/<tarih>",
   "alistirmalar/<gün>", "gunluk/<gün>". */
"use strict";

const Parcala = (() => {
  const KAYIT_KOLLARI = ["dersler", "odevler", "etkinlikler", "baglantilar", "cep_notlari", "mesajlar", "kelime_defterleri", "kelimeler", "ders_notlari"];
  const EKLEMELI = ["alistirmalar", "gunluk"];              // yalnız eklenen günlük listeler (arrayUnion ile yazılır)
  const ANA_ALANLAR = ["sema", "profil", "ayarlar", "ders_programi", "tohum", "icerik"];
  /* Sınav notları ayrı belgede: öğrenci okuyamaz (kural), ileride öğretmen de yazar. Etkinlik belgesinde puan tutulmaz. */
  const NOT_KOL = "sinav_notlari";
  const PLAN_GUN_ALANLARI = [["gunler", "gun"], ["ozel_gunler", "ozel"], ["sira", "sira"], ["simdi", "simdi"]];

  /* veri → { yol: belge } (eklemeli listeler hariç) */
  function belgeler(veri) {
    const b = new Map();
    const ana = {}; for (const a of ANA_ALANLAR) if (a in veri) ana[a] = veri[a];
    b.set("", ana);
    for (const kol of KAYIT_KOLLARI) {
      const liste = veri.koleksiyonlar[kol] || [];
      // _s: kaydın listedeki sırası (aynı saniyede açılan kayıtlar da Firestore'dan aynı sırayla dönsün)
      let son = liste.reduce((m, k) => (typeof k._s === "number" && k._s > m ? k._s : m), 0);
      for (const k of liste) {
        if (typeof k._s !== "number") k._s = ++son;
        if (kol === "etkinlikler" && "puan" in k) {
          const { puan, ...kalan } = k;
          b.set(`etkinlikler/${k.id}`, kalan);
          b.set(`${NOT_KOL}/${k.id}`, { id: k.id, puan: puan === undefined ? null : puan });
        } else b.set(`${kol}/${k.id}`, k);
      }
    }
    const p = veri.plan || {};
    b.set("plan/ayarlar", { ayarlar: p.ayarlar || {} });
    const gunler = new Map();
    const gun = t => { if (!gunler.has(t)) gunler.set(t, {}); return gunler.get(t); };
    for (const [alan, kisa] of PLAN_GUN_ALANLARI) for (const [t, v] of Object.entries(p[alan] || {})) gun(t)[kisa] = v;
    for (const c of p.calisma || []) (gun(c.tarih).calisma || (gun(c.tarih).calisma = [])).push(c);
    for (const s of p.secimler || []) (gun(s.tarih).secimler || (gun(s.tarih).secimler = [])).push(s);
    for (const [t, v] of gunler) if (/^\d{4}-\d{2}-\d{2}$/.test(t)) b.set(`plan_gun/${t}`, v);
    return b;
  }
  /* { yol: belge } → veri (eklemeli listeler ayrıca verilir) */
  function birlestir(harita, eklemeli = {}) {
    const veri = { koleksiyonlar: {}, plan: { ayarlar: {}, ozel_gunler: {}, sira: {}, gunler: {}, calisma: [], simdi: {}, secimler: [] } };
    for (const kol of KAYIT_KOLLARI) veri.koleksiyonlar[kol] = [];
    const planGun = [], notlar = new Map();
    for (const [yol, d] of harita) {
      if (yol === "") Object.assign(veri, Object.fromEntries(ANA_ALANLAR.filter(a => a in d).map(a => [a, d[a]])));
      else if (yol === "plan/ayarlar") veri.plan.ayarlar = d.ayarlar || {};
      else if (yol.startsWith("plan_gun/")) planGun.push([yol.slice(9), d]);
      else if (yol.startsWith(NOT_KOL + "/")) notlar.set(yol.slice(NOT_KOL.length + 1), d.puan === undefined ? null : d.puan);
      else { const [kol] = yol.split("/"); if (KAYIT_KOLLARI.includes(kol)) veri.koleksiyonlar[kol].push(d); }
    }
    for (const kol of KAYIT_KOLLARI) veri.koleksiyonlar[kol].sort((a, b) => (a._s || 0) - (b._s || 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    for (const e of veri.koleksiyonlar.etkinlikler) if (notlar.has(e.id)) e.puan = notlar.get(e.id);
    planGun.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    for (const [t, d] of planGun) {
      for (const [alan, kisa] of PLAN_GUN_ALANLARI) if (kisa in d) veri.plan[alan][t] = d[kisa];
      veri.plan.calisma.push(...(d.calisma || []));
      veri.plan.secimler.push(...(d.secimler || []));
    }
    for (const a of EKLEMELI) veri[a] = [...(eklemeli[a] || [])];
    return veri;
  }
  /* eklemeli liste → { gün: [kayıt] } */
  function gunlere(liste) {
    const g = new Map();
    for (const k of liste) { const t = String(k.zaman || "").slice(0, 10); if (!g.has(t)) g.set(t, []); g.get(t).push(k); }
    return g;
  }
  return { KAYIT_KOLLARI, EKLEMELI, NOT_KOL, belgeler, birlestir, gunlere };
})();
if (typeof module !== "undefined") module.exports = Parcala;

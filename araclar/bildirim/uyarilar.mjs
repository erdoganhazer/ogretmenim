/* Veli uyarıları — web/js/veli_ozet.js'deki veliUyarilari() ile aynı kurallar (anahtarlar da aynı:
   plan:<gün>, geciken:<ödev>, yarin:<ödev>, istek:<mesaj>, not:<sınav>). Saf işlev: test edilebilir. */
export function gunEkle(t, n) { const d = new Date(t + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

/* v: { ad, bugun, saat (0-23), odevler, etkinlikler, notlar:{id:puan}, mesajlar, dersler:{id:ad}, planGunler:{tarih:{gun, calisma}} } */
export function uyarilariHesapla(v) {
  const { bugun, saat } = v, yarin = gunEkle(bugun, 1), ad = v.ad || "Öğrenci", u = [];
  const dersAdi = id => v.dersler[id] || "Ders";
  const odevler = v.odevler.filter(o => !o.silindi), acik = odevler.filter(o => !o.bitti);
  const pg = v.planGunler[bugun] || {}, cal = pg.calisma || [];
  const yapilan = cal.filter(c => ["bitti", "yarim"].includes(c.durum)).reduce((t, c) => t + (parseInt(c.dk_plan, 10) || 0), 0);
  const planlanan = (pg.gun && pg.gun.planlanan) || 0;
  const biten = cal.filter(c => c.durum === "bitti").length, calisti = cal.some(c => ["bitti", "yarim"].includes(c.durum));
  const yaklasan = acik.some(o => o.teslim <= gunEkle(bugun, 2));
  if (planlanan > 0 && saat >= 17 && yapilan < planlanan * 0.9) {
    const yapilanlar = new Set(cal.filter(c => c.durum === "bitti").map(c => c.odev_id));
    const kalan = ((pg.gun && pg.gun.plan_odevler) || []).filter(id => !yapilanlar.has(id)).map(id => acik.find(o => o.id === id)).filter(Boolean).map(o => dersAdi(o.ders_id));
    u.push({ anahtar: `plan:${bugun}`, tur: "plan", metin: `${ad}: bugünkü planın %${Math.round(100 * yapilan / planlanan)} kadarı yapıldı${kalan.length ? ` · kalan: ${[...new Set(kalan)].join(", ")}` : ""}` });
  } else if (saat >= 17 && !calisti && yaklasan) {
    u.push({ anahtar: `plan:${bugun}`, tur: "plan", metin: `${ad} bugün hiç çalışma işaretlemedi; teslimi yaklaşan ödev var` });
  }
  for (const o of acik.filter(o => o.teslim < bugun)) u.push({ anahtar: `geciken:${o.id}`, tur: "geciken", metin: `${dersAdi(o.ders_id)} ödevinin teslimi geçti` });
  const ilerleme = new Set();
  for (const g of Object.values(v.planGunler)) for (const c of g.calisma || []) if ((parseInt(c.birim_bit, 10) || 0) > 0) ilerleme.add(c.odev_id);
  for (const o of acik.filter(o => o.teslim === yarin && !ilerleme.has(o.id))) u.push({ anahtar: `yarin:${o.id}`, tur: "yarin", metin: `Yarın teslim: ${dersAdi(o.ders_id)} ödevine başlanmadı` });
  for (const m of v.mesajlar.filter(m => !m.silindi && m.kimden === "ogrenci" && m.tur === "istek" && !m.tamam)) u.push({ anahtar: `istek:${m.id}`, tur: "istek", metin: `${ad}: “${String(m.metin).slice(0, 80)}”` });
  for (const s of v.etkinlikler.filter(e => !e.silindi && e.tur === "sinav" && e.tarih < bugun && e.tarih >= gunEkle(bugun, -30) && typeof v.notlar[e.id] !== "number"))
    u.push({ anahtar: `not:${s.id}`, tur: "not", metin: `${dersAdi(s.ders_id)} sınavının notu girilmedi` });
  return { uyarilar: u, ozet: `${ad} bugün ${biten} iş bitirdi${planlanan ? ` (plan %${Math.min(100, Math.round(100 * yapilan / planlanan))})` : ""}.` };
}

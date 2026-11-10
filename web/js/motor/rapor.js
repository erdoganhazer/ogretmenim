/* ÖğretmeniM web — öğrenci raporu (veli). rapor.py'nin (0.23) birebir JavaScript karşılığı; kayıtları kurallarla yorumlar.
   Karşılaştırmalı test: test/rapor_karsilastir.js */
"use strict";

const Rapor = (() => {
  const P = typeof Planlayici !== "undefined" ? Planlayici : require("./planlayici.js");
  const GUN = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
  const ESIK_ODEV = 3, ESIK_CALISMA = 3;
  const NOT_TEMALARI = [
    ["yorgunluk", ["yorgun", "uykum", "uyku", "bitkin", "yoruldum"], "yorgunluk"],
    ["anlamadim", ["anlamad", "anlayamad", "bilmiyorum", "zor geldi", "çözemed", "cozemed", "yapamad"], "konuyu anlamama"],
    ["malzeme", ["unuttum", "okulda kald", "kitab", "defter", "yanımda değil", "yok"], "malzeme eksikliği"],
    ["zaman", ["vakit", "zaman", "yetişmed", "geç oldu", "misafir", "dışarı", "antrenman", "kurs"], "zaman / başka etkinlik"],
    ["isteksiz", ["canım istem", "sıkıl", "sikil", "istemiyorum", "sonra"], "isteksizlik"],
  ];
  const { pyRound, gunEkle, gunFarki } = P;
  const t = s => P.tarih(String(s).slice(0, 10));
  const haftaGunu = s => (P.jsGun(s) + 6) % 7;            // Python date.weekday(): Pazartesi = 0
  /* datetime.fromisoformat yerine: saat dilimini çevirmeden "gün + dakika" */
  function dt(s) {
    const m = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.exec(String(s == null ? "" : s));
    if (!m) return null;
    try { P.tarih(m[1]); } catch (_) { return null; }
    return { gun: m[1], dk: m[2] ? parseInt(m[2], 10) * 60 + parseInt(m[3], 10) : 0 };
  }
  const saatOf = z => Math.floor(z.dk / 60);
  const ilk = (d, k, v) => { if (!d.has(k)) d.set(k, v); return d.get(k); };
  /* Python "%.1f": tam yarıda çifte yuvarlar (1.25 → 1,2); JS toFixed yukarı yuvarlar */
  function f1(x) {
    const tam = Math.abs(x).toFixed(100), nokta = tam.indexOf(".");       // ikilik sayının tam ondalık açılımı
    let s;
    if (/^50*$/.test(tam.slice(nokta + 2))) { const n = Math.floor(Math.abs(x) * 10); s = (Math.sign(x) * (n % 2 === 0 ? n : n + 1) / 10).toFixed(1); }
    else s = x.toFixed(1);
    return s.replace(".", ",");
  }
  const iki = n => String(n).padStart(2, "0");

  const BIRLER = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
  const ONLAR = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"];
  function sonKelime(n) {
    n = Math.abs(Math.trunc(n));
    if (n === 0) return "sıfır";
    if (n % 10) return BIRLER[n % 10];
    if (n % 100) return ONLAR[Math.floor((n % 100) / 10)];
    if (n % 1000) return "yüz";
    return "bin";
  }
  const UNLU = "aeıioöuü";
  function ek(n, hal) {
    const k = sonKelime(n), unlu = [...k].filter(h => UNLU.includes(h)).pop(), son = k[k.length - 1];
    if (hal === "i") { const e = { a: "ı", ı: "ı", o: "u", u: "u", e: "i", i: "i", ö: "ü", ü: "ü" }[unlu]; return `${n}'${UNLU.includes(son) ? "y" : ""}${e}`; }
    if (hal === "de" || hal === "den") { const sert = "çfhkpsşt".includes(son); const e = (sert ? "t" : "d") + ("aıou".includes(unlu) ? "a" : "e"); return `${n}'${e}${hal === "den" ? "n" : ""}`; }
    if (hal === "si" || hal === "sini" || hal === "sinde") {
      const H = { a: "ı", ı: "ı", o: "u", u: "u", e: "i", i: "i", ö: "ü", ü: "ü" }[unlu], A = "aıou".includes(unlu) ? "a" : "e";
      const kok = (UNLU.includes(son) ? "s" : "") + H;
      return `${n}'${kok + { si: "", sini: "n" + H, sinde: "nd" + A }[hal]}`;
    }
    if (hal === "in") { const e = { a: "ın", ı: "ın", o: "un", u: "un", e: "in", i: "in", ö: "ün", ü: "ün" }[unlu]; return `${n}'${UNLU.includes(son) ? "n" : ""}${e}`; }
    return String(n);
  }
  const yuzde = (a, b) => (b ? pyRound(100 * a / b) : 0);
  const ad = (dersler, did) => dersler[did] || "Ders";
  const bulgu = (tur, baslik, metin, kanit = "", oneri = "", kisa = "") => ({ tur, baslik, metin, kanit, oneri, kisa: kisa || baslik });
  const B = o => bulgu(o.tur, o.baslik, o.metin, o.kanit || "", o.oneri || "", o.kisa || "");

  function okulGunleri(program, bas, bit) {
    const hucreler = (program || {}).hucreler || {};
    const gunler = new Set(Object.keys(hucreler).map(k => parseInt(k.split("-")[0], 10)));
    const sonuc = [];
    for (let d = bas; d <= bit; d = gunEkle(d, 1)) if (gunler.has(P.jsGun(d))) sonuc.push(d);
    return sonuc;
  }
  const sirala = (l, f) => l.map((x, i) => [x, i]).sort((a, b) => { const x = f(a[0]), y = f(b[0]); return x < y ? -1 : x > y ? 1 : a[1] - b[1]; }).map(x => x[0]);

  function raporHazirla({ odevler, calisma, secimler, gunler, sinavlar, dersler, gelisim, program, bas, bit, ad: ogrAd = "Arın", bugun = null, simdi = null }) {
    bas = t(bas); bit = t(bit);
    bugun = bugun ? t(bugun) : new Date().toISOString().slice(0, 10);
    const olcut = {};
    const icinde = s => !!s && bas <= t(s) && t(s) <= bit;
    const odevBy = new Map(); for (const o of odevler) if (!o.silindi) odevBy.set(o.id, o);
    const cal = calisma.filter(c => icinde(c.tarih) && odevBy.has(c.odev_id));
    const donemOdev = [...odevBy.values()].filter(o => icinde(o.teslim));
    const bolumler = [], yetersiz = [];
    const enKucuk = (a, b) => (a < b ? a : b);

    /* 1. Düzen */
    const duzen = [];
    const okul = okulGunleri(program, bas, enKucuk(bit, bugun));
    const calisilan = [...new Set(cal.filter(c => ["bitti", "yarim"].includes(c.durum)).map(c => t(c.tarih)))].sort();
    if (okul.length) {
      const say = okul.filter(d => calisilan.includes(d)).length, oran = yuzde(say, okul.length);
      olcut.duzen = oran;
      let seri = 0, enUzun = 0, onceki = null;
      for (const d of calisilan) { seri = (onceki && gunFarki(d, onceki) === 1) ? seri + 1 : 1; enUzun = Math.max(enUzun, seri); onceki = d; }
      const tur = oran >= 80 ? "iyi" : oran < 50 ? "dikkat" : "bilgi";
      duzen.push(bulgu(tur, "Düzenli çalışma",
        `Okul günlerinin %${ek(oran, "sinde")} ödev çalıştı${oran >= 80 ? "; düzeni oturmuş" : oran < 50 ? "; bazı günler hiç çalışmadan geçiyor" : ""}.`,
        `${okul.length} okul gününün ${ek(say, "sinde")} kayıt var; en uzun kesintisiz seri ${enUzun} gün.`,
        oran >= 80 ? "" : "Çalışmadığı günlerde planda kısa bir iş (10–15 dk) bırakmak alışkanlığı korur.",
        oran >= 80 ? "neredeyse her gün düzenli çalışıyor" : "düzenli çalışma"));
      const haftasonu = calisilan.filter(d => haftaGunu(d) >= 5);
      if (haftasonu.length) duzen.push(bulgu("bilgi", "Hafta sonu", `Hafta sonları da ${haftasonu.length} gün çalıştı.`));
    }
    const baslangic = [];
    for (const c of cal) {
      const z = dt(c.zaman);
      if (z && (c.yer === undefined ? "ev" : c.yer) === "ev" && ["bitti", "yarim"].includes(c.durum) && c.dk_gercek) baslangic.push((((z.dk - parseInt(c.dk_gercek, 10)) % 1440) + 1440) % 1440);
    }
    if (baslangic.length >= ESIK_CALISMA) {
      const dk = baslangic.slice().sort((a, b) => a - b), ort = dk[Math.floor(dk.length / 2)], gec = dk.filter(x => x >= 20 * 60);
      olcut.baslangic = ort;
      const tur = gec.length * 3 >= dk.length ? "dikkat" : "bilgi";
      duzen.push(bulgu(tur, "Çalışmaya başlama saati",
        `Ödevlere genelde ${iki(Math.floor(ort / 60))}.${iki(ort % 60)} civarında başlıyor${gec.length ? `; oturumların ${gec.length} tanesi akşam 20.00'den sonra` : ""}.`,
        `${dk.length} evde çalışma oturumundan hesaplandı (en erken ${iki(Math.floor(dk[0] / 60))}.${iki(dk[0] % 60)}, en geç ${iki(Math.floor(dk[dk.length - 1] / 60))}.${iki(dk[dk.length - 1] % 60)}).`,
        gec.length ? "Geç saatlerde yarım kalma ve 'zorlandım' artıyorsa başlangıcı Ayarlar › Çalışma planı'ndan erkene çekin." : "",
        "akşam geç saatlerde çalışmaya başlaması"));
      const gecC = cal.filter(c => dt(c.zaman) && saatOf(dt(c.zaman)) >= 20), erkenC = cal.filter(c => dt(c.zaman) && saatOf(dt(c.zaman)) < 20);
      if (gecC.length >= 3 && erkenC.length >= 3) {
        const yGec = yuzde(gecC.filter(c => c.durum !== "bitti").length, gecC.length), yErken = yuzde(erkenC.filter(c => c.durum !== "bitti").length, erkenC.length);
        if (yGec >= yErken + 20) duzen.push(B({ tur: "dikkat", baslik: "Akşam geç saatte verim düşüyor",
          metin: `20.00'den sonraki çalışmaların %${ek(yGec, "si")} yarım kalmış ya da 'zorlandım' ile bitmiş; daha erken saatlerde bu oran %${yErken}.`,
          oneri: "Uzun ve zor ödevleri akşamın ilk saatine almak işe yarar; planlayıcı zaten teslimi yakını öne koyuyor." }));
      }
    }
    const gunSay = new Map();
    for (const c of cal) if (["bitti", "yarim", "zor"].includes(c.durum)) { const g = ilk(gunSay, haftaGunu(t(c.tarih)), [0, 0]); g[0] += 1; g[1] += c.durum !== "bitti" ? 1 : 0; }
    for (const [g, v] of gunSay) if (v[0] >= 3 && v[1] * 2 >= v[0]) duzen.push(B({ tur: "dikkat", baslik: `${GUN[g]} günleri`,
      metin: `${GUN[g]} günleri işlerin yarısından fazlası yarım kalıyor ya da zorlanıyor (${v[0]} işten ${ek(v[1], "si")}).`,
      kisa: `${GUN[g]} günleri işlerin yarım kalması`,
      oneri: "O gün okul ya da kurs yoğunsa Çalışma Masam'da 'Bugün vaktim farklı › Az' seçilebilir ya da o günün bütçesi düşürülebilir." }));
    if (duzen.length) bolumler.push({ baslik: "Çalışma düzeni", ikon: "🗓", maddeler: duzen });

    /* 2. Teslime göre zamanlama */
    const zaman = [];
    const biten = donemOdev.filter(o => o.bitti && o.bitti_zaman);
    const dersOnce = new Map();
    for (const o of biten) ilk(dersOnce, o.ders_id ?? null, []).push(gunFarki(t(o.teslim), t(o.bitti_zaman)));
    if (biten.length >= ESIK_ODEV) {
      const tum = [...dersOnce.values()].flat();
      const sonGun = tum.filter(f => f <= 1).length, gec = tum.filter(f => f < 0).length, ort = tum.reduce((s, f) => s + Math.max(f, 0), 0) / tum.length;
      olcut.son_gun = yuzde(sonGun, tum.length);
      const tur = (sonGun * 3 <= tum.length && !gec) ? "iyi" : (sonGun * 2 > tum.length || gec >= 2) ? "dikkat" : "bilgi";
      zaman.push(bulgu(tur, "Ödevleri ne zaman bitiriyor",
        `Ödevlerini teslimden ortalama ${f1(ort)} gün önce bitiriyor; ${tum.length} ödevin ${ek(sonGun, "si")} son güne (teslimden önceki akşam ya da teslim günü) kaldı${gec ? `, ${gec} ödev geç bitti` : ""}.`,
        `Bu dönemde biten ${tum.length} ödevin bitiş ve teslim tarihlerinden.`, "",
        tur === "iyi" ? "ödevlerin çoğunu teslimden önce bitiriyor" : "ödevlerin son güne kalması"));
      for (const [did, l] of sirala([...dersOnce.entries()], x => -x[1].length)) {
        if (l.length < ESIK_ODEV) continue;
        const sg = l.filter(f => f <= 1).length;
        if (sg * 3 >= l.length * 2) zaman.push(B({ tur: "dikkat", baslik: `${ad(dersler, did)} hep son güne kalıyor`,
          metin: `${ad(dersler, did)} ödevlerinin ${l.length} tanesinden ${ek(sg, "si")} teslimden önceki akşama ya da teslim gününe kaldı.`,
          kisa: `${ad(dersler, did)} ödevlerinin son güne kalması`,
          oneri: "Bu ders için ödev girerken 'En erken başlama' boş kalsın; planlayıcı işi günlere yayar. Kaçınma varsa aşağıdaki erteleme bulgusuna bakın." }));
        else if (l.every(f => f >= 2)) zaman.push(B({ tur: "iyi", baslik: `${ad(dersler, did)} ödevlerini erkenden bitiriyor`,
          metin: `${ad(dersler, did)} ödevlerinin hepsi en az iki gün önce bitti (${l.length} ödev).`, kisa: `${ad(dersler, did)} ödevlerini erken bitiriyor` }));
      }
    }
    const geciken = [...odevBy.values()].filter(o => !o.bitti && o.teslim && t(o.teslim) < enKucuk(bit, bugun) && t(o.teslim) >= bas);
    if (geciken.length) zaman.push(B({ tur: "dikkat", baslik: "Teslimi geçen ödevler",
      metin: `${geciken.length} ödevin teslim günü geçti ve hâlâ bitmiş görünmüyor: ${[...new Set(geciken.map(o => ad(dersler, o.ders_id)))].sort(pyStrCmp).join(", ")}.`,
      oneri: "Öğretmen kontrol etmediyse yapılsın; yapıldıysa Zaman Çizelgesi'nde işaretlenmeli (yoksa planlayıcı her gün öne koyar)." }));
    if (zaman.length) bolumler.push({ baslik: "Teslime göre zamanlama", ikon: "⏰", maddeler: zaman });

    /* 3. Plana uyum, erteleme, seçimler */
    const uyum = [];
    const planGun = Object.entries(gunler).filter(([d, v]) => icinde(d) && t(d) <= bugun && v.planlanan);
    if (planGun.length >= 3) {
      const yapilan = {};
      for (const c of cal) if (["bitti", "yarim"].includes(c.durum)) yapilan[c.tarih] = (yapilan[c.tarih] || 0) + parseInt(c.dk_plan || 0, 10);
      const toplamP = planGun.reduce((s, [, v]) => s + v.planlanan, 0);
      const toplamY = planGun.reduce((s, [d, v]) => s + Math.min(yapilan[d] || 0, v.planlanan), 0);
      const tam = planGun.filter(([d, v]) => (yapilan[d] || 0) >= v.planlanan * 0.9).length;
      const o = yuzde(toplamY, toplamP);
      olcut.plan_uyum = o;
      uyum.push(bulgu(o >= 85 ? "iyi" : o < 60 ? "dikkat" : "bilgi", "Plana uyum",
        `Planlanan işin %${ek(o, "sini")} yaptı; ${planGun.length} günün ${ek(tam, "sinde")} günün planını bitirdi.`,
        "Her günün plandaki işi ile o gün işaretlenen iş karşılaştırıldı (okulda yapılanlar dahil).",
        o >= 85 ? "" : "Plan sürekli yetişmiyorsa günlük bütçe gerçek temposuna göre fazla olabilir; Ayarlar'dan düşürmek planı daha inandırıcı yapar."));
    }
    const ertelenen = new Map(), planlananSay = new Map();
    for (const [d, v] of Object.entries(gunler)) {
      if (!icinde(d) || t(d) >= bugun) continue;
      const yapilanlar = new Set(cal.filter(c => c.tarih === d && ["bitti", "yarim"].includes(c.durum)).map(c => c.odev_id));
      for (const oid of v.plan_odevler || []) {
        const o = odevBy.get(oid);
        if (!o) continue;
        const did = o.ders_id ?? null;
        planlananSay.set(did, (planlananSay.get(did) || 0) + 1);
        if (!yapilanlar.has(oid) && !(o.bitti && String(o.bitti_zaman || "").slice(0, 10) === d)) ertelenen.set(did, (ertelenen.get(did) || 0) + 1);
      }
    }
    for (const [did, n] of sirala([...ertelenen.entries()], x => -x[1])) {
      const p = planlananSay.get(did) || 0;
      if (p >= 3 && n * 2 >= p) uyum.push(B({ tur: "dikkat", baslik: `${ad(dersler, did)} erteleniyor`,
        metin: `${ad(dersler, did)}, plana konduğu ${p} günün ${ek(n, "sinde")} yapılmadan ertesi güne kaydı. Bu ders kaçınılan ders olabilir.`,
        kisa: `${ad(dersler, did)} ödevlerini ertelemesi`,
        oneri: "Kaçınmanın nedeni çoğu zaman 'nereden başlayacağımı bilmiyorum'dur. İlk 10 dakikasını birlikte başlatmak ya da o dersi günün ilk işi yapmak işe yarar." }));
    }
    const sec = secimler.filter(s => icinde(s.tarih) && odevBy.has(s.odev_id));
    if (sec.length >= 3) {
      const sayac = new Map();
      for (const s of sec) { const did = odevBy.get(s.odev_id).ders_id ?? null; sayac.set(did, (sayac.get(did) || 0) + 1); }
      const en = sirala([...sayac.entries()], x => -x[1]).slice(0, 3);
      uyum.push(B({ tur: "bilgi", baslik: "Kendi seçtikleri",
        metin: `Planın dışından ${sec.length} kez kendisi ödev seçti; en çok ${en.map(([d, n]) => `${ad(dersler, d)} (${n})`).join(", ")}.`,
        oneri: "Severek seçtiği dersleri, ertelediği dersten sonra 'ödül' gibi sıraya koymak motivasyonu artırır." }));
    }
    if (uyum.length) bolumler.push({ baslik: "Plana uyum ve erteleme", ikon: "🧭", maddeler: uyum });

    /* 4. Süre */
    const sure = [];
    const dersSure = new Map();
    for (const c of cal) if (c.durum === "bitti" && (c.yer === undefined ? "ev" : c.yer) === "ev" && c.dk_plan && c.dk_gercek) {
      const x = ilk(dersSure, odevBy.get(c.odev_id).ders_id ?? null, [0, 0, 0]);
      x[0] += parseInt(c.dk_plan, 10); x[1] += parseInt(c.dk_gercek, 10); x[2] += 1;
    }
    for (const [did, [p, g, n]] of sirala([...dersSure.entries()], x => -(x[1][1] / Math.max(1, x[1][0])))) {
      if (n < ESIK_CALISMA) continue;
      const k = g / p;
      if (k >= 1.35) sure.push(B({ tur: "dikkat", baslik: `${ad(dersler, did)} beklenenden uzun sürüyor`,
        metin: `${ad(dersler, did)} ödevleri tahmin edilen sürenin yaklaşık ${f1(k)} katı sürüyor.`, kanit: `${n} oturum: tahmin toplam ${p} dk, gerçek ${g} dk.`,
        kisa: `${ad(dersler, did)} ödevlerinin uzun sürmesi`, oneri: "Ya ödev süreleri düşük giriliyor ya da bu derste takılıyor. Zorlanma bulgularıyla birlikte okuyun; planlayıcı bu dersin süresini ileride buna göre ayarlayabilir." }));
      else if (k <= 0.7) sure.push(bulgu("bilgi", `${ad(dersler, did)} hızlı bitiyor`,
        `${ad(dersler, did)} ödevleri tahminden kısa sürüyor (${f1(k)} katı). Ya kolay geliyor ya da hızlı geçiliyor; doğruluğu sınav ve mini oyun sonuçlarıyla karşılaştırın.`,
        `${n} oturum: tahmin ${p} dk, gerçek ${g} dk.`));
    }
    const oturum = cal.filter(c => c.dk_gercek && (c.yer === undefined ? "ev" : c.yer) === "ev").map(c => parseInt(c.dk_gercek, 10));
    if (oturum.length >= 5) {
      oturum.sort((a, b) => a - b);
      const orta = oturum[Math.floor(oturum.length / 2)];
      const uzunYarim = cal.filter(c => parseInt(c.dk_gercek || 0, 10) >= 40 && c.durum !== "bitti").length >= 2;
      sure.push(bulgu("bilgi", "Bir oturumda odak süresi",
        `Tek oturumda tipik olarak ${orta} dakika çalışıyor${uzunYarim ? "; uzun oturumlar (40 dk+) çoğunlukla yarım kalıyor" : ""}.`,
        `${oturum.length} oturumdan.`,
        Math.abs(orta - 25) >= 10 ? "Planlayıcının çalışma bloğu (Ayarlar › Çalışma planı) bu süreye yakın tutulursa mola önerileri daha yerinde olur." : ""));
    }
    if (sure.length) bolumler.push({ baslik: "Süre: tahmin ve gerçek", ikon: "⌛", maddeler: sure });

    /* 5. Zorlanma */
    const zor = [];
    const dersDur = new Map();
    for (const c of cal) {
      const did = odevBy.get(c.odev_id).ders_id ?? null;
      const x = ilk(dersDur, did, { n: 0, zor: 0, yarim: 0, sayfalar: [] });
      x.n += 1;
      if (c.durum === "zor") {
        x.zor += 1;
        const o = odevBy.get(c.odev_id);
        if (o.kaynaklar && o.kaynaklar.length) x.sayfalar.push(o.kaynaklar.map(k => `${k.ad === undefined ? "" : k.ad} ${k.sayfa ? "s. " + k.sayfa : ""}`).join(", ").trim());
      } else if (c.durum === "yarim") x.yarim += 1;
    }
    for (const [did, x] of sirala([...dersDur.entries()], kv => -(kv[1].zor * 2 + kv[1].yarim))) {
      if (x.n < ESIK_CALISMA) continue;
      if (x.zor >= 2 || (x.zor + x.yarim) * 3 >= x.n) zor.push(B({ tur: "dikkat", baslik: `${ad(dersler, did)} ödevlerinde zorlanıyor`,
        metin: `${ad(dersler, did)} çalışmalarının ${x.zor} tanesinde 'zorlandım' dedi, ${x.yarim} tanesi yarım kaldı (toplam ${x.n} çalışma).`,
        kisa: `${ad(dersler, did)} ödevlerinde zorlanması`, kanit: x.sayfalar.length ? "Zorlandığı yerler: " + [...new Set(x.sayfalar)].join("; ") : "",
        oneri: "Bu sayfalardaki konuya öğretmenle birlikte bakmak ya da konunun mini oyununu oynatmak iyi olur (bkz. Konu durumu)." }));
    }
    if (cal.length) olcut.zor_oran = yuzde(cal.filter(c => ["zor", "yarim"].includes(c.durum)).length, cal.length);
    const temalar = new Map();
    for (const c of cal) {
      const n = String(c.not || "").toLowerCase();
      for (const [kod, kelimeler, tad] of NOT_TEMALARI) {
        if (n && kelimeler.some(k => n.includes(k))) {
          const x = ilk(temalar, kod, { ad: tad, n: 0, ornek: [] });
          x.n += 1;
          if (x.ornek.length < 2) x.ornek.push(`“${[...c.not.trim()].slice(0, 60).join("")}”`);
          break;
        }
      }
    }
    if (temalar.size) {
      const sirali = sirala([...temalar.values()], x => -x.n);
      const ONERI = { yorgunluk: "Yorgunluk öne çıkıyorsa çalışma başlangıcını erkene almak ya da araya kısa mola koymak.",
        anlamadim: "Konuyu anlamama öne çıkıyorsa ilgili derste öğretmenle görüşmek; ödev öncesi kısa konu tekrarı.",
        malzeme: "Malzeme eksikliği öne çıkıyorsa Ana Sayfa'daki 'Bugünün dersleri' ile akşam çanta kontrolü.",
        zaman: "Başka etkinlikler çakışıyorsa o günler için 'Bugün vaktim farklı' kullanılabilir.",
        isteksiz: "İsteksizlik öne çıkıyorsa kısa başlangıç (10 dk) ve sevdiği dersle bitirme sırası denenebilir." };
      const enKod = [...temalar.entries()].find(([, v]) => v === sirali[0])[0];
      zor.push(bulgu("bilgi", "Yarım bırakırken yazdığı nedenler",
        `Notlarında en sık geçen neden: ${sirali.map(x => `${x.ad} (${x.n})`).join(", ")}.`,
        "Örnekler: " + sirali.flatMap(x => x.ornek).join(" "), ONERI[enKod]));
    }
    if (zor.length) bolumler.push({ baslik: "Zorlanma ve yarım bırakma", ikon: "😕", maddeler: zor });

    /* 6. Nerede */
    const yer = new Map();
    for (const c of cal) if (c.durum === "bitti") { const y = c.yer === undefined ? "ev" : c.yer; yer.set(y, (yer.get(y) || 0) + 1); }
    const disari = (yer.get("okul") || 0) + (yer.get("bekleme") || 0);
    if (disari >= 2) bolumler.push({ baslik: "Boş vakitleri değerlendirme", ikon: "🏫", maddeler: [bulgu("iyi", "Okulda / beklerken",
      `${disari} iş okulda boş vakitte ya da çıkışta beklerken yapılmış (bitirilen işlerin %${ek(yuzde(disari, [...yer.values()].reduce((a, b) => a + b, 0)), "si")}). Zamanını iyi kullanıyor.`)] });

    /* 7. Gün sonu */
    let deg = Object.entries(gunler).filter(([d, v]) => icinde(d) && v.degerlendirme).map(([, v]) => v.degerlendirme);
    deg = deg.map(x => (x && typeof x === "object" && !Array.isArray(x)) ? (x.deger === undefined ? null : x.deger) : x);
    if (deg.length >= 3) {
      const s = { kolay: 0, iyi: 0, zor: 0 }; for (const k of Object.keys(s)) s[k] = deg.filter(x => x === k).length;
      bolumler.push({ baslik: "Kendi değerlendirmesi", ikon: "💬", maddeler: [B({ tur: s.zor * 2 >= deg.length ? "dikkat" : "bilgi", baslik: "Gün sonu",
        metin: `Gün sonunda ${s.kolay} kez 'kolaydı', ${s.iyi} kez 'iyiydi', ${s.zor} kez 'zordu' dedi.`,
        oneri: s.zor ? "'Zordu' dediği günlerin planına bakmak (yük, ders) neyin ağır geldiğini gösterir." : "" })] });
    }

    /* 8. Konu durumu */
    const konu = [];
    for (const b of ((gelisim || {}).destek || []).slice(0, 6)) konu.push(bulgu("dikkat", `${b.ders || ""} — ${b.beceri || ""}`, `Bu konuda doğruluk %${b.oran}.`,
      `${b.deneme} deneme${b.konu ? ", ünite " + b.konu : ""}.`, b.etkinlik ? `Önerilen etkinlik: ${b.etkinlik}.` : "Bu konuyu haftada birkaç kez kısa tekrar.",
      `${b.beceri || ""} konusu (${b.ders || ""})`));
    for (const b of ((gelisim || {}).guclu || []).slice(0, 4)) konu.push(bulgu("iyi", `${b.ders || ""} — ${b.beceri || ""}`, `Bu konuda güçlü: %${b.oran} doğru.`, `${b.deneme} deneme.`));
    const sin = sirala(sinavlar.filter(s => icinde(s.tarih) && typeof s.puan === "number"), s => s.puan);
    for (const s of sin) {
      const tur = s.puan >= 85 ? "iyi" : s.puan < 70 ? "dikkat" : "bilgi", p = Math.trunc(s.puan);
      konu.push(B({ tur, baslik: `${ad(dersler, s.ders_id)} sınavı: ${p}`, kisa: `${ad(dersler, s.ders_id)} sınavı (${p})`,
        metin: s.aciklama ? "Konular: " + [...s.aciklama.trim()].slice(0, 160).join("") : "", oneri: s.puan < 70 ? "Bu sınavın konuları mini oyunlarda tekrar edilebilir." : "" }));
    }
    if (konu.length) bolumler.push({ baslik: "Konu durumu", ikon: "🎯", maddeler: konu });

    for (const [did, dad] of Object.entries(dersler)) {
      const nOdev = donemOdev.filter(o => o.ders_id === did).length, nCal = cal.filter(c => odevBy.get(c.odev_id).ders_id === did).length;
      if (0 < nOdev + nCal && nOdev < ESIK_ODEV && nCal < ESIK_CALISMA) yetersiz.push(dad);
    }

    const oncelik = { "Konu durumu": 0, "Zorlanma ve yarım bırakma": 1, "Plana uyum ve erteleme": 2, "Teslime göre zamanlama": 3, "Süre: tahmin ve gerçek": 4 };
    const dikkat = sirala(bolumler, b => (b.baslik in oncelik ? oncelik[b.baslik] : 9)).flatMap(b => b.maddeler).filter(m => m.tur === "dikkat");
    const iyi = bolumler.flatMap(b => b.maddeler).filter(m => m.tur === "iyi");
    const toplamDk = cal.reduce((s, c) => s + parseInt(c.dk_gercek || 0, 10), 0);
    const bittiOdev = donemOdev.filter(o => o.bitti).length;
    const ozet = [`${ogrAd} bu dönemde ${donemOdev.length} ödevden ${ek(bittiOdev, "sini")} bitirdi; kayıtlı çalışma süresi yaklaşık ${Math.floor(toplamDk / 60)} saat ${toplamDk % 60} dakika.`];
    if (iyi.length) ozet.push("Güçlü yanları: " + iyi.slice(0, 3).map(m => m.kisa).join("; ") + ".");
    if (dikkat.length) ozet.push("Dikkat isteyenler: " + dikkat.slice(0, 4).map(m => m.kisa).join("; ") + ".");
    return { bas, bit, olusturma: simdi || new Date().toISOString().slice(0, 19),
      ozet, bolumler, yetersiz: yetersiz.sort(pyStrCmp), olcutler: Object.assign({}, olcut, { calisma_dk: toplamDk, biten: bittiOdev }),
      sayilar: { odev: donemOdev.length, biten: bittiOdev, calisma_dk: toplamDk, dikkat: dikkat.length, iyi: iyi.length } };
  }
  /* Python sorted() metin sıralaması: kod noktası sırası */
  function pyStrCmp(a, b) { const x = [...a].map(c => c.codePointAt(0)), y = [...b].map(c => c.codePointAt(0)); for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i]; return x.length - y.length; }

  const KIYAS = [["plan_uyum", "plana uyum", true, 8], ["duzen", "düzenli çalışma", true, 10], ["son_gun", "son güne kalan ödevler", false, 10],
    ["zor_oran", "zorlanma / yarım kalma", false, 8], ["baslangic", "çalışmaya başlama saati", false, 20]];
  function karsilastir(simdi, onceki) {
    const sonuc = [], a = (simdi || {}).olcutler || {}, b = (onceki || {}).olcutler || {};
    if (!b.calisma_dk || !a.calisma_dk) return sonuc;
    for (const [k, kad, artisIyi, esik] of KIYAS) {
      if (k in a && k in b && Math.abs(a[k] - b[k]) >= esik) {
        const artti = a[k] > b[k];
        const metin = k === "baslangic" ? `${kad} ${Math.trunc(Math.abs(a[k] - b[k]))} dk ${artti ? "geç" : "erken"}` : `${kad} ${artti ? "arttı" : "azaldı"} (%${Math.trunc(b[k])} → %${Math.trunc(a[k])})`;
        sonuc.push({ yon: artti === artisIyi ? "iyi" : "kotu", metin });
      }
    }
    return sonuc;
  }
  return { raporHazirla, karsilastir, ek, okulGunleri, pyStrCmp };
})();
if (typeof module !== "undefined") module.exports = Rapor;

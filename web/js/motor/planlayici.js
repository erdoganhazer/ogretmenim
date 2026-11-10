/* ÖğretmeniM web — çalışma planlayıcısı. planlayici.py'nin (0.17–0.27) birebir JavaScript karşılığı.
   Saf fonksiyonlar: tarih "YYYY-AA-GG" metni olarak taşınır. Davranış Python sürümüyle karşılaştırmalı testle doğrulanır
   (test/planlayici_karsilastir.js). */
"use strict";

const Planlayici = (() => {
  const VARSAYILAN_AYARLAR = {
    butce: { 0: 60, 1: 75, 2: 75, 3: 75, 4: 75, 5: 75, 6: 60 },
    baslangic_tur: "okul", ara_dk: 60, sabit_saat: "16:30", hafta_sonu_saat: "11:00", en_gec: "21:00",
    tampon_gun: 1, blok_dk: 25, mola_dk: 5, arin_sira: true,
    sabitler: [{ id: "okuma", ad: "Kitap okuma", dk: 20, gunler: [0, 1, 2, 3, 4, 5, 6] }],
  };
  const UFAK_DK = 8, TASMA_DK = 10, UFUK_GUN = 21, BUYUK_ODEV_DK = 40;
  const GUN_ADI = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  const SAAT_DESENI = /^([01]\d|2[0-3]):[0-5]\d$/;

  /* ---------- Python uyumlu yardımcılar ---------- */
  const pyRound = x => { const f = Math.floor(x), d = x - f; if (d > 0.5) return f + 1; if (d < 0.5) return f; return f % 2 === 0 ? f : f + 1; };
  /* CPython float_floor_div: 10 // 3.3333333333333335 == 2.0 (Math.floor(10/3.33…) ise 3 verir) */
  const pyFloorDiv = (a, b) => {
    let mod = a % b, div = (a - mod) / b;
    if (mod) { if ((b < 0) !== (mod < 0)) { mod += b; div -= 1.0; } }
    let f;
    if (div) { f = Math.floor(div); if (div - f > 0.5) f += 1.0; } else f = 0;
    return f;
  };
  const tamsayiMi = v => typeof v === "number" && Number.isInteger(v);
  const tarihNesne = s => { const [y, a, g] = String(s).split("-").map(Number); if (!y || !a || !g) throw new Error("tarih"); const d = new Date(Date.UTC(y, a - 1, g)); if (d.getUTCMonth() !== a - 1) throw new Error("tarih"); return d; };
  const iso = d => d.toISOString().slice(0, 10);
  const tarih = s => { const d = tarihNesne(s); return iso(d); };              // doğrulayıp normalize eder
  const gunEkle = (s, n) => { const d = tarihNesne(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  const gunFarki = (a, b) => Math.round((tarihNesne(a) - tarihNesne(b)) / 86400000);
  const jsGun = s => tarihNesne(s).getUTCDay();
  const enBuyuk = l => l.reduce((m, x) => (x > m ? x : m));
  const enKucuk = (a, b) => (a < b ? a : b);
  const kopya = v => JSON.parse(JSON.stringify(v));

  /* ---------- Sayfa / soru metni ---------- */
  const ADET = /(\d+)\s+(soru|etkinlik|test|kitap|sayfa|yaprak|metin|çalışma kağıdı|çalışma kâğıdı|çalışma|okuma|ünite)(?![a-zçğıöşü])/g;
  const DAHIL = /\(?\s*\d+\s*dahil\s*\)?/g;
  const ARALIK = /(\d+)\s*(?:-|–|—|ile)\s*(\d+)/g;
  const SAYI = /\d+/g;
  const kucuk = m => String(m == null ? "" : m).replace(/I/g, "ı").replace(/İ/g, "i").toLowerCase();

  function sayfaCoz(metin) {
    let m = kucuk(metin);
    const adet = {};
    m = m.replace(ADET, (_, n, ad) => { ad = ad.startsWith("çalışma") ? "çalışma kâğıdı" : ad; adet[ad] = (adet[ad] || 0) + parseInt(n, 10); return " "; });
    m = m.replace(DAHIL, " ");
    const sayfalar = new Set();
    m = m.replace(ARALIK, (_, x, y) => { let a = parseInt(x, 10), b = parseInt(y, 10); if (a > b) [a, b] = [b, a]; if (b - a <= 300) for (let i = a; i <= b; i++) sayfalar.add(i); return " "; });
    for (const s of m.match(SAYI) || []) { const n = parseInt(s, 10); if (n > 0 && n < 2000) sayfalar.add(n); }
    const sonuc = { sayfalar: [...sayfalar].sort((a, b) => a - b).slice(0, 400), adet };
    if (!sonuc.sayfalar.length) {
      for (const ad of ["sayfa", "kitap", "çalışma kâğıdı", "test", "yaprak", "metin", "okuma", "ünite"]) {
        if (adet[ad]) { sonuc.birim_adi = ad; sonuc.birim_sayisi = Math.min(adet[ad], 60); break; }
      }
    }
    return sonuc;
  }

  function birimler(kaynaklar) {
    const liste = [];
    (kaynaklar || []).forEach((k, i) => {
      const c = sayfaCoz(k.sayfa == null ? "" : k.sayfa);
      if (c.sayfalar.length) c.sayfalar.forEach(s => liste.push({ k: i, tur: "sayfa", no: s }));
      else if (c.birim_sayisi) for (let n = 0; n < c.birim_sayisi; n++) liste.push({ k: i, tur: "adet", no: n + 1, ad: c.birim_adi });
      else liste.push({ k: i, tur: "tum" });
    });
    return liste.length ? liste : [{ k: -1, tur: "tum" }];
  }

  function araliklar(sayilar) {
    const sonuc = []; let bas = null, onceki = null;
    for (const s of sayilar) {
      if (bas === null) { bas = onceki = s; } else if (s === onceki + 1) { onceki = s; } else { sonuc.push([bas, onceki]); bas = onceki = s; }
    }
    if (bas !== null) sonuc.push([bas, onceki]);
    return sonuc.map(([a, b]) => (a === b ? String(a) : `${a}–${b}`)).join(", ");
  }

  function parcaMetni(kaynaklar, bl, bas, bit) {
    kaynaklar = kaynaklar || [];
    const parcalar = [], secilen = bl.slice(bas, bit), tumBolum = bas === 0 && bit >= bl.length;
    for (const k of [...new Set(secilen.map(b => b.k))].sort((a, b) => a - b)) {
      const ad = ((k >= 0 && k < kaynaklar.length) ? kaynaklar[k].ad : "") || "";
      const bunlar = secilen.filter(b => b.k === k), tur = bunlar[0].tur;
      if (tur === "sayfa") parcalar.push(`${ad} s. ${araliklar(bunlar.map(b => b.no))}`.trim());
      else if (tur === "adet") {
        const toplam = bl.filter(b => b.k === k).length;
        parcalar.push((bunlar.length === toplam ? `${ad} (${toplam} ${bunlar[0].ad})` : `${ad} ${araliklar(bunlar.map(b => b.no))}. ${bunlar[0].ad}`).trim());
      } else {
        const ham = ((k >= 0 && k < kaynaklar.length) ? kaynaklar[k].sayfa : "") || "";
        parcalar.push((ad + (ham && tumBolum ? " — " + ham : "")).trim() || "Ödevin tamamı");
      }
    }
    return parcalar.filter(Boolean).join(" · ") || "Ödevin tamamı";
  }

  /* ---------- Yardımcılar ---------- */
  const dk = s => { const [h, m] = String(s).split(":"); return parseInt(h, 10) * 60 + parseInt(m, 10); };
  const saat = d => { d = Math.max(0, Math.min(pyRound(d), 24 * 60 - 1)); return `${String(Math.floor(d / 60)).padStart(2, "0")}:${String(d % 60).padStart(2, "0")}`; };

  function ayarlariTamamla(ayarlar) {
    const a = kopya(VARSAYILAN_AYARLAR);
    for (const [k, v] of Object.entries(ayarlar || {})) if (k in a) a[k] = v;
    for (const g of "0123456") if (!(g in a.butce)) a.butce[g] = VARSAYILAN_AYARLAR.butce[g];
    return a;
  }

  function okulBitisi(program, d) {
    const g = jsGun(d);
    if (g === 0) return null;
    let son = null;
    (program.saatler || []).forEach((s, i) => { if ((program.hucreler || {})[`${g}-${i}`]) son = s.bit; });
    return son === undefined ? null : son;
  }

  function gunPenceresi(d, ayar, program, ozel, etkinlikler) {
    const okul = okulBitisi(program, d);
    ozel = ozel || {};
    let bas;
    if (ozel.baslangic && SAAT_DESENI.test(ozel.baslangic)) bas = dk(ozel.baslangic);
    else if (okul && ayar.baslangic_tur === "okul") bas = dk(okul) + parseInt(ayar.ara_dk, 10);
    else if (okul) bas = Math.max(dk(ayar.sabit_saat), dk(okul));
    else bas = dk(ayar.hafta_sonu_saat);
    const bitis = dk(ayar.en_gec);
    const olaylar = [];
    for (const e of etkinlikler) {
      if (e.tarih === d && e.bas && e.bit && SAAT_DESENI.test(e.bas) && SAAT_DESENI.test(e.bit)) {
        const a = dk(e.bas), b = dk(e.bit);
        if (b > bas && a < bitis) olaylar.push([Math.max(a, bas), Math.min(b, bitis), e]);
      }
    }
    const b = ayar.butce[String(jsGun(d))];
    const butce = tamsayiMi(ozel.dk) ? ozel.dk : parseInt(b === undefined ? 60 : b, 10);
    olaylar.sort((x, y) => x[0] - y[0]);
    return { bas, bitis, olaylar, butce, okul };
  }

  function bosSure(p, bas) {
    let toplam = Math.max(0, p.bitis - bas);
    for (const [a0, b] of p.olaylar) { const a = Math.max(a0, bas); if (b > a) toplam -= (b - a); }
    return Math.max(0, toplam);
  }

  /* ---------- Plan ---------- */
  function odevGorevi(o, calisma, bugun) {
    const kaynaklar = o.kaynaklar || [], bl = birimler(kaynaklar), n = bl.length;
    let sure = o.sure;
    const tahmin = !tamsayiMi(sure) || sure <= 0;
    if (tahmin) { const sayfa = bl.filter(b => b.tur === "sayfa").length; sure = sayfa ? Math.max(15, sayfa * 6) : 20; }
    const girdiler = calisma.filter(c => c.odev_id === o.id);
    let ilerleme = 0;
    for (const c of girdiler) ilerleme = Math.max(ilerleme, parseInt(c.birim_bit || 0, 10));
    ilerleme = Math.min(ilerleme, n);
    const teslim = tarih(o.teslim), son = gunEkle(teslim, -1), enErken = o.en_erken ? tarih(o.en_erken) : null;
    return { odev: o, id: o.id, bl, n, sure, tahmin, birim_dk: sure / n, p: ilerleme, teslim, son, en_erken: enErken, yay: !!o.yay,
      bugun_yarim: girdiler.some(c => c.tarih === bugun && c.durum === "yarim"), atamalar: [] };
  }

  function planHesapla(odevler, program, etkinlikler, ayarlar, ozelGunler, calisma, sira, bugun, simdiDk, dersler = null, secili = null) {
    const ayar = ayarlariTamamla(ayarlar);
    const tampon = Math.max(0, parseInt(ayar.tampon_gun === undefined ? 1 : ayar.tampon_gun, 10));
    ozelGunler = ozelGunler || {}; calisma = calisma || [];
    const gorevler = [];
    for (const o of odevler) {
      if (o.silindi || o.bitti || !o.teslim) continue;
      let g;
      try { g = odevGorevi(o, calisma, bugun); } catch (_) { continue; }
      if (g.p >= g.n) continue;
      g.hedef = enBuyuk([bugun, gunEkle(g.son, -tampon)]);
      gorevler.push(g);
    }
    const son = enBuyuk(gorevler.map(g => g.son).concat([gunEkle(bugun, 6)]));
    const ufuk = enKucuk(son, gunEkle(bugun, UFUK_GUN));
    const gunler = [];
    const bugunYapilan = calisma.filter(c => c.tarih === bugun);
    for (let d = bugun; d <= ufuk; d = gunEkle(d, 1)) {
      const ozel = ozelGunler[d];
      const pen = gunPenceresi(d, ayar, program, ozel, etkinlikler);
      let bas = pen.bas;
      if (d === bugun) bas = Math.max(bas, Math.ceil(simdiDk / 5.0) * 5);
      const bos = bosSure(pen, bas);
      let kap = Math.max(0, Math.min(pen.butce, bos));
      if (d === bugun) kap = Math.max(0, kap - bugunYapilan.reduce((t, c) => t + parseInt(c.dk_plan || 0, 10), 0));
      gunler.push({ tarih: d, pencere: pen, bas, kapasite: kap, kalan: kap, atamalar: [] });
    }
    const zorunlu = (g, d) => d >= g.son;

    for (const gun of gunler) {
      const d = gun.tarih;
      if (d === bugun && secili) {
        const g = gorevler.find(x => x.id === secili && x.p < x.n && !x.bugun_yarim);
        if (g) {
          const al = g.n - g.p;
          const atama = { g, bas: g.p, bit: g.n, dk: pyRound(al * g.birim_dk), zorunlu: zorunlu(g, d), secim: true };
          g.p = g.n; gun.kalan -= atama.dk; gun.atamalar.push(atama); g.atamalar.push([d, atama]);
        }
      }
      let doldur = gun.kalan;
      const bekleyen = gorevler.filter(g => g.p < g.n).map(g => [enBuyuk([g.son, d]), (g.n - g.p) * g.birim_dk]);
      if (bekleyen.length) {
        let oran = 0.0;
        for (const D of [...new Set(bekleyen.map(x => x[0]))].sort()) {
          const gunSay = gunler.filter(x => d <= x.tarih && x.tarih <= D && x.kapasite > 0).length || 1;
          oran = Math.max(oran, bekleyen.filter(([h]) => h <= D).reduce((t, [, w]) => t + w, 0) / gunSay);
        }
        doldur = Math.min(gun.kalan, Math.ceil(oran / 5.0) * 5);
      }
      gun.hedef_dk = doldur;
      const adaylar = gorevler.filter(g => g.p < g.n && (zorunlu(g, d) || !g.en_erken || g.en_erken <= d) && !(d === bugun && g.bugun_yarim && !zorunlu(g, d)));
      const anahtar = g => [zorunlu(g, d) ? 0 : 1, g.hedef, g.son, -(g.n - g.p) * g.birim_dk];
      adaylar.sort((x, y) => { const a = anahtar(x), b = anahtar(y); for (let i = 0; i < 4; i++) { if (a[i] < b[i]) return -1; if (a[i] > b[i]) return 1; } return 0; });
      for (const g of adaylar) {
        const kalanBirim = g.n - g.p;
        if (kalanBirim <= 0) continue;
        const per = g.birim_dk;
        let al;
        if (zorunlu(g, d)) al = kalanBirim;
        else {
          if (gun.kalan <= 0 || doldur <= 0) continue;
          let kota = kalanBirim;
          if (g.yay || kalanBirim * per > BUYUK_ODEV_DK) {
            const sinir = enBuyuk([g.hedef, d]);
            const uygun = gunler.filter(x => d <= x.tarih && x.tarih <= sinir && x.kapasite > 0 && (!g.en_erken || g.en_erken <= x.tarih));
            kota = Math.ceil(kalanBirim / Math.max(1, uygun.length));
          }
          const sinir = Math.min(gun.kalan, doldur);
          if (kalanBirim * per <= sinir + TASMA_DK) al = kalanBirim;
          else if (g.n === 1) continue;
          else {
            al = pyFloorDiv(sinir, per);
            if (al <= 0 || al * per < Math.min(UFAK_DK, kalanBirim * per)) continue;
            if ((kalanBirim - al) * per < UFAK_DK && (kalanBirim * per) - sinir <= TASMA_DK) al = kalanBirim;
          }
          al = Math.min(al, kota);
          if (al <= 0) continue;
        }
        const atama = { g, bas: g.p, bit: g.p + al, dk: pyRound(al * per), zorunlu: zorunlu(g, d) };
        g.p += al; gun.kalan -= atama.dk; doldur -= atama.dk;
        gun.atamalar.push(atama); g.atamalar.push([d, atama]);
      }
    }
    for (const g of gorevler) g.atamalar.forEach(([, a], i) => { a.parca_no = i + 1; a.parca_sayisi = g.atamalar.length; });

    for (const gun of gunler) {
      const d = gun.tarih;
      for (const a of gun.atamalar) {
        const g = a.g; let kod;
        if (a.secim) kod = "secim";
        else if (g.teslim < d) kod = "gecikti";
        else if (g.teslim === d) kod = "bugun_teslim";
        else if (d === g.son) kod = "son_gun";
        else if (g.yay && a.parca_sayisi > 1) kod = "yay";
        else if (a.parca_sayisi > 1) kod = "parca";
        else if (d >= g.hedef) kod = "tampon";
        else {
          const sonraki = gunler.filter(x => d < x.tarih && x.tarih <= g.son).reduce((t, x) => t + x.kapasite, 0);
          const yuk = gunler.filter(x => d < x.tarih && x.tarih <= g.son).reduce((t, x) => t + x.atamalar.reduce((u, b) => u + b.dk, 0), 0);
          kod = yuk + a.dk > sonraki ? "yogun" : "erken";
        }
        a.gerekce = kod;
      }
    }

    for (const gun of gunler) {
      const liste = gun.atamalar.slice().sort((x, y) => {
        const a = [x.zorunlu ? 0 : 1, x.g.son, x.g.hedef], b = [y.zorunlu ? 0 : 1, y.g.son, y.g.hedef];
        for (let i = 0; i < 3; i++) { if (a[i] < b[i]) return -1; if (a[i] > b[i]) return 1; } return 0;
      });
      const sirali = [], kalanlar = liste.slice();
      while (kalanlar.length) {
        const onceki = sirali.length ? sirali[sirali.length - 1].g.odev.ders_id : null;
        let sec = kalanlar.find(a => a.g.odev.ders_id !== onceki || a.zorunlu) || kalanlar[0];
        if (sec !== kalanlar[0] && kalanlar[0].zorunlu) sec = kalanlar[0];
        sirali.push(sec); kalanlar.splice(kalanlar.indexOf(sec), 1);
      }
      const ozelSira = (sira || {})[gun.tarih];
      if (ozelSira && ozelSira.length) {
        const yer = new Map(ozelSira.map((oid, i) => [oid, i]));
        const once = new Map(sirali.map((a, i) => [a, i]));
        sirali.sort((a, b) => (yer.has(a.g.id) ? yer.get(a.g.id) : 1000 + once.get(a)) - (yer.has(b.g.id) ? yer.get(b.g.id) : 1000 + once.get(b)));
        gun.ozel_sira = true;
      }
      sirali.sort((a, b) => (a.secim ? 0 : 1) - (b.secim ? 0 : 1));
      gun.atamalar = sirali;
    }

    const blok = Math.max(10, parseInt(ayar.blok_dk, 10)), mola = Math.max(0, parseInt(ayar.mola_dk, 10));
    for (const gun of gunler) {
      let t = gun.bas;
      const olaylar = gun.pencere.olaylar;
      const atla = (t, uz) => { for (const [a, b] of olaylar) if (t < b && t + uz > a) t = b; return t; };
      gun.atamalar.forEach((a, i) => {
        let kalan = a.dk;
        a.bloklar = [];
        while (kalan > 0) {
          let uz = Math.min(blok, kalan);
          if (kalan - uz > 0 && kalan - uz < 6) uz = kalan;
          t = atla(t, uz);
          a.bloklar.push({ bas: saat(t), bit: saat(t + uz), dk: uz });
          t += uz; kalan -= uz;
          const sonBlok = kalan <= 0 && i === gun.atamalar.length - 1;
          if (!sonBlok) t += mola;
        }
        a.saat_bas = a.bloklar.length ? a.bloklar[0].bas : saat(t);
        a.saat_bit = a.bloklar.length ? a.bloklar[a.bloklar.length - 1].bit : saat(t);
      });
    }

    const uyarilar = [];
    for (const g of gorevler) {
      if (g.p < g.n && g.son <= ufuk) uyarilar.push({ tur: "planlanamadi", odev_id: g.id, dk: pyRound((g.n - g.p) * g.birim_dk) });
      if (g.teslim < bugun) uyarilar.push({ tur: "gecikti", odev_id: g.id, teslim: g.teslim });
    }
    const ciktiGunler = [];
    for (const gun of gunler) {
      const d = gun.tarih, toplam = gun.atamalar.reduce((t, a) => t + a.dk, 0), asim = Math.max(0, toplam - gun.kapasite);
      if (asim >= 10) uyarilar.push({ tur: "yogun_gun", tarih: d, dk: asim });
      const sabitler = (ayar.sabitler || []).filter(s => (s.gunler || []).includes(jsGun(d))).map(s => ({ id: s.id ?? null, ad: s.ad ?? null, dk: s.dk ?? null }));
      const ozel = ozelGunler[d];
      ciktiGunler.push({
        tarih: d, gun: GUN_ADI[jsGun(d)], baslangic: saat(gun.bas), okul_bitis: gun.pencere.okul, butce: gun.pencere.butce, kapasite: gun.kapasite,
        toplam_dk: toplam, asim, ozel: (ozel && Object.keys(ozel).length) ? ozel : null, ozel_sira: !!gun.ozel_sira,
        etkinlikler: gun.pencere.olaylar.map(([, , e]) => ({ id: e.id ?? null, baslik: e.baslik || "", tur: e.tur ?? null, bas: e.bas ?? null, bit: e.bit ?? null })),
        sabitler,
        gorevler: gun.atamalar.map(a => ({
          odev_id: a.g.id, ders_id: a.g.odev.ders_id ?? null, baslik: a.g.odev.baslik || "",
          parca: (a.g.odev.kaynaklar && a.g.odev.kaynaklar.length) ? parcaMetni(a.g.odev.kaynaklar, a.g.bl, a.bas, a.bit) : (a.g.odev.baslik || "Ödevin tamamı"),
          birim_bas: a.bas, birim_bit: a.bit, birim_toplam: a.g.n,
          birimler: a.g.bl.slice(a.bas, a.bit).map(b => birimEtiket(a.g.odev.kaynaklar || [], b)),
          dk: a.dk, tahmini: a.g.tahmin, teslim: a.g.teslim, son_gun: a.g.son, zorunlu: a.zorunlu, gerekce: a.gerekce, secim: !!a.secim,
          parca_no: a.parca_no, parca_sayisi: a.parca_sayisi, saat_bas: a.saat_bas, saat_bit: a.saat_bit, bloklar: a.bloklar,
        })),
      });
    }
    let oneri = []; const gorulen = new Set();
    for (const gun of ciktiGunler.slice(0, 2)) for (const t of gun.gorevler) {
      if (t.dk <= 20 && !t.secim && !gorulen.has(t.odev_id)) {
        gorulen.add(t.odev_id);
        const o = {}; for (const k of ["odev_id", "ders_id", "parca", "teslim", "birim_bas", "birim_bit", "birim_toplam", "birimler", "dk"]) o[k] = t[k];
        oneri.push(o);
      }
    }
    oneri.sort((a, b) => (a.teslim < b.teslim ? -1 : a.teslim > b.teslim ? 1 : 0));
    return { bugun, gunler: ciktiGunler, uyarilar, ayarlar: ayar, okul_onerisi: oneri.slice(0, 3), canta: cantaHazirla(odevler, program, etkinlikler, bugun, simdiDk, ayar, dersler) };
  }

  function birimEtiket(kaynaklar, b) {
    const ad = ((b.k >= 0 && b.k < kaynaklar.length) ? kaynaklar[b.k].ad : "") || "";
    if (b.tur === "sayfa") return `${ad} s. ${b.no}`.trim();
    if (b.tur === "adet") return `${ad} ${b.no}. ${b.ad}`.trim();
    return ad || "Ödevin tamamı";
  }

  function cantaHazirla(odevler, program, etkinlikler, bugun, simdiDk) {
    const bitis = okulBitisi(program, bugun);
    let d = (bitis && simdiDk < dk(bitis)) ? bugun : gunEkle(bugun, 1);
    let bulundu = false;
    for (let i = 0; i < 7; i++) { if (okulBitisi(program, d)) { bulundu = true; break; } d = gunEkle(d, 1); }
    if (!bulundu) return null;
    const g = jsGun(d), sira = [];
    (program.saatler || []).forEach((_, i) => { const ders = (program.hucreler || {})[`${g}-${i}`]; if (ders && !sira.includes(ders)) sira.push(ders); });
    const teslim = odevler.filter(o => !o.silindi && o.teslim === d).map(o => ({ odev_id: o.id, ders_id: o.ders_id ?? null, baslik: o.baslik || "",
      kaynaklar: (o.kaynaklar || []).filter(k => k.ad).map(k => k.ad) }));
    const sinavlar = etkinlikler.filter(e => !e.silindi && e.tur === "sinav" && e.tarih === d).map(e => ({ id: e.id ?? null, ders_id: e.ders_id ?? null }));
    return { tarih: d, gun: GUN_ADI[g], bugun: d === bugun, dersler: sira, teslim, sinavlar };
  }

  return { VARSAYILAN_AYARLAR, GUN_ADI, sayfaCoz, birimler, parcaMetni, araliklar, ayarlariTamamla, okulBitisi, planHesapla, cantaHazirla,
    dk, saat, pyRound, pyFloorDiv, gunEkle, gunFarki, jsGun, tarih, tamsayiMi };
})();
if (typeof module !== "undefined") module.exports = Planlayici;

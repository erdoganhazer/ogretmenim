/* ÖğretmeniM web — motor çekirdeği. motor.py'deki veri kuralları, plan işlemleri, özetler ve /api yönlendiricisinin
   tarayıcıdaki birebir karşılığı. Veri tek bir nesnede durur (motor.py'nin _veri'si + alistirmalar + gunluk);
   kalıcı yazma depo katmanının işidir. Karşılaştırmalı test: test/motor_karsilastir.js */
"use strict";

const Cekirdek = (() => {
  const P = typeof Planlayici !== "undefined" ? Planlayici : require("./planlayici.js");
  const R = typeof Rapor !== "undefined" ? Rapor : require("./rapor.js");
  const T = typeof TOHUM !== "undefined" ? TOHUM : require("./tohum_veri.js");

  /* ---------------- Python uyumlu yardımcılar ---------------- */
  class DegerHatasi extends Error {}                       // Python ValueError → 400
  const hata = m => { throw new DegerHatasi(m); };
  const dogru = v => !(v === undefined || v === null || v === false || v === 0 || v === "" ||
    (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length));
  const al = (o, k, v = null) => (o && Object.prototype.hasOwnProperty.call(o, k) && o[k] !== undefined ? o[k] : v);
  const pyStr = v => v === null || v === undefined ? "None" : v === true ? "True" : v === false ? "False"
    : typeof v === "object" ? JSON.stringify(v) : String(v);
  const kes = (s, n) => { const a = [...s]; return a.length > n ? a.slice(0, n).join("") : s; };
  const bosluk = s => s.split(/\s+/).filter(Boolean).join(" ");          // " ".join(s.split())
  const kf = s => s.toLowerCase().replace(/ß/g, "ss");                    // casefold
  const tamMi = v => typeof v === "number" && Number.isInteger(v);         // isinstance(v, int) (bool hariç)
  function pyInt(v) {
    if (typeof v === "boolean") return v ? 1 : 0;
    if (typeof v === "number") { if (!isFinite(v)) hata("cannot convert float"); return Math.trunc(v); }
    if (typeof v === "string") { const s = v.trim().replace(/_/g, ""); if (/^[+-]?\d+$/.test(s)) return parseInt(s, 10); hata(`invalid literal for int() with base 10: '${v}'`); }
    throw new TypeError("int() argument must be a string or a number");
  }
  function pyFloat(v) {
    if (typeof v === "boolean") return v ? 1 : 0;
    if (typeof v === "number") return v;
    if (typeof v === "string") { const s = v.trim(); if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return parseFloat(s); hata(`could not convert string to float: '${v}'`); }
    throw new TypeError("float() argument must be a string or a number");
  }
  /* Python round(x, n): ikilik değerin tam ondalık açılımı üzerinden, yarıda çifte */
  function pyRound(x, n = 0) {
    if (!isFinite(x)) return x;
    const neg = x < 0, tam = Math.abs(x).toFixed(100), [ip, fp] = tam.split(".");
    let basamak = ip + fp.slice(0, n), kalan = fp.slice(n);
    let artir = false;
    if (kalan[0] > "5") artir = true;
    else if (kalan[0] === "5") artir = /[1-9]/.test(kalan.slice(1)) || (+basamak[basamak.length - 1] % 2 === 1);
    let b = BigInt(basamak); if (artir) b += 1n;
    let s = b.toString().padStart(n + 1, "0");
    const sonuc = Number(n ? s.slice(0, s.length - n) + "." + s.slice(s.length - n) : s);
    return neg && sonuc !== 0 ? -sonuc : (neg ? -0 : sonuc) + 0;
  }
  const esit = (a, b) => {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return a === b || (a == null && b == null);
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a).filter(k => a[k] !== undefined), kb = Object.keys(b).filter(k => b[k] !== undefined);
    return ka.length === kb.length && ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && esit(a[k], b[k]));
  };
  const kopya = o => JSON.parse(JSON.stringify(o));
  /* Kararlı sıralama, çok anahtarlı (Python tuple anahtarı gibi) */
  const kiyas = (x, y) => {
    if (Array.isArray(x)) { for (let i = 0; i < Math.min(x.length, y.length); i++) { const c = kiyas(x[i], y[i]); if (c) return c; } return x.length - y.length; }
    if (typeof x === "string") return R.pyStrCmp(x, y);
    return x < y ? -1 : x > y ? 1 : 0;
  };
  const sirala = (l, f = x => x, ters = false) => l.map((x, i) => [x, i, f(x)]).sort((a, b) => (ters ? -kiyas(a[2], b[2]) : kiyas(a[2], b[2])) || a[1] - b[1]).map(x => x[0]);
  const TARIH_DESENI = /^\d{4}-\d{2}-\d{2}$/, KIMLIK_DESENI = /^[0-9a-f]{32}$/, SAAT_DESENI = /^([01]\d|2[0-3]):[0-5]\d$/, RENK_DESENI = /^#[0-9A-Fa-f]{6}$/;
  const ETKINLIK_TURLERI = new Set(["sinav", "etut", "etkinlik"]);
  const SINAV_TUR_ADLARI = { yazili: "yazılı", performans: "performans", proje: "proje", quiz: "quiz" };
  const GUN_ADLARI = ["", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  const KOLEKSIYONLAR = ["dersler", "odevler", "etkinlikler", "baglantilar", "uniteler", "konular", "notlar", "cep_notlari", "mesajlar",
    "muzikler", "kelime_defterleri", "kelimeler", "ders_notlari"];
  const KORUMALI = new Set(["dersler", "baglantilar", "kelime_defterleri", "kelimeler"]);
  const VELI_KAYIT_ALANLARI = { odevler: new Set(["bitti", "bitti_zaman"]), etkinlikler: new Set(), mesajlar: new Set(["okundu", "okunma_zamani", "tamam"]) };
  const MESAJ_DEGISEN = new Set(["okundu", "okunma_zamani", "tamam"]);
  const KOLEKSIYON_ADLARI = { odevler: "Ödev", dersler: "Ders", baglantilar: "Bağlantı", uniteler: "Defter ünitesi", konular: "Defter konusu",
    notlar: "Defter notu", cep_notlari: "Cep notu", mesajlar: "Mesaj", muzikler: "Müzik", kelime_defterleri: "Kelime defteri", kelimeler: "Kelime" };
  const RAPOR_DONEMLERI = { hafta: "Bu hafta", ay: "Son 4 hafta", donem: "Bu dönem" };
  const DERS_KAYNAK_SINIRI = 40, GUNLUK_SINIRI = 5000;

  function varsayilanVeri() {
    const k = {}; for (const a of KOLEKSIYONLAR) k[a] = [];
    return { sema: 1, profil: { ogrenci_adi: "", ogrenci_soyadi: "", okul: "", sube: "", veli_adi: "", ogrenci_foto: "", veli_foto: "" },
      ayarlar: { hesap_makinesi: false, cevap_kontrol: true, aktif_sinif: 5 }, koleksiyonlar: k,
      ders_programi: { saatler: [], hucreler: {}, degisme: "" },
      tohum: { dersler: false, program: false, profil: false, baglantilar: false, ders_kaynaklari: false },
      plan: { ayarlar: {}, ozel_gunler: {}, sira: {}, gunler: {}, calisma: [], simdi: {}, secimler: [] },
      alistirmalar: [], gunluk: [] };
  }
  function derinBirlestir(hedef, kaynak) {
    for (const [k, v] of Object.entries(kaynak)) {
      if (!(k in hedef)) hedef[k] = kopya(v);
      else if (v && typeof v === "object" && !Array.isArray(v) && hedef[k] && typeof hedef[k] === "object" && !Array.isArray(hedef[k])) derinBirlestir(hedef[k], v);
    }
    return hedef;
  }

  /* ---------------- Motor ---------------- */
  class Motor {
    /* ortam: { simdi(): Date, kimlik(): 32 hex, yazili: yazili1.json içeriği, tz: dakika cinsinden saat dilimi farkı (yoksa yerel) } */
    constructor(veri, ortam = {}) {
      this.veri = derinBirlestir(veri || varsayilanVeri(), varsayilanVeri());
      this.ortam = ortam;
      this.oturum = { veli: false, ad: null };
    }
    _tarihNesnesi() { return this.ortam.simdi ? this.ortam.simdi() : new Date(); }
    /* Yerel saat: gün "YYYY-MM-DD", dakika, ISO metin (saniye, saat dilimli) */
    _yerel() {
      const d = this._tarihNesnesi(), fark = this.ortam.tz !== undefined ? this.ortam.tz : -d.getTimezoneOffset();
      const y = new Date(d.getTime() + fark * 60000), iki = n => String(n).padStart(2, "0");
      const gun = `${y.getUTCFullYear()}-${iki(y.getUTCMonth() + 1)}-${iki(y.getUTCDate())}`;
      const isa = fark >= 0 ? "+" : "-", af = Math.abs(fark);
      return { gun, dk: y.getUTCHours() * 60 + y.getUTCMinutes(), ts: d.getTime() / 1000,
        iso: `${gun}T${iki(y.getUTCHours())}:${iki(y.getUTCMinutes())}:${iki(y.getUTCSeconds())}${isa}${iki(Math.floor(af / 60))}:${iki(af % 60)}` };
    }
    simdi() { return this._yerel().iso; }
    suAn() { const y = this._yerel(); return { gun: y.gun, dk: y.dk }; }
    _kimlik() {
      if (this.ortam.kimlik) return this.ortam.kimlik();
      if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, "");
      return require("crypto").randomUUID().replace(/-/g, "");
    }
    get k() { return this.veri.koleksiyonlar; }
    get p() { return this.veri.plan; }

    yeniKayit(icerik, kaynak) {
      const z = this.simdi();
      return Object.assign({}, icerik, { id: this._kimlik(), olusturma: z, degisme: z, kaynak, silindi: false });
    }

    /* ---------- tohumlar (motor.py veri_yukle) ---------- */
    tohumla() {
      const v = this.veri;
      if (!v.tohum.dersler) {
        const d = this.k.dersler;
        if (!d.some(x => !x.silindi)) T.HAZIR_DERSLER.forEach(([ad, kisa, renk], sira) => d.push(this.yeniKayit({ ad, kisa, renk, sira }, "ogrenci")));
        v.tohum.dersler = true;
      }
      if (!v.tohum.ders_kaynaklari) {
        for (const o of sirala(this.k.odevler, o => o.olusturma || "")) if (!o.silindi) this.dersKaynaklariniOgren(o);
        v.tohum.ders_kaynaklari = true;
      }
      v.tohum.program = true; v.tohum.profil = true;
      for (const d of this.k.dersler) if (!tamMi(d.sinif)) d.sinif = al(v.ayarlar, "aktif_sinif", 5);
      if (!v.tohum.baglantilar) {
        const b = this.k.baglantilar;
        if (!b.some(x => !x.silindi)) T.HAZIR_BAGLANTILAR.forEach(([ad, adres, simge], sira) => b.push(this.yeniKayit({ ad, adres, simge, sira }, "veli")));
        v.tohum.baglantilar = true;
      }
      for (const f of ["yaziliSinavlariniEkle", "kelimeDefterleriniTohumla", "odevListeleriniEkle"]) {
        try { this[f](); } catch (e) { if (typeof console !== "undefined") console.warn(f, e); }
      }
    }

    /* ---------- işlem günlüğü ---------- */
    gunlugeYaz(kaynak, metin, tur = "bilgi", kim = null) {
      if (kaynak === "veli" && kim === null) kim = this.oturum.ad;
      const kayit = { zaman: this.simdi(), kaynak, tur, metin };
      if (kim) kayit.kim = kim;
      const g = this.veri.gunluk; g.push(kayit);
      if (g.length > GUNLUK_SINIRI + 500) g.splice(0, g.length - GUNLUK_SINIRI);
      return null;
    }
    gunluguOku(sinir = 300) { return this.veri.gunluk.slice(-sinir).reverse(); }
    _dersAdi(id) { const d = this.k.dersler.find(x => x.id === id); return d ? al(d, "ad", "?") : ""; }
    static tarihYaz(t) {
      const s = String(t == null ? "None" : t).split("-");
      const ok = s.length === 3 && s.every(x => /^\s*[+-]?\d+\s*$/.test(x));
      if (!ok) return String(t || "");
      const [y, a, g] = s.map(x => parseInt(x, 10));
      return `${g}.${String(a).padStart(2, "0")}.${y}`;
    }
    kayitOzeti(kol, k) {
      const ders = this._dersAdi(al(k, "ders_id")), ty = Motor.tarihYaz;
      if (kol === "odevler") return `${ders ? ders + " — " : ""}${al(k, "baslik", "")}${""} (teslim ${ty(al(k, "teslim"))})`;
      if (kol === "etkinlikler") {
        const saat = dogru(al(k, "bas")) ? " " + k.bas : "";
        if (al(k, "tur") === "sinav") {
          const ad = [ders, SINAV_TUR_ADLARI[al(k, "sinav_turu")] || ""].filter(dogru).join(" ");
          return `${ad} sınavı (${ty(al(k, "tarih"))}${saat})`;
        }
        return `${al(k, "baslik") || ders} (${ty(al(k, "tarih"))}${saat})`;
      }
      if (kol === "dersler" || kol === "kelime_defterleri") return al(k, "ad", "");
      if (kol === "kelimeler") {
        const d = this.k.kelime_defterleri.find(x => x.id === al(k, "defter_id"));
        return `${al(k, "kelime", "")} = ${al(k, "anlam", "")}${d ? ` (${d.ad})` : ""}`;
      }
      if (kol === "uniteler") return ders ? `${ders} — ${al(k, "ad", "")}` : al(k, "ad", "");
      if (kol === "konular") { const u = this.k.uniteler.find(x => x.id === al(k, "unite_id")) || {}; return `${al(u, "ad", "?")} › ${al(k, "ad", "")}`; }
      if (kol === "notlar") {
        const konu = this.k.konular.find(x => x.id === al(k, "konu_id")) || {};
        const oz = al(k, "baslik") || kes(bosluk(pyStr(al(k, "metin", ""))), 50) || "fotoğraflı not";
        return `${al(konu, "ad", "?")}: ${oz}`;
      }
      if (kol === "mesajlar") return (al(k, "tur") === "istek" ? "İstek: " : "") + kes(bosluk(pyStr(al(k, "metin", ""))), 60);
      if (kol === "cep_notlari") return kes(bosluk(pyStr(al(k, "metin", ""))), 60) || "boş not";
      return al(k, "baslik") || al(k, "ad") || al(k, "id", "");
    }
    degisiklikGunlugu(kol, islem, eski, yeni, kaynak, onek = "") {
      const etk = k => ({ sinav: "Sınav", etut: "Etüt", etkinlik: "Etkinlik" }[al(k, "tur")] || "Etkinlik");
      const ad = kol === "etkinlikler" ? etk(yeni || eski) : (KOLEKSIYON_ADLARI[kol] || kol);
      const yaz = (m, t) => this.gunlugeYaz(kaynak, onek + m, t);
      if (islem === "ekle" && kol === "mesajlar") return yaz("Mesaj gönderdi: " + this.kayitOzeti(kol, yeni), "mesaj");
      if (islem === "ekle") return yaz(`${ad} eklendi: ${this.kayitOzeti(kol, yeni)}`, "ekle");
      if (islem === "sil") return yaz(`${ad} silindi: ${this.kayitOzeti(kol, eski)}`, "sil");
      if (kol === "mesajlar" && islem === "degistir") {
        if (dogru(al(yeni, "tamam")) && !dogru(al(eski, "tamam"))) return yaz("İstek tamamlandı: " + this.kayitOzeti(kol, yeni), "mesaj");
        return null;
      }
      if (kol === "odevler" && !esit(al(eski, "bitti"), al(yeni, "bitti")))
        return yaz((dogru(al(yeni, "bitti")) ? "Ödev yapıldı olarak işaretlendi: " : "Ödevin 'yapıldı' işareti kaldırıldı: ") + this.kayitOzeti(kol, yeni), "odev");
      if (kol === "etkinlikler" && al(yeni, "tur") === "sinav" && !esit(al(eski, "puan"), al(yeni, "puan"))) {
        let m;
        if (al(yeni, "puan") === null) m = `Sınav notu silindi: ${this.kayitOzeti(kol, yeni)}`;
        else if (al(eski, "puan") === null) m = `Sınav notu girildi: ${this.kayitOzeti(kol, yeni)} → ${pyStr(yeni.puan)}`;
        else m = `Sınav notu değiştirildi: ${this.kayitOzeti(kol, yeni)} → ${pyStr(eski.puan)} yerine ${pyStr(yeni.puan)}`;
        return yaz(m, "not");
      }
      return yaz(`${ad} değiştirildi: ${this.kayitOzeti(kol, yeni)}`, "degistir");
    }
    programGunlugu(eski, yeni, kaynak, onek = "") {
      const s = [];
      if (!esit(al(eski, "saatler"), al(yeni, "saatler"))) s.push(`ders saatleri değiştirildi (${yeni.saatler.length} saat)`);
      const eh = al(eski, "hucreler", {}), yh = al(yeni, "hucreler", {});
      const anahtarlar = sirala([...new Set([...Object.keys(eh), ...Object.keys(yh)])], a => a.split("-").map(Number));
      for (const a of anahtarlar) if (!esit(al(eh, a), al(yh, a))) {
        const [g, sira] = a.split("-").map(Number);
        s.push(`${GUN_ADLARI[g]} ${sira + 1}. ders: ${this._dersAdi(al(eh, a)) || "boş"} → ${this._dersAdi(al(yh, a)) || "boş"}`);
      }
      if (s.length) this.gunlugeYaz(kaynak, onek + "Ders programı değişti: " + s.slice(0, 6).join("; ") + (s.length <= 6 ? "" : ` (+${s.length - 6} değişiklik daha)`), "program");
    }

    /* ---------- doğrulama ---------- */
    dersProgramiDogrula(g) {
      const saatler = al(g, "saatler"), hucreler = al(g, "hucreler");
      if (!Array.isArray(saatler) || !hucreler || typeof hucreler !== "object" || Array.isArray(hucreler)) hata("Ders programı biçimi hatalı");
      if (saatler.length > 14) hata("En çok 14 ders saati olabilir");
      const ts = [];
      for (const s of saatler) {
        const bas = pyStr(al(s, "bas", "")), bit = pyStr(al(s, "bit", ""));
        if (!SAAT_DESENI.test(bas) || !SAAT_DESENI.test(bit)) hata("Saatler SS:DD biçiminde olmalı");
        if (!(R.pyStrCmp(bit, bas) > 0)) hata(`Bitiş saati başlangıçtan sonra olmalı (${bas})`);
        ts.push({ bas, bit });
      }
      const th = {};
      for (const [a, id] of Object.entries(hucreler)) {
        const m = /^([1-6])-(\d{1,2})$/.exec(a);
        if (m && parseInt(m[2], 10) < ts.length && typeof id === "string" && id) th[a] = id;
      }
      return { saatler: ts, hucreler: th, degisme: this.simdi() };
    }
    kayitAlanlariniDogrula(kol, alanlar) {
      if (kol === "kelime_defterleri" || kol === "kelimeler") return this.kelimeAlanlari(kol, alanlar);
      const t = Object.assign({}, alanlar);
      for (const a of ["baslik", "aciklama"]) if (a in t) t[a] = kes(dogru(t[a]) ? pyStr(t[a]) : "", a === "baslik" ? 120 : 1000);
      for (const a of ["tarih", "teslim"]) if (a in t && !TARIH_DESENI.test(dogru(t[a]) ? pyStr(t[a]) : "")) hata("Tarih biçimi hatalı");
      for (const a of ["bas", "bit"]) if (a in t) { t[a] = dogru(t[a]) ? pyStr(t[a]) : ""; if (t[a] && !SAAT_DESENI.test(t[a])) hata("Saat SS:DD biçiminde olmalı"); }
      if ("ders_id" in t) { t.ders_id = dogru(t.ders_id) ? pyStr(t.ders_id) : ""; if (t.ders_id && !KIMLIK_DESENI.test(t.ders_id)) hata("Ders kimliği hatalı"); }
      if ("sira" in t && t.sira !== null) if (!tamMi(t.sira) || !(t.sira >= 0 && t.sira < 14)) hata("Ders saati hatalı");
      if ("puan" in t && t.puan !== null) {
        if (typeof t.puan !== "number" || !(t.puan >= 0 && t.puan <= 100)) hata("Not 0 ile 100 arasında olmalı");
        t.puan = pyRound(t.puan);
      }
      if ("sinav_turu" in t && !(typeof t.sinav_turu === "string" && t.sinav_turu in SINAV_TUR_ADLARI)) t.sinav_turu = "yazili";
      if (kol === "etkinlikler" && "tur" in t && !ETKINLIK_TURLERI.has(t.tur)) hata("Kayıt türü hatalı");
      if ("bitti" in t) t.bitti = dogru(t.bitti);
      return kol === "odevler" ? this.odevPlanAlanlari(t) : t;
    }
    odevPlanAlanlari(t) {
      const temizMetin = v => (dogru(v) ? pyStr(v) : "").trim();
      if ("kaynaklar" in t) {
        const ham = dogru(t.kaynaklar) ? t.kaynaklar : [];
        if (!Array.isArray(ham)) hata("Kaynak listesi hatalı");
        t.kaynaklar = ham.slice(0, 6).filter(k => k && typeof k === "object" && !Array.isArray(k) && (temizMetin(al(k, "ad")) || temizMetin(al(k, "sayfa"))))
          .map(k => ({ ad: kes(temizMetin(al(k, "ad")), 80), sayfa: kes(temizMetin(al(k, "sayfa")), 120) }));
      }
      if ("sure" in t) {
        const v = t.sure;
        if (v === null || v === "") t.sure = null;
        else {
          let n;
          try { n = pyRound(pyFloat(v)); } catch (_) { hata("Süre dakika olarak yazılmalı"); }
          if (!(n >= 1 && n <= 600)) hata("Süre 1–600 dakika arasında olmalı");
          t.sure = n;
        }
      }
      for (const [a, n] of [["odev_turu", 80], ["kontrol", 80]]) if (a in t) t[a] = kes(temizMetin(t[a]), n);
      if ("en_erken" in t) { t.en_erken = dogru(t.en_erken) ? pyStr(t.en_erken) : ""; if (t.en_erken && !TARIH_DESENI.test(t.en_erken)) hata("Başlama tarihi hatalı"); }
      if ("yay" in t) t.yay = dogru(t.yay);
      if ("baslik" in t && !t.baslik.trim() && dogru(al(t, "kaynaklar"))) t.baslik = kes(P.parcaMetni(t.kaynaklar, P.birimler(t.kaynaklar), 0, 1e6), 120);
      return t;
    }
    dersKaynakListesi(ham) {
      if (!Array.isArray(ham)) hata("Kaynak listesi hatalı");
      const s = [], g = new Set();
      for (let a of ham) { a = kes(bosluk(dogru(a) ? pyStr(a) : ""), 80); if (a && !g.has(kf(a))) { g.add(kf(a)); s.push(a); } }
      return s.slice(0, DERS_KAYNAK_SINIRI);
    }
    dersKaynaklariniOgren(odev, yeniOdev = false) {
      const ders = this.k.dersler.find(d => d.id === al(odev, "ders_id") && !d.silindi);
      if (!ders) return false;
      const eski = [...(al(ders, "kaynaklar") || [])];
      let yeni = (al(odev, "kaynaklar") || []).filter(k => k && typeof k === "object" && !Array.isArray(k)).map(k => bosluk(dogru(al(k, "ad")) ? pyStr(k.ad) : ""));
      const gizli = [...(al(ders, "kaynak_gizli") || [])];
      if (gizli.length) {
        const g = new Set(gizli.map(kf));
        if (yeniOdev) {
          const kul = new Set(yeni.filter(Boolean).map(kf));
          if ([...kul].some(x => g.has(x))) ders.kaynak_gizli = gizli.filter(a => !kul.has(kf(a)));
        } else yeni = yeni.filter(a => !g.has(kf(a)));
      }
      const bir = this.dersKaynakListesi(yeni.concat(eski));
      if (!esit(bir, eski)) { ders.kaynaklar = bir; return true; }
      return false;
    }
    dersKaynakSil(dersId, ad, kaynak) {
      const ders = this.k.dersler.find(d => d.id === dersId && !d.silindi);
      ad = kes(bosluk(dogru(ad) ? pyStr(ad) : ""), 80);
      if (!ders || !ad) hata("Ders ya da kaynak bulunamadı");
      const k = kf(ad);
      ders.kaynaklar = (al(ders, "kaynaklar") || []).filter(a => kf(a) !== k);
      ders.kaynak_gizli = [ad].concat((al(ders, "kaynak_gizli") || []).filter(a => kf(a) !== k)).slice(0, 100);
      ders.degisme = this.simdi();
      this.gunlugeYaz(kaynak, `Kaynak listeden silindi: ${ad} (${al(ders, "ad", "")})`, "sil");
      return ders;
    }
    mesajHazirla(alanlar, kimden, veli = null) {
      const m = { metin: kes(pyStr(al(alanlar, "metin", "")).trim(), 1000), tur: al(alanlar, "tur") === "istek" ? "istek" : "mesaj",
        kimden, kime: kimden === "veli" ? "ogrenci" : "veli", okundu: false, okunma_zamani: "", tamam: false };
      if (veli) { m.veli_id = veli.id; m.veli_adi = veli.ad; }
      if (!m.metin) hata("Boş mesaj gönderilemez");
      return m;
    }

    /* ---------- plan ---------- */
    _odev(id) { return this.k.odevler.find(o => o.id === id && !o.silindi) || null; }
    planUret() {
      const t = this.suAn(), p = this.p, k = this.k;
      const sonuc = P.planHesapla(k.odevler.filter(o => !o.silindi), this.veri.ders_programi, k.etkinlikler.filter(e => !e.silindi),
        p.ayarlar, p.ozel_gunler, p.calisma, p.sira, t.gun, t.dk, k.dersler.filter(d => !d.silindi).map(d => al(d, "id")),
        al(al(p, "simdi") || {}, t.gun));
      const bugun = sonuc.bugun;
      if (sonuc.gunler.length) {
        const yapilan = p.calisma.filter(c => al(c, "tarih") === bugun && al(c, "durum") !== "zor").reduce((s, c) => s + pyInt(al(c, "dk_plan", 0)), 0);
        const toplam = sonuc.gunler[0].toplam_dk + yapilan;
        const g = p.gunler[bugun] || (p.gunler[bugun] = {});
        if (toplam > al(g, "planlanan", 0)) g.planlanan = toplam;
        const ids = sonuc.gunler[0].gorevler.map(x => x.odev_id);
        if (ids.length) {
          const onceki = al(g, "plan_odevler") || [];
          const yeni = [...new Set(onceki.concat(ids))].slice(0, 40);
          if (!esit(yeni, onceki)) g.plan_odevler = yeni;
        }
      }
      const acik = new Set(k.odevler.filter(o => !o.silindi && !dogru(al(o, "bitti"))).map(o => o.id));
      const il = {};
      for (const c of p.calisma) if (acik.has(al(c, "odev_id"))) il[c.odev_id] = Math.max(al(il, c.odev_id, 0), pyInt(al(c, "birim_bit", 0)));
      sonuc.ilerleme = il;
      sonuc.hesaplandi = this.simdi();
      return sonuc;
    }
    static raporAraligi(donem, bugun) {
      let bas;
      if (donem === "hafta") bas = P.gunEkle(bugun, -((P.jsGun(bugun) + 6) % 7));
      else if (donem === "donem") { const y = +bugun.slice(0, 4), a = +bugun.slice(5, 7); bas = a >= 9 ? `${y}-09-01` : a >= 2 ? `${y}-02-01` : `${y - 1}-09-01`; }
      else bas = P.gunEkle(bugun, -27);
      return [bas, bugun];
    }
    raporUret(donem = "hafta") {
      if (!(donem in RAPOR_DONEMLERI)) hata("Dönem hatalı");
      const bugun = this.suAn().gun, [bas, bit] = Motor.raporAraligi(donem, bugun), k = this.k, p = this.p;
      let gel; try { gel = this.gelisimOzeti(); } catch (_) { gel = null; }
      const dersler = {}; for (const d of k.dersler) dersler[d.id] = al(d, "ad", "");
      const girdi = { odevler: k.odevler, calisma: p.calisma, secimler: al(p, "secimler") || [], gunler: p.gunler,
        sinavlar: k.etkinlikler.filter(e => !e.silindi && al(e, "tur") === "sinav"), dersler, gelisim: gel || {},
        program: this.veri.ders_programi, ad: this.veri.profil.ogrenci_adi || "Öğrenci", bugun };
      const r = R.raporHazirla(Object.assign({ bas, bit, simdi: this.simdi().slice(0, 19) }, girdi));
      const uz = P.gunFarki(bit, bas) + 1;
      const [ob, obt] = donem === "hafta" ? [P.gunEkle(bas, -7), P.gunEkle(bas, -1)] : [P.gunEkle(bas, -uz), P.gunEkle(bas, -1)];
      const onceki = R.raporHazirla(Object.assign({ bas: ob, bit: obt }, girdi));
      r.kiyas = R.karsilastir(r, onceki);
      r.donem = donem; r.donem_adi = RAPOR_DONEMLERI[donem];
      return r;
    }
    _planTemizle() {
      const p = this.p, sinir = P.gunEkle(this.suAn().gun, -60);
      for (const a of ["ozel_gunler", "sira", "gunler", "simdi"]) for (const t of Object.keys(al(p, a) || {})) if (R.pyStrCmp(t, sinir) < 0) delete p[a][t];
      if (p.calisma.length > 3000) p.calisma.splice(0, p.calisma.length - 3000);
    }
    kaynakBittiIslemi(g, kaynak, bugun) {
      const p = this.p, o = this._odev(pyStr(al(g, "odev_id", "")));
      if (!o) hata("Ödev bulunamadı");
      const ky = [...(al(o, "kaynaklar") || [])];
      if (ky.length < 2) hata("Bu ödevde tek kaynak var");
      const bl = P.birimler(ky), n = bl.length, K = [...ky.keys()];
      const birim = {}; for (const k of K) birim[k] = bl.map((b, i) => [b, i]).filter(([b]) => b.k === k).map(([, i]) => i);
      const ilerleme = Math.min(n, Math.max(0, ...p.calisma.filter(c => al(c, "odev_id") === o.id).map(c => pyInt(al(c, "birim_bit", 0)))));
      const onceden = K.filter(k => birim[k].length && Math.max(...birim[k]) < ilerleme);
      const yo = K.find(k => !onceden.includes(k) && birim[k].length && Math.min(...birim[k]) < ilerleme);
      const yarimOnce = yo === undefined ? null : yo;
      const yarimOnceN = yarimOnce !== null ? birim[yarimOnce].filter(i => i < ilerleme).length : 0;
      const cevap = {};
      for (const c of al(g, "kaynaklar") || []) {
        let k;
        try { if (!c || typeof c !== "object" || Array.isArray(c)) continue; k = pyInt(al(c, "i")); } catch (_) { continue; }
        if (k >= 0 && k < ky.length && ["tam", "kismi", "yok"].includes(al(c, "durum"))) cevap[k] = c;
      }
      if (K.some(k => !onceden.includes(k) && !(k in cevap))) hata("Her kaynak için yaptın mı, yapmadın mı seç");
      const tam = K.filter(k => !onceden.includes(k) && cevap[k].durum === "tam");
      let kismi = null;
      for (const k of K) {
        if (onceden.includes(k) || cevap[k].durum !== "kismi") continue;
        let kac; try { kac = pyInt(al(cevap[k], "kac", 0)); } catch (_) { kac = 0; }
        kac = birim[k].length > 1 ? Math.max(1, Math.min(kac, birim[k].length - 1)) : 0;
        if (kac) { kismi = [k, Math.max(kac, k === yarimOnce ? yarimOnceN : 0)]; break; }
      }
      if (kismi === null && yarimOnce !== null && !tam.includes(yarimOnce)) kismi = [yarimOnce, yarimOnceN];
      let sira = onceden.concat(tam, kismi ? [kismi[0]] : []);
      sira = sira.concat(K.filter(k => !sira.includes(k)));
      const u0 = onceden.reduce((s, k) => s + birim[k].length, 0);
      const yeniBit = u0 + tam.reduce((s, k) => s + birim[k].length, 0) + (kismi ? kismi[1] : 0);
      const siraDegisti = !esit(sira, K);
      if (!siraDegisti && yeniBit <= ilerleme) hata("Yaptığın bir kaynak seçmedin");
      if (siraDegisti) {
        o.kaynaklar = sira.map(k => ky[k]); o.degisme = this.simdi();
        for (const c of p.calisma) if (al(c, "odev_id") === o.id) { c.birim_bas = Math.min(pyInt(al(c, "birim_bas", 0)), u0); c.birim_bit = Math.min(pyInt(al(c, "birim_bit", 0)), u0); }
        this.gunlugeYaz(kaynak, `Plan: ${pyStr(this._dersAdi(al(o, "ders_id")))} — kaynak sırası yapılanlara göre düzenlendi`, "plan");
      }
      const yer = ["ev", "okul", "bekleme", "diger"].includes(al(g, "yer")) ? g.yer : "ev";
      let dkPlan, dkGercek;
      try { dkPlan = pyInt(al(g, "dk_plan", 0)); dkGercek = pyInt(al(g, "dk_gercek", 0)); } catch (_) { dkPlan = dkGercek = 0; }
      p.calisma.push({ zaman: this.simdi(), tarih: bugun, odev_id: o.id, birim_bas: siraDegisti ? u0 : ilerleme, birim_bit: yeniBit, yer,
        dk_plan: Math.max(0, Math.min(dkPlan, 600)), dk_gercek: Math.max(0, Math.min(dkGercek, 600)), durum: "bitti", kaynak, not: "kaynak kaynak işaretlendi" });
      const yky = al(o, "kaynaklar") || [], ybl = P.birimler(yky);
      const yapilan = yeniBit > 0 ? P.parcaMetni(yky, ybl, 0, yeniBit) : "", kalan = yeniBit < n ? P.parcaMetni(yky, ybl, yeniBit, n) : "";
      const ders = this._dersAdi(al(o, "ders_id"));
      if (yeniBit >= n && !dogru(al(o, "bitti"))) {
        const eski = Object.assign({}, o);
        o.bitti = true; o.bitti_zaman = this.simdi(); o.degisme = this.simdi();
        this.degisiklikGunlugu("odevler", "degistir", eski, o, kaynak);
        if (al(al(p, "simdi") || {}, bugun) === o.id) delete p.simdi[bugun];
      }
      this.gunlugeYaz(kaynak, `Plan: ${pyStr(ders)} — kaynak kaynak işaretledi. Yapılan: ${yapilan || "—"}${kalan ? "; KALAN: " + kalan : " (ödev bitti)"}`, kalan ? "uyari" : "plan");
    }
    planIslemi(g, kaynak) {
      const p = this.p, tur = al(g, "tur"), bugun = this.suAn().gun;
      const tarih = dogru(al(g, "tarih")) ? pyStr(g.tarih) : bugun;
      if (!TARIH_DESENI.test(tarih)) hata("Tarih hatalı");
      if (["bitti", "yarim", "zor"].includes(tur)) {
        const o = this._odev(pyStr(al(g, "odev_id", "")));
        if (!o) hata("Ödev bulunamadı");
        const n = P.birimler(al(o, "kaynaklar") || []).length;
        let bas, bit, dkPlan, dkGercek;
        try { bas = pyInt(al(g, "birim_bas", 0)); bit = pyInt(al(g, "birim_bit", 0)); dkPlan = pyInt(al(g, "dk_plan", 0)); dkGercek = pyInt(al(g, "dk_gercek", 0)); }
        catch (_) { hata("Değer hatalı"); }
        bas = Math.max(0, Math.min(bas, n)); bit = Math.max(0, Math.min(bit, n));
        if (tur === "zor") { bit = bas; dkPlan = 0; dkGercek = 0; }
        const yer = ["ev", "okul", "bekleme", "diger"].includes(al(g, "yer")) ? g.yer : "ev";
        const girdi = { zaman: this.simdi(), tarih: bugun, odev_id: o.id, birim_bas: bas, birim_bit: bit, yer,
          dk_plan: Math.max(0, Math.min(dkPlan, 600)), dk_gercek: Math.max(0, Math.min(dkGercek, 600)), durum: tur, kaynak,
          not: kes(dogru(al(g, "not")) ? pyStr(g.not) : "", 300) };
        if (tur === "yarim" && bit > bas && dkPlan) girdi.dk_plan = pyRound(dkPlan * (bit - bas) / Math.max(1, pyInt(al(g, "birim_plan_bit", bit)) - bas));
        if (tur === "yarim" && bit <= bas) girdi.dk_plan = 0;
        p.calisma.push(girdi);
        const ky = al(o, "kaynaklar") || [];
        const parca = bit > bas ? P.parcaMetni(ky, P.birimler(ky), bas, bit) : "";
        const ders = pyStr(this._dersAdi(al(o, "ders_id")));
        if (tur === "bitti") {
          const il = Math.max(0, ...p.calisma.filter(c => al(c, "odev_id") === o.id).map(c => pyInt(al(c, "birim_bit", 0))));
          if (il >= n && !dogru(al(o, "bitti"))) {
            const eski = Object.assign({}, o);
            o.bitti = true; o.bitti_zaman = this.simdi(); o.degisme = this.simdi();
            this.degisiklikGunlugu("odevler", "degistir", eski, o, kaynak);
          }
          if (al(al(p, "simdi") || {}, bugun) === o.id && il >= n) delete p.simdi[bugun];
          const yerAdi = { okul: "okulda boş vakitte", bekleme: "çıkışta beklerken", diger: "başka bir zamanda" }[yer];
          this.gunlugeYaz(kaynak, `Plan: ${ders} — ${parca} ${yerAdi ? `yapılmış (${yerAdi})` : `bitti (${girdi.dk_gercek} dk, plan ${girdi.dk_plan} dk)`}`, "plan");
        } else if (tur === "yarim") {
          this.gunlugeYaz(kaynak, `Plan: ${ders} — yarım kaldı${parca ? ", yapılan: " + parca : ", başlanamadı"}${girdi.not ? " · " + girdi.not : ""}`, "plan");
        } else this.gunlugeYaz(kaynak, `Plan: ${ders} ödevinde zorlandı${girdi.not ? " · " + girdi.not : ""}`, "uyari");
      } else if (tur === "kaynaklar") this.kaynakBittiIslemi(g, kaynak, bugun);
      else if (tur === "simdi") {
        const oid = pyStr(al(g, "odev_id", ""));
        if (!p.simdi || typeof p.simdi !== "object") p.simdi = {};
        if (!oid) delete p.simdi[bugun];
        else {
          const o = this._odev(oid);
          if (!o) hata("Ödev bulunamadı");
          const planli = al(g, "planli") === true;
          p.simdi[bugun] = oid;
          if (!planli) {
            if (!Array.isArray(p.secimler)) p.secimler = [];
            p.secimler.push({ zaman: this.simdi(), tarih: bugun, odev_id: oid });
            if (p.secimler.length > 500) p.secimler.splice(0, p.secimler.length - 500);
          }
          this.gunlugeYaz(kaynak, `Plan: ${pyStr(this._dersAdi(al(o, "ders_id")))} ödevini ${planli ? "sıradan önce" : "plan dışından"} seçti`, "plan");
        }
      } else if (tur === "geri_al") {
        const oid = pyStr(al(g, "odev_id", ""));
        for (let i = p.calisma.length - 1; i >= 0; i--) {
          const c = p.calisma[i];
          if (al(c, "odev_id") === oid && al(c, "tarih") === bugun && ["bitti", "yarim"].includes(al(c, "durum"))) {
            p.calisma.splice(i, 1);
            const o = this._odev(oid);
            if (o && dogru(al(o, "bitti")) && c.durum === "bitti") { o.bitti = false; o.degisme = this.simdi(); }
            this.gunlugeYaz(kaynak, `Plan: ${pyStr(this._dersAdi(al(o || {}, "ders_id")))} işareti geri alındı`, "plan");
            break;
          }
        }
      } else if (tur === "sira") {
        const sira = (dogru(al(g, "sira")) ? g.sira : []).map(pyStr).filter(x => KIMLIK_DESENI.test(x)).slice(0, 40);
        if (sira.length) p.sira[tarih] = sira; else delete p.sira[tarih];
        this.gunlugeYaz(kaynak, `Plan: ${P.GUN_ADI[P.jsGun(P.tarih(tarih))]} sırası ${sira.length ? "değiştirildi" : "yeniden düzenlendi"}`, "plan");
      } else if (tur === "sabit") {
        const gun = p.gunler[tarih] || (p.gunler[tarih] = {});
        const liste = new Set(al(gun, "sabit", []));
        const sid = kes(pyStr(al(g, "id", "")), 40);
        if (dogru(al(g, "bitti"))) liste.add(sid); else liste.delete(sid);
        gun.sabit = sirala([...liste]);
      } else if (tur === "degerlendirme") {
        const deger = al(g, "deger");
        if (!["kolay", "iyi", "zor"].includes(deger)) hata("Değerlendirme hatalı");
        (p.gunler[tarih] || (p.gunler[tarih] = {})).degerlendirme = { deger, not: kes(dogru(al(g, "not")) ? pyStr(g.not) : "", 300), zaman: this.simdi() };
        this.gunlugeYaz(kaynak, `Plan: günü değerlendirdi — ${{ kolay: "kolaydı", iyi: "iyiydi", zor: "zordu" }[deger]}${dogru(al(g, "not")) ? " · " + kes(pyStr(g.not), 300) : ""}`, "plan");
      } else if (tur === "ozel_gun") this.ozelGunYaz(tarih, g, kaynak);
      else hata("Bilinmeyen plan işlemi");
      this._planTemizle();
      return { tamam: true };
    }
    ozelGunYaz(tarih, g, kaynak) {
      const p = this.p;
      if (dogru(al(g, "sil"))) {
        if (tarih in p.ozel_gunler && p.ozel_gunler[tarih] !== null) { delete p.ozel_gunler[tarih]; this.gunlugeYaz(kaynak, `Plan: ${Motor.tarihYaz(tarih)} özel gün ayarı kaldırıldı`, "plan"); }
        else delete p.ozel_gunler[tarih];
        return;
      }
      let dakika; try { dakika = pyInt(al(g, "dk")); } catch (_) { hata("Süre dakika olarak yazılmalı"); }
      if (!(dakika >= 0 && dakika <= 600)) hata("Süre 0–600 dakika arasında olmalı");
      const bas = dogru(al(g, "baslangic")) ? pyStr(g.baslangic) : "";
      if (bas && !SAAT_DESENI.test(bas)) hata("Başlangıç saati SS:DD olmalı");
      const not = kes((dogru(al(g, "not")) ? pyStr(g.not) : "").trim(), 200);
      p.ozel_gunler[tarih] = { dk: dakika, not, baslangic: bas, kim: kaynak, zaman: this.simdi() };
      this.gunlugeYaz(kaynak, `Plan: ${Motor.tarihYaz(tarih)} için çalışma süresi ${dakika} dk${not ? " · " + not : ""}`, "plan");
    }
    planAyarlariniYaz(govde, kaynak) {
      const a = P.ayarlariTamamla(this.p.ayarlar), yeni = Object.assign({}, a);
      const gelen = "ayarlar" in govde ? govde.ayarlar : govde;
      if (!gelen || typeof gelen !== "object" || Array.isArray(gelen)) hata("Ayarlar hatalı");
      if ("butce" in gelen) {
        const b = gelen.butce;
        if (!b || typeof b !== "object" || Array.isArray(b)) hata("Bütçe hatalı");
        yeni.butce = Object.assign({}, a.butce);
        for (const [gun, v0] of Object.entries(b)) if (gun.length === 1 && "0123456".includes(gun)) {
          const v = pyInt(v0); if (!(v >= 0 && v <= 300)) hata("Günlük süre 0–300 dakika olmalı"); yeni.butce[gun] = v;
        }
      }
      for (const [alan, alt, ust] of [["ara_dk", 0, 240], ["tampon_gun", 0, 3], ["blok_dk", 10, 60], ["mola_dk", 0, 20]]) if (alan in gelen) {
        const v = pyInt(gelen[alan]); if (!(v >= alt && v <= ust)) hata(`${alan} ${alt}–${ust} arasında olmalı`); yeni[alan] = v;
      }
      for (const alan of ["sabit_saat", "hafta_sonu_saat", "en_gec"]) if (alan in gelen) {
        if (!SAAT_DESENI.test(pyStr(gelen[alan]))) hata("Saatler SS:DD biçiminde olmalı"); yeni[alan] = pyStr(gelen[alan]);
      }
      if ("baslangic_tur" in gelen) { if (!["okul", "sabit"].includes(gelen.baslangic_tur)) hata("Başlangıç türü hatalı"); yeni.baslangic_tur = gelen.baslangic_tur; }
      if ("arin_sira" in gelen) yeni.arin_sira = dogru(gelen.arin_sira);
      if ("sabitler" in gelen) {
        const liste = [];
        for (const s of (dogru(gelen.sabitler) ? gelen.sabitler : []).slice(0, 8)) {
          const ad = kes((dogru(al(s, "ad")) ? pyStr(s.ad) : "").trim(), 60);
          if (!ad) continue;
          const gunler = [...new Set((dogru(al(s, "gunler")) ? s.gunler : []).filter(x => "0123456".includes(pyStr(x))).map(pyInt))].sort((x, y) => x - y);
          liste.push({ id: kes(dogru(al(s, "id")) ? pyStr(s.id) : "", 20).replace(/[^a-z0-9]/g, "") || this._kimlik().slice(0, 8), ad,
            dk: Math.max(0, Math.min(pyInt(dogru(al(s, "dk")) ? s.dk : 0), 180)), gunler });
        }
        yeni.sabitler = liste;
      }
      const degisen = Object.keys(yeni).filter(k => !esit(yeni[k], al(a, k)));
      this.p.ayarlar = yeni;
      if (degisen.length) {
        const adlar = { butce: "günlük süreler", baslangic_tur: "başlangıç", ara_dk: "okuldan sonra ara", sabit_saat: "başlangıç saati",
          hafta_sonu_saat: "hafta sonu başlangıcı", en_gec: "en geç saat", tampon_gun: "pay günü", blok_dk: "çalışma bloğu",
          mola_dk: "mola", arin_sira: "Arın'ın sıra değiştirmesi", sabitler: "her gün yapılacaklar" };
        this.gunlugeYaz(kaynak, "Plan ayarları değişti: " + degisen.map(k => adlar[k] || k).join(", "), "ayar");
      }
    }
    planOzeti() {
      const p = this.p, bugun = this.suAn().gun, gunler = [];
      const durumda = (c, l) => l.includes(al(c, "durum"));
      for (let i = 6; i >= 0; i--) {
        const t = P.gunEkle(bugun, -i), cal = p.calisma.filter(c => al(c, "tarih") === t), b = al(p.gunler, t) || {};
        const by = cal.filter(c => durumda(c, ["bitti", "yarim"]));
        gunler.push({ tarih: t, planlanan: al(b, "planlanan", 0), yapilan: by.reduce((s, c) => s + pyInt(al(c, "dk_plan", 0)), 0),
          gercek: by.reduce((s, c) => s + pyInt(al(c, "dk_gercek", 0)), 0), biten: cal.filter(c => al(c, "durum") === "bitti").length,
          yarim: cal.filter(c => al(c, "durum") === "yarim").length, zor: cal.filter(c => al(c, "durum") === "zor").length,
          disarida: cal.filter(c => ["okul", "bekleme", "diger"].includes(al(c, "yer")) && al(c, "durum") === "bitti").length,
          secim: (al(p, "secimler") || []).filter(x => al(x, "tarih") === t).length,
          degerlendirme: al(b, "degerlendirme"), sabit: al(b, "sabit", []), ozel: al(p.ozel_gunler, t), sira_degisti: t in p.sira });
      }
      const sinir = P.gunEkle(bugun, -13), once = c => R.pyStrCmp(al(c, "tarih", ""), sinir) < 0;
      const dm = new Map();
      for (const c of p.calisma) {
        if (once(c) || !durumda(c, ["bitti", "yarim"]) || !dogru(al(c, "dk_gercek"))) continue;
        const o = this._odev(al(c, "odev_id")) || {}, a = al(o, "ders_id") || "";
        if (!dm.has(a)) dm.set(a, { ders_id: al(o, "ders_id"), plan: 0, gercek: 0, sayi: 0 });
        const d = dm.get(a); d.plan += pyInt(al(c, "dk_plan", 0)); d.gercek += pyInt(al(c, "dk_gercek", 0)); d.sayi += 1;
      }
      const satir = (c, yer) => { const x = { tarih: c.tarih, odev_id: c.odev_id, ders_id: al(this._odev(c.odev_id) || {}, "ders_id") }; if (yer) x.yer = al(c, "yer"); else x.not = al(c, "not", ""); return x; };
      return { gunler, dersler: sirala([...dm.values()], x => -(x.gercek - x.plan)),
        zorlar: p.calisma.filter(c => al(c, "durum") === "zor" && !once(c)).map(c => satir(c)).slice(-20),
        yarimlar: p.calisma.filter(c => al(c, "durum") === "yarim" && !once(c)).map(c => satir(c)).slice(-20),
        disarida: p.calisma.filter(c => ["okul", "bekleme", "diger"].includes(al(c, "yer")) && !once(c)).map(c => satir(c, true)).slice(-20) };
    }

    /* ---------- alıştırma kayıtları ve özetler ---------- */
    alistirmaKaydet(kayit) {
      const s = (v, n) => kes(pyStr(v), n);
      const t = { zaman: this.simdi(), arac: s(al(kayit, "arac", ""), 30), tur: s(al(kayit, "tur", ""), 40), soru: s(al(kayit, "soru", ""), 200), dogru: dogru(al(kayit, "dogru")) };
      if ("cevap" in kayit) t.cevap = s(kayit.cevap, 30);
      for (const [a, n] of [["oyun", 30], ["ders", 20], ["konu", 90], ["beceri", 60], ["beceri_adi", 80], ["bicim", 10], ["etkinlik", 40], ["yazi", 600], ["eksik", 40]])
        if (dogru(al(kayit, a))) t[a] = s(kayit[a], n);
      if (typeof kayit.sure === "number") t.sure = pyRound(kayit.sure, 1);
      if (KIMLIK_DESENI.test(dogru(al(kayit, "kelime")) ? pyStr(kayit.kelime) : "")) t.kelime = kayit.kelime;
      this.veri.alistirmalar.push(t);
    }
    alistirmalariOku(gun = 90) {
      const sinir = this._yerel().ts - gun * 86400;
      return this.veri.alistirmalar.filter(k => { const z = Date.parse(al(k, "zaman")); return !isNaN(z) && z / 1000 >= sinir; });
    }
    istatistikOzeti() {
      const kayitlar = this.alistirmalariOku(), araclar = {}, sorular = new Map(), gunler = {};
      const ilk = (o, k, v) => (k in o ? o[k] : (o[k] = v));
      for (const k of kayitlar) {
        const a = ilk(araclar, k.arac, { deneme: 0, dogru: 0, turler: {} }); a.deneme += 1; a.dogru += +k.dogru;
        const t = ilk(a.turler, k.tur || "diğer", { deneme: 0, dogru: 0 }); t.deneme += 1; t.dogru += +k.dogru;
        if (k.arac === "carpim") { if (!sorular.has(k.soru)) sorular.set(k.soru, { deneme: 0, yanlis: 0 }); const q = sorular.get(k.soru); q.deneme += 1; q.yanlis += +!k.dogru; }
        const g = ilk(gunler, k.zaman.slice(0, 10), { deneme: 0, dogru: 0 }); g.deneme += 1; g.dogru += +k.dogru;
      }
      const zor = sirala([...sorular.entries()].filter(([, v]) => v.yanlis), x => [-x[1].yanlis / x[1].deneme, -x[1].yanlis]).slice(0, 10);
      let oneriler = [];
      for (const [arac, a] of Object.entries(araclar)) for (const [tur, t] of Object.entries(a.turler)) {
        const oran = t.dogru / t.deneme;
        if (t.deneme >= 3 && oran < 0.7) oneriler.push({ arac, tur, oran: pyRound(oran * 100), deneme: t.deneme });
      }
      oneriler = sirala(oneriler, x => x.oran);
      const gs = {}; for (const a of sirala(Object.keys(gunler)).slice(-14)) gs[a] = gunler[a];
      return { araclar, zor_sorular: zor.map(([soru, v]) => Object.assign({ soru }, v)), gunler: gs, oneriler: oneriler.slice(0, 6), toplam: kayitlar.length };
    }
    zayifCarpimlar() {
      const ag = new Map();
      for (const k of this.alistirmalariOku(60)) { if (k.arac !== "carpim") continue; if (!ag.has(k.soru)) ag.set(k.soru, [0, 0]); const a = ag.get(k.soru); a[0] += 1; a[1] += +!k.dogru; }
      const s = {}; for (const [q, v] of ag) s[q] = pyRound((v[1] + 0.5) / (v[0] + 1), 3);
      return s;
    }
    static etiketle(k) {
      const CK = { toplama: "Toplama", "çıkarma": "Çıkarma", "çarpma": "Çarpma", "bölme": "Bölme", "kalanlı bölme": "Kalanlı bölme",
        kesirler: "Kesirlerle işlemler", "ondalık sayılar": "Ondalık sayılarla işlemler", "yüzde": "Yüzde", "işlem önceliği": "İşlem önceliği" };
      if (dogru(al(k, "beceri"))) return [al(k, "ders") || "diger", k.beceri, al(k, "beceri_adi") || k.beceri, al(k, "konu", "")];
      if (al(k, "arac") === "cevap_kontrol") { const tur = al(k, "tur") || "diğer"; return ["matematik", "ck." + tur, (CK[tur] || (tur[0].toUpperCase() + tur.slice(1).toLowerCase())) + " (Cevap Kontrol)", "İşlemler"]; }
      return null;
    }
    gelisimOzeti() {
      const DERS_ADLARI = { matematik: "Matematik", turkce: "Türkçe", fen: "Fen Bilimleri", sosyal: "Sosyal Bilgiler", ingilizce: "İngilizce", bilisim: "Bilişim",
        muzik: "Müzik", almanca: "Almanca", din: "Din Kültürü", kelime: "Kelime Defterim" };
      const ZAYIF_EN_AZ = 8, ZAYIF_ORAN = 0.7;
      const kayitlar = this.alistirmalariOku(120), simdiTs = this._yerel().ts, dersler = {}, gunler = {};
      const ilk = (o, k, v) => (k in o ? o[k] : (o[k] = v));
      for (const k of kayitlar) {
        const et = Motor.etiketle(k);
        if (!et) continue;
        const [ders, beceri, ad, konu] = et, yas = (simdiTs - Date.parse(k.zaman) / 1000) / 86400;
        const d = ilk(dersler, ders, { ad: DERS_ADLARI[ders] || ders, deneme: 0, dogru: 0, beceriler: {}, sorular: new Map(), oyunlar: {} });
        d.deneme += 1; d.dogru += +k.dogru;
        if (dogru(al(k, "oyun"))) d.oyunlar[k.oyun] = (d.oyunlar[k.oyun] || 0) + 1;
        const b = ilk(d.beceriler, beceri, { kod: beceri, ad, konu, deneme: 0, dogru: 0, etkinlik: "", d30: 0, g30: 0, d7: 0, g7: 0, donceki: 0, gonceki: 0, son: "" });
        if (dogru(al(k, "etkinlik")) && k.etkinlik !== "Karışık Tekrar") b.etkinlik = k.etkinlik;
        b.deneme += 1; b.dogru += +k.dogru;
        if (R.pyStrCmp(k.zaman, b.son) > 0) b.son = k.zaman;
        if (yas <= 30) { b.d30 += 1; b.g30 += +k.dogru; }
        if (yas <= 7) { b.d7 += 1; b.g7 += +k.dogru; } else if (yas <= 30) { b.donceki += 1; b.gonceki += +k.dogru; }
        if (!k.dogru && dogru(al(k, "soru"))) {
          const an = JSON.stringify([beceri, k.soru]);
          if (!d.sorular.has(an)) d.sorular.set(an, { soru: k.soru, beceri: ad, yanlis: 0, cevaplar: new Map() });
          const q = d.sorular.get(an); q.yanlis += 1;
          if (dogru(al(k, "cevap"))) q.cevaplar.set(k.cevap, (q.cevaplar.get(k.cevap) || 0) + 1);
        }
        const g = ilk(gunler, k.zaman.slice(0, 10), { deneme: 0, dogru: 0, sure: 0 });
        g.deneme += 1; g.dogru += +k.dogru; g.sure += Math.min(dogru(al(k, "sure")) ? pyFloat(k.sure) : 0, 120);
      }
      const oran = (g, d) => (d ? pyRound(100 * g / d) : null);
      let destek = [], guclu = [];
      for (const [ders, d] of Object.entries(dersler)) {
        const liste = [];
        for (const b of Object.values(d.beceriler)) {
          b.oran = oran(b.dogru, b.deneme); b.oran30 = oran(b.g30, b.d30); b.oran7 = oran(b.g7, b.d7); b.oran_onceki = oran(b.gonceki, b.donceki);
          b.egilim = b.oran7 !== null && b.oran_onceki !== null && b.d7 >= 5 && b.donceki >= 5
            ? (b.oran7 - b.oran_onceki >= 10 ? "yukari" : b.oran_onceki - b.oran7 >= 10 ? "asagi" : "sabit") : "";
          const oz = { ders: d.ad, ders_kod: ders, kod: b.kod, etkinlik: b.etkinlik, beceri: b.ad, konu: b.konu, oran: b.oran30, deneme: b.d30 };
          if (b.d30 >= ZAYIF_EN_AZ && b.g30 / b.d30 < ZAYIF_ORAN) destek.push(oz);
          else if (b.d30 >= 10 && b.g30 / b.d30 >= 0.9) guclu.push(oz);
          liste.push(b);
        }
        d.beceriler = sirala(liste, b => [b.oran30 !== null ? b.oran30 : 101, -b.deneme]);
        d.oran = oran(d.dogru, d.deneme);
        d.sorular = sirala([...d.sorular.values()], q => -q.yanlis).slice(0, 8);
        for (const q of d.sorular) q.cevaplar = sirala([...q.cevaplar.entries()], x => -x[1]).slice(0, 3).map(x => x[0]);
      }
      destek = sirala(destek, x => x.oran); guclu = sirala(guclu, x => -x.oran);
      const son14 = {}; for (const a of sirala(Object.keys(gunler)).slice(-14)) { const g = gunler[a]; g.dakika = pyRound(g.sure / 60); delete g.sure; son14[a] = g; }
      return { dersler, destek: destek.slice(0, 12), guclu: guclu.slice(0, 12), gunler: son14, esik: { deneme: ZAYIF_EN_AZ, oran: pyRound(ZAYIF_ORAN * 100) },
        toplam: Object.values(dersler).reduce((s, d) => s + d.deneme, 0) };
    }

    /* ---------- yazılılar ---------- */
    yaziliIcerigi() { return this.ortam.yazili || { yazililar: [] }; }
    static soruAnahtari(s) { s = s || ""; const i = s.lastIndexOf("SORU:"); return i >= 0 ? s.slice(i + 5).trim() : s; }
    static soruKimligi(q) { return Motor.soruAnahtari(q.s) + (dogru(al(q, "c")) ? ` [${pyStr(q.c)}]` : ""); }
    static etkinlikAnahtarlari(e) {
      const k = x => kes(`${e.id}|${x}`, 200), t = al(e, "tur");
      if (t === "sikli" || t === "acik") return (al(e, "sorular") || []).map(q => k(Motor.soruKimligi(q)));
      if (t === "dogruyanlis") return (al(e, "ifadeler") || []).map(q => k(Motor.soruKimligi(q)));
      if (t === "siniflandir") return (al(e, "kartlar") || []).map(c => k(c.m));
      if (t === "eslestir") return (al(e, "ciftler") || []).map(c => k(c.sol));
      if (t === "sirala") return (al(e, "diziler") || []).map(q => k(q.s));
      return [];
    }
    static yaziliDersiMi(yDers, dersAdi) {
      const A = { fen: "fen", sosyal: "sosyal", turkce: "türkçe", din: "din", matematik: "matematik", ingilizce: "ingilizce", almanca: "almanca" };
      const a = A[yDers] || yDers, ad = pyStr(dersAdi || "").replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();
      return yDers === "ingilizce" ? ad === a : ad.startsWith(a);
    }
    yaziliTarihi(y) {
      const adlar = {}; for (const d of this.k.dersler) adlar[d.id] = al(d, "ad", "");
      const adaylar = this.k.etkinlikler.filter(e => !e.silindi && al(e, "tur") === "sinav" && dogru(al(e, "tarih")) && ["", "yazili"].includes(al(e, "sinav_turu", "yazili"))
        && Motor.yaziliDersiMi(y.ders, al(adlar, al(e, "ders_id"))));
      const icerik = al(y, "tarih") || "";
      let yakin;
      try {
        if (icerik) {
          P.tarih(icerik);
          const uzak = e => Math.abs(P.gunFarki(P.tarih(e.tarih), icerik));
          yakin = sirala(adaylar.filter(e => uzak(e) <= 21), uzak);
        } else {
          const b = this.suAn().gun;
          yakin = sirala(adaylar.filter(e => R.pyStrCmp(e.tarih, b) >= 0), e => e.tarih);
        }
      } catch (_) { return icerik; }
      return yakin.length ? yakin[0].tarih : icerik;
    }
    yaziliSinavlariniEkle() {
      if (this.veri.tohum.yazili_yok) return;            // web: Arın'a özel yazılı tarihleri yeni öğrenciye eklenmez
      const isaret = this.veri.tohum.yazili1 || (this.veri.tohum.yazili1 = {}), kol = this.k;
      for (const y of this.yaziliIcerigi().yazililar || []) {
        const tarih = al(y, "tarih");
        if (!tarih || al(isaret, y.ders) === tarih) continue;
        if (this.yaziliTarihi(y) !== tarih) { isaret[y.ders] = tarih; continue; }
        const ders = kol.dersler.find(d => !d.silindi && Motor.yaziliDersiMi(y.ders, al(d, "ad")) && al(d, "sinif", 5) === al(this.veri.ayarlar, "aktif_sinif", 5));
        const dersId = ders ? ders.id : "";
        const v = kol.etkinlikler.some(e => !e.silindi && al(e, "tur") === "sinav" && al(e, "tarih") === tarih && (!dersId || al(e, "ders_id") === dersId));
        if (!v) {
          const konular = (al(y, "ciktilar") || []).map(c => c.kod).join(", ");
          kol.etkinlikler.push(this.yeniKayit(this.kayitAlanlariniDogrula("etkinlikler", { tur: "sinav", sinav_turu: "yazili",
            baslik: `${y.ad} ${al(y, "yazili", "Yazılı")}`, tarih, ders_id: dersId,
            aciklama: kes(`${al(y, "bicim", "")}. ${al(y, "not", "")} Hazırlık: Ana Sayfa → Yazılılarım. Konular: ${konular}`, 1000) }), "veli"));
          this.gunlugeYaz("veli", `Yazılı takvime eklendi: ${y.ad} (${tarih})`, "bilgi");
        }
        isaret[y.ders] = tarih;
      }
    }
    odevListeleriniEkle() {
      const isaret = this.veri.tohum.odev_listeleri || (this.veri.tohum.odev_listeleri = []), kol = this.k;
      for (const liste of T.ODEV_LISTELERI) {
        if (isaret.includes(liste.anahtar)) continue;
        const sinif = al(this.veri.ayarlar, "aktif_sinif", 5);
        let eklenen = 0; const atlanan = [];
        for (const [dersAdi, teslim, baslik, kaynaklar, tur, sure, kontrol, aciklama] of liste.odevler) {
          const ders = kol.dersler.find(d => !d.silindi && al(d, "ad") === dersAdi && al(d, "sinif", 5) === sinif);
          if (!ders) { atlanan.push(dersAdi); continue; }
          const adlar = new Set(kaynaklar.map(k => k[0].toLowerCase()));
          if (kol.odevler.some(o => !o.silindi && al(o, "ders_id") === ders.id && al(o, "teslim") === teslim
            && (al(o, "baslik") === baslik || (al(o, "kaynaklar") || []).some(k => adlar.has(pyStr(al(k, "ad", "")).toLowerCase()))))) continue;
          const o = this.yeniKayit(this.kayitAlanlariniDogrula("odevler", { ders_id: ders.id, teslim, baslik, aciklama,
            kaynaklar: kaynaklar.map(([a, s]) => ({ ad: a, sayfa: s })), odev_turu: tur, sure, kontrol, bitti: false, ekler: [] }), "veli");
          kol.odevler.push(o); this.dersKaynaklariniOgren(o); eklenen += 1;
        }
        isaret.push(liste.anahtar);
        this.gunlugeYaz("veli", `${liste.ad}: ${eklenen} ödev eklendi${atlanan.length ? ` (ders bulunamadı: ${atlanan.join(", ")})` : ""}`, "ekle");
      }
    }
    yaziliOzeti() {
      const ic = this.yaziliIcerigi();
      if (!dogru(al(ic, "yazililar"))) return { yazililar: [] };
      const kayitlar = this.alistirmalariOku(150).filter(k => pyStr(al(k, "beceri", "")).startsWith("y1."));
      const simdiTs = this._yerel().ts, bugun = this.suAn().gun, sonuc = [];
      for (let y of ic.yazililar) {
        const ciktilar = []; let topSoru = 0, topHazir = 0;
        for (const c of y.ciktilar) {
          const bkod = "y1." + c.kod;
          const anahtarlar = new Set(c.etkinlikler.flatMap(e => Motor.etkinlikAnahtarlari(e)));
          const acikSorular = new Map();
          for (const e of c.etkinlikler) if (e.tur === "acik") for (const q of e.sorular) acikSorular.set(kes(`${e.id}|${Motor.soruKimligi(q)}`, 200), q);
          const sonDurum = new Map(), gunlerSet = new Set(), eksikSay = new Map(), yanlislar = new Map(), cevaplar = [];
          let deneme = 0, dg = 0, d30 = 0, g30 = 0, acikN = 0, acikOran = 0;
          for (const k of kayitlar) {
            if (al(k, "beceri") !== bkod) continue;
            deneme += 1; dg += +k.dogru; gunlerSet.add(k.zaman.slice(0, 10));
            if ((simdiTs - Date.parse(k.zaman) / 1000) / 86400 <= 30) { d30 += 1; g30 += +k.dogru; }
            sonDurum.set(al(k, "soru"), !!k.dogru);
            const q = acikSorular.get(al(k, "soru"));
            if (q !== undefined && al(k, "bicim") === "acik") {
              acikN += 1;
              const par = pyStr(al(k, "cevap", "0/1")).split("/");
              if (par.length === 2) { try { const a_ = pyInt(par[0]), b_ = pyInt(par[1]); acikOran += a_ / Math.max(1, b_); } catch (_) { /* Python ValueError */ } }
              for (const i of pyStr(al(k, "eksik") || "").split(",")) if (/^\d+$/.test(i.trim()) && pyInt(i) < q.noktalar.length) { const m = q.noktalar[pyInt(i)]; eksikSay.set(m, (eksikSay.get(m) || 0) + 1); }
              cevaplar.push({ soru: Motor.soruAnahtari(q.s), yazi: al(k, "yazi", ""), puan: al(k, "cevap", ""), zaman: k.zaman });
            } else if (!k.dogru && dogru(al(k, "soru"))) {
              const ix = k.soru.indexOf("|"), s_ = (ix >= 0 ? k.soru.slice(ix + 1) : k.soru).replace(/ \[[A-Za-z0-9:]+\]$/, " (çizimli)");
              yanlislar.set(s_, (yanlislar.get(s_) || 0) + 1);
            }
          }
          const hazir = anahtarlar.size ? [...anahtarlar].filter(a => sonDurum.get(a)).length / anahtarlar.size : 0;
          const nSoru = al(c, "soru") || 1;
          topSoru += nSoru; topHazir += nSoru * hazir;
          ciktilar.push({ kod: c.kod, ad: c.ad, simge: al(c, "simge", ""), soru: nSoru, hazir: pyRound(100 * hazir), deneme,
            oran: deneme ? pyRound(100 * dg / deneme) : null, oran30: d30 ? pyRound(100 * g30 / d30) : null, gun: gunlerSet.size,
            acik: { deneme: acikN, ort: acikN ? pyRound(100 * acikOran / acikN) : null,
              eksik: sirala([...eksikSay.entries()], x => -x[1]).slice(0, 5).map(([metin, sayi]) => ({ metin, sayi })),
              son: sirala(cevaplar, x => x.zaman, true).slice(0, 3) },
            yanlis: sirala([...yanlislar.entries()], x => -x[1]).slice(0, 5).map(([soru, sayi]) => ({ soru, sayi })) });
        }
        let kalan = null;
        y = Object.assign({}, y, { tarih: this.yaziliTarihi(y) });
        if (dogru(al(y, "tarih"))) { try { P.tarih(y.tarih); kalan = P.gunFarki(y.tarih, bugun); } catch (_) { /* geçersiz tarih */ } }
        sonuc.push({ ders: y.ders, ad: y.ad, simge: al(y, "simge", ""), yazili: al(y, "yazili", ""), tarih: al(y, "tarih", ""), kalan, bicim: al(y, "bicim", ""),
          hazir: topSoru ? pyRound(100 * topHazir / topSoru) : 0, deneme: ciktilar.reduce((s, c) => s + c.deneme, 0), ciktilar });
      }
      return { yazililar: sonuc };
    }

    /* ---------- Kelime Defterim ---------- */
    static kisaMetin(v, n) { return kes((dogru(v) ? pyStr(v) : "").replace(/\s+/g, " ").trim(), n); }
    kelimeAlanlari(kol, a) {
      const t = {}, km = Motor.kisaMetin;
      if (kol === "kelime_defterleri") {
        if ("ad" in a) { t.ad = km(a.ad, 40); if (!t.ad) hata("Defter adı boş olamaz"); }
        if ("dil" in a) t.dil = ["en", "de", "fr", "tr", "diger"].includes(a.dil) ? a.dil : "diger";
        if ("simge" in a) t.simge = km(a.simge, 8) || "📘";
        if ("renk" in a) t.renk = RENK_DESENI.test(dogru(a.renk) ? pyStr(a.renk) : "") ? a.renk : "#6366F1";
        if ("aciklama" in a) t.aciklama = km(a.aciklama, 160);
        if ("sira" in a) t.sira = tamMi(a.sira) ? a.sira : 0;
        return t;
      }
      if ("defter_id" in a) { t.defter_id = dogru(a.defter_id) ? pyStr(a.defter_id) : ""; if (!KIMLIK_DESENI.test(t.defter_id)) hata("Defter kimliği hatalı"); }
      for (const [x, n] of [["kelime", 60], ["anlam", 80], ["ornek", 200], ["emoji", 8], ["grup", 40]]) if (x in a) t[x] = km(a[x], n);
      for (const x of ["kelime", "anlam"]) if (x in t && !t[x]) hata("Kelime ve anlamı boş olamaz");
      if ("artikel" in a) t.artikel = ["der", "die", "das"].includes(a.artikel) ? a.artikel : "";
      return t;
    }
    _kelimeSatiri(d, grup, s) {
      return this.yeniKayit(this.kelimeAlanlari("kelimeler", { defter_id: d.id, kelime: s[0], anlam: s[1], emoji: s.length > 2 ? s[2] : "",
        artikel: s.length > 3 ? s[3] : "", ornek: s.length > 4 ? s[4] : "", grup }), "veli");
    }
    kelimeDefterleriniTohumla() {
      const kol = this.k, tohum = this.veri.tohum;
      const eklenen = new Set(tohum.kelime_defterleri || []);
      if (dogru(tohum.kelime) && !eklenen.size) for (const h of T.HAZIR_DEFTERLER) if (h.ilk) eklenen.add(h.anahtar);
      const ilkKurulum = !dogru(tohum.kelime) && !kol.kelime_defterleri.some(d => !d.silindi);
      let sira = kol.kelime_defterleri.filter(d => !d.silindi).length;
      for (const h of T.HAZIR_DEFTERLER) {
        if (eklenen.has(h.anahtar) || (h.ilk && !ilkKurulum)) { eklenen.add(h.anahtar); continue; }
        const d = this.yeniKayit(this.kelimeAlanlari("kelime_defterleri", { ad: h.ad, dil: h.dil, simge: h.simge, renk: h.renk, aciklama: h.aciklama, sira }), "veli");
        sira += 1; kol.kelime_defterleri.push(d);
        for (const [grup, satirlar] of Object.entries(h.gruplar)) for (const s of satirlar) kol.kelimeler.push(this._kelimeSatiri(d, grup, s));
        eklenen.add(h.anahtar);
        if (!ilkKurulum) this.gunlugeYaz("veli", `Hazır kelime defteri eklendi: ${h.ad}`, "ekle");
      }
      for (const h of T.HAZIR_EKLER || []) {
        if (eklenen.has(h.anahtar)) continue;
        const d = kol.kelime_defterleri.find(x => !x.silindi && al(x, "ad") === h.defter);
        if (d) {
          const v = new Set(kol.kelimeler.filter(k => al(k, "defter_id") === d.id && !k.silindi).map(k => k.kelime.toLowerCase()));
          for (const [grup, satirlar] of Object.entries(h.gruplar)) for (const s of satirlar) if (!v.has(s[0].toLowerCase())) kol.kelimeler.push(this._kelimeSatiri(d, grup, s));
          this.gunlugeYaz("veli", `${d.ad} defterine yeni kelimeler eklendi`, "ekle");
        }
        eklenen.add(h.anahtar);
      }
      tohum.kelime = true;
      tohum.kelime_defterleri = sirala([...eklenen]);
    }
    kelimeTopluEkle(defterId, satirlar, kaynak) {
      const kol = this.k;
      if (!kol.kelime_defterleri.some(d => d.id === defterId && !d.silindi)) hata("Defter bulunamadı");
      if (!Array.isArray(satirlar) || !satirlar.length) hata("Kelime listesi boş");
      const mevcut = new Map();
      for (const k of kol.kelimeler) if (al(k, "defter_id") === defterId && !k.silindi) mevcut.set(k.kelime.toLowerCase(), k);
      let eklenen = 0, guncellenen = 0;
      for (const ham of satirlar.slice(0, 500)) {
        if (!ham || typeof ham !== "object" || Array.isArray(ham)) continue;
        let a;
        try {
          const g = {}; for (const x of ["kelime", "anlam", "artikel", "emoji", "grup", "ornek"]) g[x] = al(ham, x, "");
          g.defter_id = defterId; a = this.kelimeAlanlari("kelimeler", g);
        } catch (e) { if (e instanceof DegerHatasi) continue; throw e; }
        const v = mevcut.get(a.kelime.toLowerCase());
        if (v) {
          const deg = Object.entries(a).filter(([x, val]) => dogru(val) && !esit(al(v, x), val));
          if (deg.length) { for (const [x, val] of deg) v[x] = val; v.degisme = this.simdi(); guncellenen += 1; }
        } else { const k = this.yeniKayit(a, kaynak); kol.kelimeler.push(k); mevcut.set(a.kelime.toLowerCase(), k); eklenen += 1; }
      }
      const d = kol.kelime_defterleri.find(d => d.id === defterId);
      this.gunlugeYaz(kaynak, `${d.ad} defterine ${eklenen} kelime eklendi${guncellenen ? `, ${guncellenen} güncellendi` : ""}`, "ekle");
      return { eklenen, guncellenen };
    }
    kelimeOzeti(ayrinti = true) {
      const kol = this.k;
      const defterler = sirala(kol.kelime_defterleri.filter(d => !d.silindi), d => [al(d, "sira", 0), al(d, "olusturma", "")]);
      const acik = new Set(defterler.map(d => d.id));
      const kelimeler = kol.kelimeler.filter(k => !k.silindi && acik.has(al(k, "defter_id")));
      const durum = new Map();
      for (const r of this.alistirmalariOku(365)) {
        const kid = al(r, "kelime");
        if (!dogru(kid)) continue;
        if (!durum.has(kid)) durum.set(kid, { sonuc: [], deneme: 0, dogru: 0, son: "", modlar: new Map(), yanlis: new Map() });
        const s = durum.get(kid);
        s.sonuc.push(!!r.dogru); s.deneme += 1; s.dogru += +!!r.dogru; s.son = r.zaman;
        const mk = al(r, "bicim") || "?"; if (!s.modlar.has(mk)) s.modlar.set(mk, [0, 0]);
        const m = s.modlar.get(mk); m[0] += 1; m[1] += +!!r.dogru;
        if (!r.dogru && dogru(al(r, "cevap"))) s.yanlis.set(r.cevap, (s.yanlis.get(r.cevap) || 0) + 1);
      }
      const kutu = l => l.reduce((k, d) => (d ? Math.min(5, k + 1) : 1), 0);
      const sade = {}; for (const [kid, s] of durum) sade[kid] = kutu(s.sonuc);
      if (!ayrinti) return { kutu: sade };
      const ozet = [];
      for (const d of defterler) {
        const ks = kelimeler.filter(k => k.defter_id === d.id), satir = [];
        for (const k of ks) {
          const s = durum.get(k.id), ku = al(sade, k.id, 0);
          const modlar = {}; if (s) for (const [m, v] of s.modlar) modlar[m] = pyRound(100 * v[1] / v[0]);
          satir.push({ id: k.id, kelime: k.kelime, anlam: k.anlam, grup: al(k, "grup", ""), kutu: ku, deneme: s ? s.deneme : 0,
            oran: s ? pyRound(100 * s.dogru / s.deneme) : null, son: s ? s.son : "", modlar,
            yanlis_cevap: s ? sirala([...s.yanlis.entries()], x => -x[1]).slice(0, 3).map(x => x[0]) : [] });
        }
        const cal = satir.filter(x => x.deneme), td = cal.reduce((a, x) => a + x.deneme, 0);
        ozet.push({ id: d.id, ad: d.ad, simge: al(d, "simge", ""), dil: al(d, "dil", ""), kelime: ks.length,
          ogrendi: satir.filter(x => x.kutu >= 4).length, calisiyor: cal.filter(x => x.kutu < 4).length, yeni: satir.filter(x => !x.deneme).length,
          deneme: satir.reduce((a, x) => a + x.deneme, 0), oran: cal.length ? pyRound(100 * cal.reduce((a, x) => a + x.oran * x.deneme, 0) / td) : null,
          zor: sirala(cal.filter(x => x.deneme >= 3 && x.oran < 70), x => x.oran).slice(0, 10), kelimeler: satir });
      }
      return { defterler: ozet };
    }
    oyunGecmisi(oyun) {
      const sorular = {};
      for (const k of this.alistirmalariOku(90)) {
        if (al(k, "oyun") !== oyun && !(oyun === "carpim" && al(k, "arac") === "carpim")) continue;
        const s = sorular[k.soru] || (sorular[k.soru] = { d: 0, y: 0, son: [] });
        s.d += 1; s.y += +!k.dogru; s.son.push([k.dogru ? 1 : 0, al(k, "bicim", "")]); s.son = s.son.slice(-6);
      }
      return { sorular };
    }
    sinifAtla() {
      const eski = pyInt(al(this.veri.ayarlar, "aktif_sinif", 5)), yeni = Math.min(eski + 1, 12);
      if (yeni === eski) hata("Son sınıftasın");
      const d = this.k.dersler;
      for (const x of d.filter(x => !x.silindi && al(x, "sinif") === eski))
        d.push(this.yeniKayit({ ad: x.ad, kisa: al(x, "kisa", ""), renk: al(x, "renk", "#3B82F6"), sira: al(x, "sira", 0), sinif: yeni }, "veli"));
      this.veri.ayarlar.aktif_sinif = yeni;
      this.veri.ders_programi = { saatler: al(this.veri.ders_programi, "saatler", []), hucreler: {}, degisme: this.simdi() };
      this.gunlugeYaz("veli", `Yeni sınıfa geçildi: ${yeni}. sınıf (${eski}. sınıf defterleri arşivde)`, "ayar");
      return yeni;
    }
    veriDisari() {
      const s = {};
      for (const [k, v] of Object.entries(this.veri)) if (!["guvenlik", "esitleme", "plan", "alistirmalar", "gunluk"].includes(k)) s[k] = v;
      return s;
    }

    /* ---------- /api yönlendiricisi (motor.py Isleyici._api) ----------
       oturum: { veli: bool, ad } — rol ve yetki giriş katmanından gelir. Dönen: { durum, govde }.
       Hata olursa veri işlemden önceki haline döner (işlem bütün ya da hiç). */
    api(yontem, yol, govde, oturum = { veli: false, ad: null }) {
      this.oturum = { veli: !!oturum.veli, ad: oturum.veli ? (oturum.ad || null) : null, veliKayit: oturum.veli ? (oturum.veliKayit || null) : null };
      const yedek = yontem === "GET" ? null : JSON.stringify(this.veri);
      try {
        const [yolKismi, sorgu = ""] = String(yol).split("?");
        const parca = yolKismi.replace(/^\/+|\/+$/g, "").split("/");
        const q = new URLSearchParams(sorgu);
        let g = govde === undefined || govde === null ? {} : govde;
        if (yontem !== "GET" && (typeof g !== "object" || Array.isArray(g))) hata("JSON nesnesi bekleniyordu");
        const s = this._api(yontem, parca, g, q);
        if (s.durum >= 400 && yedek) this.veri = JSON.parse(yedek);
        return s;
      } catch (e) {
        if (yedek) this.veri = JSON.parse(yedek);
        if (e instanceof DegerHatasi) return { durum: 400, govde: { hata: e.message } };
        return { durum: 500, govde: { hata: "Motor hatası: " + (e && e.message) } };
      }
    }
    _api(yontem, parca, g, q) {
      const J = (durum, govde) => ({ durum, govde }), H = (d, m) => J(d, { hata: m });
      const veli = this.oturum.veli, kaynak = veli ? "veli" : "ogrenci";
      const VG = J(401, { hata: "Bu işlem için veli şifresi gerekli", kod: "veli_gerekli" });
      const ad = parca[0] || "";
      if (ad === "durum" && yontem === "GET") return J(200, { uygulama: "ÖğretmeniM", surum: this.ortam.surum || "web", zaman: this.simdi() });
      if (ad === "alistirma" && yontem === "POST") { this.alistirmaKaydet(g); return J(200, { tamam: true }); }
      if (ad === "alistirma" && yontem === "GET" && parca[1] === "agirlik") return J(200, this.zayifCarpimlar());
      if (ad === "oyun" && yontem === "GET" && parca.length === 3 && parca[2] === "gecmis") {
        if (!/^[a-z0-9_-]{1,30}$/.test(parca[1])) return H(400, "Geçersiz oyun");
        return J(200, this.oyunGecmisi(parca[1]));
      }
      if (ad === "gelisim" && yontem === "GET") return veli ? J(200, this.gelisimOzeti()) : VG;
      if (ad === "ders_kaynak_sil" && yontem === "POST") { if (!veli) return VG; return J(200, this.dersKaynakSil(pyStr(al(g, "ders_id", "")), al(g, "ad"), "veli")); }
      if (ad === "kelime" && yontem === "GET" && parca.length === 1) return J(200, this.kelimeOzeti(false));
      if (ad === "kelime" && yontem === "GET" && parca.length === 2 && parca[1] === "ozet") return veli ? J(200, this.kelimeOzeti()) : VG;
      if (ad === "kelime" && yontem === "POST" && parca.length === 2 && parca[1] === "toplu") { if (!veli) return VG; return J(200, this.kelimeTopluEkle(pyStr(al(g, "defter_id", "")), al(g, "kelimeler"), "veli")); }
      if (ad === "yazili" && yontem === "GET") return veli ? J(200, this.yaziliOzeti()) : VG;
      if (ad === "istatistik" && yontem === "GET") return veli ? J(200, this.istatistikOzeti()) : VG;
      if (ad === "sinif" && yontem === "POST" && parca[1] === "gec") { if (!veli) return VG; return J(200, { aktif_sinif: this.sinifAtla() }); }
      if (ad === "veri" && yontem === "GET") return J(200, this.veriDisari());
      if (ad === "gunluk" && yontem === "GET") return veli ? J(200, this.gunluguOku(500)) : VG;
      if ((ad === "profil" || ad === "ayarlar") && (yontem === "GET" || yontem === "PUT")) {
        if (yontem === "PUT") {
          if (!veli) return VG;
          const hedef = this.veri[ad], degisen = [];
          const tip = v => v === null ? "None" : typeof v === "boolean" ? "bool" : typeof v === "number" ? (Number.isInteger(v) ? "int" : "float")
            : typeof v === "string" ? "str" : Array.isArray(v) ? "list" : "dict";
          for (const [k, v] of Object.entries(g)) {
            if (!(k in hedef)) continue;
            const th = tip(hedef[k]), tv = tip(v);
            if ((tv === th || (th === "int" && tv === "bool")) && !esit(hedef[k], v)) { hedef[k] = v; degisen.push(k); }
          }
          if (degisen.length) this.gunlugeYaz(kaynak, `${ad === "profil" ? "Profil" : "Ayarlar"} güncellendi (${degisen.join(", ")})`, "ayar");
        }
        return J(200, this.veri[ad]);
      }
      if (ad === "plan") return this._planApi(yontem, parca.slice(1), g, J, H, VG);
      if (ad === "rapor" && yontem === "GET" && parca.length === 1) return veli ? J(200, this.raporUret(q.get("donem") || "hafta")) : VG;
      if (ad === "ders_programi" && (yontem === "GET" || yontem === "PUT")) {
        if (yontem === "PUT") {
          if (!veli) return VG;
          const eski = this.veri.ders_programi;
          this.veri.ders_programi = this.dersProgramiDogrula(g);
          this.programGunlugu(eski, this.veri.ders_programi, kaynak);
        }
        return J(200, this.veri.ders_programi);
      }
      if (ad === "baglanti" && yontem === "POST" && parca.length === 3 && parca[2] === "ac") {
        const k = this.k.baglantilar.find(b => b.id === parca[1] && !b.silindi);
        if (!k) return H(404, "Bağlantı bulunamadı");
        const adres = pyStr(al(k, "adres", ""));
        if (!/^https?:\/\//i.test(adres)) return H(400, "Adres http:// ya da https:// ile başlamalı");
        return J(200, { tamam: true, adres });             // web: adresi tarayıcı açar
      }
      if (ad === "k") return this._koleksiyon(yontem, parca.slice(1), g, J, H, VG);
      return H(404, "Bilinmeyen istek");
    }
    _planApi(yontem, parca, g, J, H, VG) {
      const alt = parca[0] || "", veli = this.oturum.veli, kaynak = veli ? "veli" : "ogrenci";
      if (yontem === "GET" && !alt) {
        const p = this.planUret(), b = p.bugun;
        p.gun_bilgisi = { [b]: al(this.p.gunler, b) || {} };
        p.ozel_gunler = this.p.ozel_gunler;
        p.bugun_yapilanlar = this.p.calisma.filter(c => al(c, "tarih") === b);
        if (veli) p.ozet = this.planOzeti();
        return J(200, p);
      }
      if (yontem === "PUT" && alt === "ayarlar") {
        if (!veli) return VG;
        this.planAyarlariniYaz(g, kaynak);
        return J(200, P.ayarlariTamamla(this.p.ayarlar));
      }
      if (yontem === "POST" && alt === "calisma") return J(200, { tamam: true });
      if (yontem === "POST" && alt === "islem") {
        if (al(g, "tur") === "sira" && !dogru(al(P.ayarlariTamamla(this.p.ayarlar), "arin_sira")) && !veli) return VG;
        return J(200, this.planIslemi(g, kaynak));
      }
      return H(404, "Bilinmeyen istek");
    }
    _koleksiyon(yontem, parca, g, J, H, VG) {
      if (!parca.length || !KOLEKSIYONLAR.includes(parca[0])) return H(404, "Bilinmeyen koleksiyon");
      const kol = parca[0], liste = this.k[kol], kimlik = parca.length > 1 ? parca[1] : null;
      const veli = this.oturum.veli, kaynak = veli ? "veli" : "ogrenci";
      if (yontem === "GET" && !kimlik) return J(200, liste.filter(k => !k.silindi));
      if (yontem !== "GET" && KORUMALI.has(kol) && !veli) return VG;
      if (kol === "muzikler" && yontem !== "GET" && (yontem !== "PUT" || !kimlik)) return H(405, "Müzik yalnız Müzik ekle penceresinden eklenir");
      if (yontem === "POST" && !kimlik) {
        g = Object.assign({}, g);
        for (const y of ["id", "olusturma", "degisme", "kaynak", "silindi"]) delete g[y];
        if (kol === "mesajlar") g = this.mesajHazirla(g, veli ? "veli" : "ogrenci", veli && this.oturum.veliKayit ? this.oturum.veliKayit : null);
        if (["odevler", "etkinlikler", "kelime_defterleri", "kelimeler"].includes(kol)) {
          g = this.kayitAlanlariniDogrula(kol, g);
          if (kol === "kelimeler" && !(dogru(al(g, "defter_id")) && dogru(al(g, "kelime")) && dogru(al(g, "anlam")))) return H(400, "Kelime, anlam ve defter gerekli");
          if (kol === "kelime_defterleri" && !dogru(al(g, "ad"))) return H(400, "Defter adı gerekli");
          if (!veli) delete g.puan;
        }
        const kayit = this.yeniKayit(g, kaynak);
        liste.push(kayit);
        if (kol === "odevler") this.dersKaynaklariniOgren(kayit, true);
        this.degisiklikGunlugu(kol, "ekle", null, kayit, kaynak);
        return J(201, kayit);
      }
      const kayit = liste.find(k => k.id === kimlik);
      if (!kayit || dogru(kayit.silindi)) return H(404, "Kayıt bulunamadı");
      if (yontem === "GET") return J(200, kayit);
      if (yontem === "PUT") {
        g = Object.assign({}, g);
        for (const y of ["id", "olusturma", "kaynak", "silindi"]) delete g[y];
        if (kol === "mesajlar") g = Object.fromEntries(Object.entries(g).filter(([a]) => MESAJ_DEGISEN.has(a)));
        if (kol === "muzikler") g = { ad: kes(pyStr(al(g, "ad", al(kayit, "ad", ""))).trim(), 120) || al(kayit, "ad", "Müzik") };
        if (["odevler", "etkinlikler", "kelime_defterleri", "kelimeler"].includes(kol)) g = this.kayitAlanlariniDogrula(kol, g);
        if (!veli) {
          delete g.puan;
          if (al(kayit, "kaynak") === "veli" && kol in VELI_KAYIT_ALANLARI) {
            const izinli = VELI_KAYIT_ALANLARI[kol];
            if (Object.keys(g).some(a => !izinli.has(a) && !esit(g[a], al(kayit, a)))) return J(401, { hata: "Bu kaydı velin girdi; yalnız veli değiştirebilir", kod: "veli_gerekli" });
            g = Object.fromEntries(Object.entries(g).filter(([a]) => izinli.has(a)));
          }
        }
        if (kol === "dersler" && "kaynaklar" in g) g.kaynaklar = this.dersKaynakListesi(g.kaynaklar);
        const eski = Object.assign({}, kayit);
        Object.assign(kayit, g);
        if (esit(kayit, eski)) return J(200, kayit);
        if (kol === "odevler") this.dersKaynaklariniOgren(kayit);
        kayit.degisme = this.simdi();
        this.degisiklikGunlugu(kol, "degistir", eski, kayit, kaynak);
        return J(200, kayit);
      }
      if (yontem === "DELETE") {
        if (al(kayit, "kaynak") === "veli" && kol in VELI_KAYIT_ALANLARI && !veli) return J(401, { hata: "Bu kaydı velin girdi; yalnız veli silebilir", kod: "veli_gerekli" });
        kayit.silindi = true; kayit.degisme = this.simdi();
        this.degisiklikGunlugu(kol, "sil", kayit, null, kaynak);
        return J(200, { tamam: true });
      }
      return H(405, "Desteklenmeyen istek");
    }
  }

  return { Motor, varsayilanVeri, DegerHatasi, pyRound, pyInt, kopya, esit };
})();
if (typeof module !== "undefined") module.exports = Cekirdek;

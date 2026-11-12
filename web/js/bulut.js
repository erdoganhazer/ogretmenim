/* ÖğretmeniM web — Firebase: giriş, hesaplar (yönetici) ve öğrenci verisinin eşitlenmesi.
   Yetki Firestore kurallarında (firestore.rules) denetlenir; buradaki denetimler kullanıcıya erken uyarı içindir. */
"use strict";

const Bulut = (() => {
  const ALAN = "ogretmenim.example.com";             // kullanıcı adları Firebase'de bu sahte e-posta alanıyla tutulur (posta gitmez)
  let app = null, auth = null, db = null;
  const D = (...p) => FB.doc(db, ...p), C = (...p) => FB.collection(db, ...p);

  function baslat() {
    if (app) return;
    app = FB.initializeApp(FIREBASE_AYAR);
    auth = FB.getAuth(app);
    db = FB.initializeFirestore(app, { localCache: FB.persistentLocalCache({ tabManager: FB.persistentMultipleTabManager() }) });
  }
  const yeniId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).replace(/-/g, "").slice(0, 32).padEnd(32, "0");
  /* Kullanıcı adı: küçük harf, Türkçe harfler sadeleşir (Arın → arin) */
  function kullaniciAdi(s) {
    const t = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u", Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u" };
    return String(s || "").trim().replace(/[çğıİöşüÇĞÖŞÜ]/g, h => t[h]).toLowerCase().replace(/\s+/g, ".");
  }
  const adUygun = a => /^[a-z0-9._-]{3,30}$/.test(a);
  const eposta = a => `${a}.${Date.now().toString(36)}@${ALAN}`;
  function hataMetni(e) {
    const k = (e && e.code) || "";
    if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(k)) return "Kullanıcı adı ya da şifre yanlış";
    if (/too-many-requests/.test(k)) return "Çok fazla deneme oldu; birkaç dakika sonra yeniden dene";
    if (/operation-not-allowed|password-login-disabled|configuration-not-found/.test(k + " " + ((e && e.message) || ""))) return "Firebase'de E-posta/Şifre girişi kapalı: Authentication › Sign-in method › Email/Password'ü aç";
    if (/unauthorized-domain/.test(k)) return "Bu alan adı Firebase'de yetkili değil: Authentication › Settings › Authorized domains'e ekle";
    if (/network|unavailable/.test(k)) return (typeof navigator !== "undefined" && navigator.onLine === false) ? "İnternet bağlantısı yok" : "Sunucuya ulaşılamadı (" + (k || "ağ") + ")";
    if (/weak-password/.test(k)) return "Şifre en az 6 karakter olmalı";
    if (/permission-denied/.test(k)) return "Bu işlem için yetkin yok";
    return ((e && e.message) || "Bir sorun oluştu") + (k ? " (" + k + ")" : "");
  }

  /* ---------- giriş ---------- */
  async function kimim() {
    const u = auth.currentUser;
    if (!u) return null;
    const e = await FB.getDoc(D("uidler", u.uid));
    if (!e.exists()) return null;
    const k = await FB.getDoc(D("kisiler", e.data().kisi));
    if (!k.exists()) return null;
    const kisi = Object.assign({ id: k.id }, k.data());
    if (!kisi.aktif) { await FB.signOut(auth); throw new Error("Bu hesap kapatılmış. Yöneticiye sor."); }
    return kisi;
  }
  function oturumuBekle() {
    baslat();
    return new Promise(coz => { const kapat = FB.onAuthStateChanged(auth, u => { kapat(); coz(u); }); });
  }
  async function girisYap(ad, sifre) {
    baslat();
    ad = kullaniciAdi(ad);
    try {
      const g = await FB.getDoc(D("girisler", ad));
      if (!g.exists()) throw Object.assign(new Error(), { code: "invalid-credential" });
      await FB.signInWithEmailAndPassword(auth, g.data().eposta, sifre);
      const k = await kimim();
      if (!k) { await FB.signOut(auth); throw new Error("Bu hesap henüz hazır değil. Yöneticiye sor."); }
      return k;
    } catch (e) { throw new Error(hataMetni(e)); }
  }
  async function cikisYap() { await FB.signOut(auth); }
  async function kurulumVarMi() {
    baslat();
    try { return (await FB.getDoc(D("sistem", "kurulum"))).exists(); } catch (_) { return true; }
  }
  /* Hiç yönetici yokken ilk hesabı yönetici olarak açar */
  async function ilkKurulum({ ad, kullanici, sifre }) {
    baslat();
    kullanici = kullaniciAdi(kullanici);
    if (!adUygun(kullanici)) throw new Error("Kullanıcı adı 3–30 harf/rakam olmalı");
    try {
      const posta = eposta(kullanici);
      const c = await FB.createUserWithEmailAndPassword(auth, posta, sifre);
      const kid = yeniId(), b = FB.writeBatch(db);
      b.set(D("sistem", "kurulum"), { yonetici_uid: c.user.uid, yonetici_kisi: kid, zaman: new Date().toISOString() });
      b.set(D("uidler", c.user.uid), { kisi: kid });
      b.set(D("kisiler", kid), { ad: ad.trim() || kullanici, kullanici_adi: kullanici, rol: "yonetici", aktif: true, ogrenciler: [], uid: c.user.uid, eposta: posta,
        aile: "aile-" + kid.slice(0, 8) });                                  // ileride aile/okul ayrımı için
      await b.commit();
      await FB.setDoc(D("girisler", kullanici), { eposta: posta });
      return await kimim();
    } catch (e) { throw new Error(hataMetni(e)); }
  }
  async function sifremiDegistir(eski, yeni) {
    try {
      const u = auth.currentUser;
      await FB.reauthenticateWithCredential(u, FB.EmailAuthProvider.credential(u.email, eski));
      await FB.updatePassword(u, yeni);
    } catch (e) { throw new Error(hataMetni(e)); }
  }

  /* ---------- hesaplar (yönetici) ---------- */
  /* Başka biri için Firebase hesabı açmak yöneticinin oturumunu bozmasın diye ikinci bir uygulama örneği kullanılır */
  async function hesapOlustur(posta, sifre) {
    const ikinci = FB.initializeApp(FIREBASE_AYAR, "ikinci-" + Date.now());
    try {
      const a = FB.getAuth(ikinci);
      const c = await FB.createUserWithEmailAndPassword(a, posta, sifre);
      await FB.signOut(a);
      return c.user.uid;
    } finally { await FB.deleteApp(ikinci); }
  }
  async function hesaplar() {
    const s = await FB.getDocs(C("kisiler"));
    return s.docs.map(d => Object.assign({ id: d.id }, d.data()));
  }
  /* rol: ogrenci | veli | yonetici. Öğrenci açılınca veri belgesi de açılır ve yönetici ona veli olarak atanır. */
  async function hesapAc(ben, { ad, kullanici, sifre, rol, ogrenciler = [] }) {
    kullanici = kullaniciAdi(kullanici);
    if (!adUygun(kullanici)) throw new Error("Kullanıcı adı 3–30 harf/rakam olmalı (boşluksuz)");
    if (!["ogrenci", "veli", "yonetici"].includes(rol)) throw new Error("Rol seçilmedi");
    try {
      if ((await FB.getDoc(D("girisler", kullanici))).exists()) throw new Error("Bu kullanıcı adı alınmış");
      const posta = eposta(kullanici), uid = await hesapOlustur(posta, sifre), kid = yeniId(), b = FB.writeBatch(db);
      b.set(D("kisiler", kid), { ad: ad.trim() || kullanici, kullanici_adi: kullanici, rol, aktif: true, ogrenciler: rol === "ogrenci" ? [] : ogrenciler, uid, eposta: posta,
        aile: ben.aile || "aile-" + ben.id.slice(0, 8) });
      b.set(D("uidler", uid), { kisi: kid });
      b.set(D("girisler", kullanici), { eposta: posta });
      if (rol === "ogrenci") {
        b.set(D("ogrenciler", kid), Object.assign(ogrenciBelgesi(ad), { aile: ben.aile || "aile-" + ben.id.slice(0, 8) }));
        b.update(D("kisiler", ben.id), { ogrenciler: FB.arrayUnion(kid) });
      }
      await b.commit();
      return kid;
    } catch (e) { throw new Error(hataMetni(e)); }
  }
  /* Yeni öğrencinin ana belgesi. Arın'a özel hazır ödev listeleri ve yazılı tarihleri yeni öğrenciye eklenmez. */
  function ogrenciBelgesi(ad) {
    const v = Cekirdek.varsayilanVeri();
    v.profil.ogrenci_adi = (ad || "").trim().split(/\s+/)[0] || "";
    v.tohum.odev_listeleri = TOHUM.ODEV_LISTELERI.map(l => l.anahtar);
    v.tohum.yazili_yok = true;
    return { sema: v.sema, profil: v.profil, ayarlar: v.ayarlar, ders_programi: v.ders_programi, tohum: v.tohum };
  }
  async function hesapGuncelle(kid, alanlar) {
    const izinli = {};
    for (const a of ["ad", "aktif", "rol", "ogrenciler"]) if (a in alanlar) izinli[a] = alanlar[a];
    try { await FB.updateDoc(D("kisiler", kid), izinli); } catch (e) { throw new Error(hataMetni(e)); }
  }
  /* Şifre sıfırlama: Firebase'in ücretsiz planında başkasının şifresi değiştirilemediği için kişiye yeni bir giriş hesabı açılır,
     eski giriş hesabının bağı kesilir. Kişinin verisi aynı kalır. */
  async function sifreYenile(kisi, yeniSifre) {
    try {
      const posta = eposta(kisi.kullanici_adi), uid = await hesapOlustur(posta, yeniSifre), b = FB.writeBatch(db);
      if (kisi.uid) b.delete(D("uidler", kisi.uid));
      b.set(D("uidler", uid), { kisi: kisi.id });
      b.update(D("kisiler", kisi.id), { uid, eposta: posta });
      b.set(D("girisler", kisi.kullanici_adi), { eposta: posta });
      await b.commit();
    } catch (e) { throw new Error(hataMetni(e)); }
  }


  /* ---------- veli: "haberim var", içerik paketleri, bildirim cihazları ---------- */
  const bugunStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  async function bilinenler(oid) {
    const s = await FB.getDoc(D("ogrenciler", oid, "veli", "bilinen"));
    return s.exists() ? ((s.data().gunler || {})[bugunStr()] || []) : [];
  }
  async function haberimVar(oid, anahtar) {
    try { await FB.setDoc(D("ogrenciler", oid, "veli", "bilinen"), { gunler: { [bugunStr()]: FB.arrayUnion(anahtar) } }, { merge: true }); }
    catch (e) { throw new Error(hataMetni(e)); }
  }
  async function icerikGetir(oid) {
    const s = await FB.getDoc(D("ogrenciler", oid));
    return s.exists() ? ((s.data().icerik || {}).paketler || []) : [];
  }
  async function icerikAta(oid, paketler) {
    try { await FB.setDoc(D("ogrenciler", oid), { icerik: { paketler } }, { merge: true }); } catch (e) { throw new Error(hataMetni(e)); }
  }
  /* Bildirim: her veli kendi cihazlarını ve tercihlerini kendi kaydının altında tutar (kisiler/{ben}/...) */
  async function bildirimAyarOku(kid) {
    const s = await FB.getDoc(D("kisiler", kid, "ayar", "bildirim"));
    return s.exists() ? s.data() : null;
  }
  async function bildirimAyarYaz(kid, ayar) {
    try { await FB.setDoc(D("kisiler", kid, "ayar", "bildirim"), ayar, { merge: true }); } catch (e) { throw new Error(hataMetni(e)); }
  }
  async function cihazlar(kid) {
    const s = await FB.getDocs(C("kisiler", kid, "cihazlar"));
    return s.docs.map(d => Object.assign({ id: d.id }, d.data()));
  }
  async function cihazYaz(kid, cid, veri) {
    try { await FB.setDoc(D("kisiler", kid, "cihazlar", cid), veri, { merge: true }); } catch (e) { throw new Error(hataMetni(e)); }
  }
  async function bildirimTokeni(vapid) {
    if (!FB.messagingDestekli || !(await FB.messagingDestekli())) throw new Error("Bu tarayıcı bildirim desteklemiyor");
    const kayit = await navigator.serviceWorker.ready;
    return FB.getToken(FB.getMessaging(app), { vapidKey: vapid, serviceWorkerRegistration: kayit });
  }

  /* ---------- öğrenci verisinin eşitlenmesi ----------
     Motor tek veri nesnesiyle çalışır; her istekten sonra değişen belgeler toplu yazılır, başka cihazdan gelen değişiklikler
     anında veriye işlenir. Firestore'un yerel önbelleği sayesinde internetsiz de çalışır, bağlantı gelince gönderir. */
  class Esitleyici {
    constructor(oid, oturum, ortam) {
      this.oid = oid; this.oturum = oturum; this.ortam = ortam;
      this.harita = new Map(); this.eklemeli = { alistirmalar: new Map(), gunluk: new Map() };
      this.yerelGunluk = []; this.motor = null; this.kapatlar = []; this.dinleyen = null;
    }
    yol(p) { return p ? D("ogrenciler", this.oid, ...p.split("/")) : D("ogrenciler", this.oid); }
    async yukle() {
      const veli = this.oturum.veli, bekle = [];
      const dinle = (ref, isle) => bekle.push(new Promise((coz, red) => {
        let ilk = true;
        this.kapatlar.push(FB.onSnapshot(ref, s => { isle(s); if (ilk) { ilk = false; coz(); } else this._degisti(); },
          e => { if (ilk) red(e); else console.error(e); }));
      }));
      dinle(this.yol(""), s => { if (s.exists()) this.harita.set("", s.data()); });
      dinle(this.yol("plan/ayarlar"), s => { if (s.exists()) this.harita.set("plan/ayarlar", s.data()); else this.harita.delete("plan/ayarlar"); });
      for (const kol of [...Parcala.KAYIT_KOLLARI, "plan_gun", ...(veli ? [Parcala.NOT_KOL] : [])]) dinle(C("ogrenciler", this.oid, kol), s => {
        for (const d of s.docChanges()) { const p = `${kol}/${d.doc.id}`; if (d.type === "removed") this.harita.delete(p); else this.harita.set(p, d.doc.data()); }
      });
      for (const a of veli ? ["alistirmalar", "gunluk"] : ["alistirmalar"]) dinle(C("ogrenciler", this.oid, a), s => {
        for (const d of s.docChanges()) { if (d.type === "removed") this.eklemeli[a].delete(d.doc.id); else this.eklemeli[a].set(d.doc.id, d.doc.data().kayitlar || []); }
      });
      await Promise.all(bekle);
      if (!this.harita.has("")) throw new Error("Öğrencinin verisi bulunamadı");
      this._kur();
      if (veli) { this.motor.oturum = { veli: true, ad: this.oturum.ad }; this.motor.tohumla(); this.kaydet(); }
      return this.motor;
    }
    _duz(a) { return [...this.eklemeli[a].entries()].sort((x, y) => (x[0] < y[0] ? -1 : 1)).flatMap(x => x[1]); }
    _kur() {
      const veri = Parcala.birlestir(this.harita, { alistirmalar: this._duz("alistirmalar"), gunluk: this.oturum.veli ? this._duz("gunluk") : this.yerelGunluk });
      this.motor = new Cekirdek.Motor(veri, this.ortam);
      this.sonBelge = new Map([...Parcala.belgeler(this.motor.veri)].map(([p, d]) => [p, JSON.stringify(d)]));
      this.sayac = { alistirmalar: this.motor.veri.alistirmalar.length, gunluk: this.motor.veri.gunluk.length };
    }
    _degisti() {
      clearTimeout(this._zaman);
      this._zaman = setTimeout(() => { this._kur(); if (this.dinleyen) this.dinleyen(); }, 300);
    }
    istek(yontem, yol, govde) {
      const s = this.motor.api(yontem, yol, govde, this.oturum);
      if (s.durum < 400) this.kaydet();
      return s;
    }
    /* Değişen belgeleri yaz. Öğrenci oturumunda yazma izni olmayan belgeler hiç gönderilmez. */
    kaydet() {
      const veli = this.oturum.veli, yeni = Parcala.belgeler(this.motor.veri), yazilacak = [];
      const ogrenciYazar = p => !(p === "" || p === "plan/ayarlar" || /^(kelime_defterleri|kelimeler|baglantilar|sinav_notlari)\//.test(p));
      for (const [p, d] of yeni) {
        const j = JSON.stringify(d);
        if (this.sonBelge.get(p) !== j && (veli || ogrenciYazar(p))) yazilacak.push(["set", p, JSON.parse(j)]);
        this.sonBelge.set(p, j);
      }
      for (const p of [...this.sonBelge.keys()]) if (!yeni.has(p)) { if (p.startsWith("plan_gun/")) yazilacak.push(["sil", p]); this.sonBelge.delete(p); }
      for (const a of Parcala.EKLEMELI) {
        const liste = this.motor.veri[a], yeniler = liste.filter(k => !k._k);     // sunucuya gitmiş her kayıtta _k var
        this.sayac[a] = liste.length;
        if (a === "gunluk" && !veli) this.yerelGunluk.push(...yeniler);
        for (const [gun, l] of Parcala.gunlere(yeniler)) {
          l.forEach(k => { if (!k._k) k._k = yeniId().slice(0, 10); });          // aynı saniyedeki eş kayıtlar birleşmesin
          yazilacak.push(["ekle", `${a}/${gun}`, l]);
        }
      }
      for (let i = 0; i < yazilacak.length; i += 400) {
        const b = FB.writeBatch(db);
        for (const [tur, p, d] of yazilacak.slice(i, i + 400)) {
          if (tur === "set") p === "" ? b.set(this.yol(p), d, { merge: true }) : b.set(this.yol(p), d);   // ana belgede yöneticinin alanları (icerik) korunur
          else if (tur === "sil") b.delete(this.yol(p));
          else b.set(this.yol(p), { kayitlar: FB.arrayUnion(...d) }, { merge: true });
        }
        b.commit().catch(e => {
          console.error("Kayıt gönderilemedi", e);
          document.dispatchEvent(new CustomEvent("bulut-hata", { detail: hataMetni(e) }));
        });
      }
    }
    kapat() { this.kapatlar.forEach(f => f()); this.kapatlar = []; }
  }

  return { bilinenler, haberimVar, icerikGetir, icerikAta, bildirimAyarOku, bildirimAyarYaz, cihazlar, cihazYaz, bildirimTokeni, bugunStr,
    baslat, oturumuBekle, kimim, girisYap, cikisYap, kurulumVarMi, ilkKurulum, sifremiDegistir, hesaplar, hesapAc, hesapGuncelle, sifreYenile,
    kullaniciAdi, Esitleyici, ogrenciAdi: async kid => { try { const k = await FB.getDoc(D("kisiler", kid)); return k.exists() ? k.data().ad : "Öğrenci"; } catch (_) { return "Öğrenci"; } } };
})();

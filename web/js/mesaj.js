/* ÖğretmeniM — mesajlar
   - Aile sohbeti: veli ↔ öğrenci (okundu bilgisi, istekler), öğrencinin verisinde (mesajlar koleksiyonu).
   - Veliler arası özel sohbet: konusmalar/{a_b} (bulut.js); kişiler satırından seçilir.
   - Yönetici: "📣 Bildirim gönder" ile seçtiği kişilere bildirim.
   Her gönderimde alıcı için bildirim_kuyrugu'na kayıt düşer; GitHub'daki iş 5 dakikada bir gönderir. */
"use strict";

/* sohbet: "aile" (öğrenci + veliler, öğrencinin verisinde) ya da { kid, kisi } (veliler arası özel sohbet, konusmalar/)
   ya da "duyuru" (yalnız yönetici: seçtiği kişilere bildirim) */
const mesajDurumu = { tur: "mesaj", sonOkunmamis: 0, sohbet: "aile", kisiler: [], konusmalar: [], ozelMesajlar: [], kapat: [], sonOzel: 0 };
const HIZLI_CEVAPLAR = ["👍", "Tamam!", "Teşekkürler ❤️", "Birazdan yaparım", "Yardım eder misin?"];

function benKimim() { return veliAktif() ? "veli" : "ogrenci"; }
function aktifMesajlar() {
  return durum.veri.koleksiyonlar.mesajlar.filter(m => !m.silindi).sort((a, b) => a.olusturma.localeCompare(b.olusturma));
}
function okunmamislar() { const ben = benKimim(); return aktifMesajlar().filter(m => m.kime === ben && !m.okundu); }

const benKisi = () => (typeof girisKisi !== "undefined" && girisKisi) || null;
function ozelOkunmamis(k) {
  const ben = benKisi();
  return !!(ben && k.son && k.son.kimden !== ben.id && (!k.okunan || !k.okunan[ben.id] || k.okunan[ben.id] < k.son.zaman));
}
function mesajRozetiCiz() {
  const ozel = mesajDurumu.konusmalar.filter(ozelOkunmamis).length;
  const n = okunmamislar().length + ozel;
  const r = $("#mesaj-sayi");
  r.hidden = !n;
  r.textContent = n;
  $("#mesaj-ac").classList.toggle("yeni", n > 0);
  // Yeni mesaj geldiyse haber ver (pencere kapalıyken)
  if (n > mesajDurumu.sonOkunmamis && !$("#mesaj-pencere").open && ozel > mesajDurumu.sonOzel) {
    const k = mesajDurumu.konusmalar.filter(ozelOkunmamis).sort((a, b) => (a.son.zaman < b.son.zaman ? 1 : -1))[0];
    const kisi = mesajDurumu.kisiler.find(x => x.id === k.son.kimden);
    bildir(`💬 ${(kisi && kisi.ad) || "Mesaj"}: ${String(k.son.metin).slice(0, 60)}`);
  } else if (n > mesajDurumu.sonOkunmamis && !$("#mesaj-pencere").open && okunmamislar().length) {
    const son = okunmamislar().slice(-1)[0];
    const kimden = son.kimden === "veli" ? (son.veli_adi || "Velin") : (durum.veri.profil.ogrenci_adi || "Öğrenci");
    bildir(`💬 ${kimden}: ${son.metin.slice(0, 60)}`);
  }
  mesajDurumu.sonOkunmamis = n; mesajDurumu.sonOzel = ozel;
  if ($("#mesaj-pencere").open) kisilerCiz();
}

function saatYazisi(z) {
  const t = new Date(z), bugun = new Date().toDateString() === t.toDateString();
  return (bugun ? "" : `${t.getDate()} ${AYLAR[t.getMonth()].slice(0, 3)} `) + `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}

function ozelMesajlariCiz() {
  const kap = $("#mesaj-listesi"), ben = benKisi(), diger = mesajDurumu.sohbet.kisi;
  const liste = mesajDurumu.ozelMesajlar.slice(-150);
  kap.innerHTML = liste.length ? liste.map(m => {
    const benim = m.kimden === ben.id;
    return `<div class="mesaj${benim ? " benim" : ""}">${benim ? "" : `<div class="mesaj-kim">${esc(diger.ad)}</div>`}
      <div class="mesaj-balon"><div class="mesaj-metin">${esc(m.metin).replace(/\n/g, "<br>")}</div>
        <div class="mesaj-alt"><span class="mesaj-saat">${saatYazisi(m.zaman)}</span></div></div></div>`;
  }).join("") : `<div class="mesaj-bos">${esc(diger.ad)} ile henüz mesajın yok. İlk mesajı yaz; ona bildirim gider.</div>`;
  kap.scrollTop = kap.scrollHeight;
}
function mesajlariCiz() {
  if (mesajDurumu.sohbet === "duyuru") return;
  if (mesajDurumu.sohbet !== "aile") return ozelMesajlariCiz();
  const kap = $("#mesaj-listesi");
  const ben = benKimim();
  const liste = aktifMesajlar().slice(-150);
  const ogrenci = durum.veri.profil.ogrenci_adi || "Öğrenci";
  kap.innerHTML = liste.length ? liste.map(m => {
    const benim = m.kimden === ben;
    const kimden = m.kimden === "veli" ? (m.veli_adi || "Veli") : ogrenci;
    const durumu = benim ? (m.okundu ? `<span class="okundu" title="Okundu ${m.okunma_zamani ? saatYazisi(m.okunma_zamani) : ""}">✓✓</span>` : `<span class="gonderildi" title="Gönderildi">✓</span>`) : "";
    const istek = m.tur === "istek" ? `<span class="istek-rozet">🙋 İstek</span>` : "";
    const tamam = m.tur === "istek" ? (m.tamam ? `<span class="istek-tamam">✅ Tamamlandı</span>`
      : !benim ? `<button class="istek-dugme" data-tamam="${m.id}">✅ Tamam</button>` : `<span class="istek-bekliyor">bekliyor…</span>`) : "";
    return `<div class="mesaj${benim ? " benim" : ""}${m.tur === "istek" ? " istek" : ""}">
      ${benim ? "" : `<div class="mesaj-kim">${esc(kimden)}</div>`}
      <div class="mesaj-balon">${istek}<div class="mesaj-metin">${esc(m.metin).replace(/\n/g, "<br>")}</div>
        <div class="mesaj-alt">${tamam}<span class="mesaj-saat">${saatYazisi(m.olusturma)}</span>${durumu}</div></div></div>`;
  }).join("") : `<div class="mesaj-bos">Henüz mesaj yok. ${ben === "ogrenci" ? "Annene ya da babana bir şey söylemek istersen buraya yaz! 😊" : "Öğrencine bir mesaj yaz."}</div>`;
  kap.scrollTop = kap.scrollHeight;
}

async function okunduIsaretle() {
  const simdiZ = new Date().toISOString();
  for (const m of okunmamislar()) {
    try { Object.assign(m, await api("PUT", "k/mesajlar/" + m.id, { okundu: true, okunma_zamani: simdiZ })); } catch (_) { /* sonra tekrar denenir */ }
  }
  mesajRozetiCiz();
}

/* ---------- kişiler satırı: aile sohbeti, öbür veliler, (yönetici) bildirim gönder ---------- */
function kisilerCiz() {
  const kap = $("#mesaj-kisiler"), ben = benKisi();
  const ozeller = veliAktif() ? mesajDurumu.kisiler.filter(k => ["veli", "yonetici"].includes(k.rol)) : [];
  const yonetici = ben && ben.rol === "yonetici" && veliAktif();
  kap.hidden = !ozeller.length && !yonetici;
  if (kap.hidden) return;
  const secili = mesajDurumu.sohbet, ogr = durum.veri.profil.ogrenci_adi || "Öğrenci";
  const nokta = on => (on ? `<i class="mk-nokta" aria-label="okunmamış"></i>` : "");
  const konusma = k => mesajDurumu.konusmalar.find(x => x.id === Bulut.konusmaKimligi(ben.id, k.id));
  kap.innerHTML = `<button type="button" class="mk${secili === "aile" ? " aktif" : ""}" data-sohbet="aile">🎒 ${esc(ogr)} (aile)${nokta(okunmamislar().length)}</button>`
    + ozeller.map(k => { const kon = konusma(k); return `<button type="button" class="mk${secili.kisi && secili.kisi.id === k.id ? " aktif" : ""}" data-sohbet="${k.id}">👤 ${esc(k.ad)}${nokta(kon && ozelOkunmamis(kon))}</button>`; }).join("")
    + (yonetici ? `<button type="button" class="mk mk-duyuru${secili === "duyuru" ? " aktif" : ""}" data-sohbet="duyuru">📣 Bildirim gönder</button>` : "");
}
function sohbetSec(ne) {
  const ben = benKisi();
  mesajDurumu.kapat.forEach(f => f()); mesajDurumu.kapat = []; mesajDurumu.ozelMesajlar = [];
  const ozel = ne !== "aile" && ne !== "duyuru";
  mesajDurumu.sohbet = ozel ? { kid: Bulut.konusmaKimligi(ben.id, ne), kisi: mesajDurumu.kisiler.find(k => k.id === ne) } : ne;
  $("#duyuru-form").hidden = ne !== "duyuru";
  $("#mesaj-listesi").hidden = $("#mesaj-form").hidden = ne === "duyuru";
  $("#mesaj-tur").hidden = $("#hizli-cevaplar").hidden = ne !== "aile";      // istek ve hazır cevaplar yalnız aile sohbetinde
  const ogr = durum.veri.profil.ogrenci_adi || "Öğrenci";
  $("#mesaj-baslik").textContent = ne === "duyuru" ? "📣 Bildirim gönder" : ozel ? `💬 ${mesajDurumu.sohbet.kisi.ad}`
    : benKimim() === "ogrenci" ? "💬 Mesajlar — Annem & Babam" : `💬 Mesajlar — ${ogr}`;
  kisilerCiz();
  if (ne === "duyuru") return duyuruCiz();
  if (ozel) {
    const kid = mesajDurumu.sohbet.kid;
    mesajDurumu.kapat.push(Bulut.konusmaDinle(kid, liste => {
      if (!mesajDurumu.sohbet.kid || mesajDurumu.sohbet.kid !== kid) return;
      mesajDurumu.ozelMesajlar = liste; ozelMesajlariCiz();
      if ($("#mesaj-pencere").open && liste.length) Bulut.konusmaOkundu(ben, kid);
    }));
  }
  mesajTuruSec("mesaj");
  mesajlariCiz();
  $("#mesaj-kutu").focus();
}
async function mesajPenceresiAc(acilacak) {
  $("#hizli-cevaplar").innerHTML = HIZLI_CEVAPLAR.map(c => `<button type="button" data-hizli="${esc(c)}">${esc(c)}</button>`).join("");
  $("#mesaj-pencere").showModal();
  sohbetSec(typeof acilacak === "string" && (acilacak === "aile" || mesajDurumu.kisiler.some(k => k.id === acilacak)) ? acilacak : "aile");
  if (mesajDurumu.sohbet === "aile") { await okunduIsaretle(); mesajlariCiz(); }
}
/* Girişten sonra: kişiler ve özel sohbetler (rozet için) dinlenir */
async function mesajKisileriniBaslat() {
  const ben = benKisi();
  if (!ben || typeof Bulut === "undefined" || !Bulut.kisilerim || !["veli", "yonetici"].includes(ben.rol)) return;
  try { mesajDurumu.kisiler = await Bulut.kisilerim(ben); } catch (_) { mesajDurumu.kisiler = []; }
  if (mesajDurumu.konusmaKapat) mesajDurumu.konusmaKapat();
  mesajDurumu.konusmaKapat = Bulut.konusmalarimiDinle(ben, liste => { mesajDurumu.konusmalar = liste; mesajRozetiCiz(); });
}

/* ---------- yönetici: seçtiği kişilere bildirim ---------- */
async function duyuruCiz() {
  const kap = $("#duyuru-kisiler"), ROL = { yonetici: "yönetici", veli: "veli", ogrenci: "öğrenci" };
  const kisiler = mesajDurumu.kisiler.slice().sort((a, b) => ["yonetici", "veli", "ogrenci"].indexOf(a.rol) - ["yonetici", "veli", "ogrenci"].indexOf(b.rol) || a.ad.localeCompare(b.ad, "tr"));
  kap.innerHTML = kisiler.length ? kisiler.map(k => `<label class="dk"><input type="checkbox" value="${k.id}"> <span>${esc(k.ad)} <small>${ROL[k.rol] || k.rol}</small></span>
      <small class="dk-cihaz" data-cihaz-durum="${k.id}">…</small></label>`).join("") : `<p class="panel-not">Henüz başka kişi yok (Hesapları yönet).</p>`;
  for (const k of kisiler) {
    Bulut.cihazlar(k.id).then(c => {
      const acik = c.filter(x => x.aktif).length, el = kap.querySelector(`[data-cihaz-durum="${k.id}"]`);
      if (el) el.textContent = acik ? `🔔 ${acik} cihaz` : "🔕 bildirimi kapalı";
    }).catch(() => {});
  }
}
async function duyuruGonder(e) {
  e.preventDefault();
  const f = e.target, ben = benKisi();
  const secilen = [...f.querySelectorAll("#duyuru-kisiler input:checked")].map(i => i.value);
  const metin = f.elements.metin.value.trim(), baslik = f.elements.baslik.value.trim() || "ÖğretmeniM";
  if (!secilen.length) return bildir("En az bir kişi seç", true);
  if (!metin) return;
  try {
    for (const id of secilen) await Bulut.bildirimKuyruga(ben, { hedef: { kisi: id }, baslik: "📣 " + baslik, metin, tur: "duyuru" });
    f.reset(); $("#duyuru-durum").textContent = `${secilen.length} kişiye gönderildi.`;
    bildir("Bildirim gönderildi 📣");
  } catch (h) { bildir(h.message, true); }
}

function mesajTuruSec(tur) {
  mesajDurumu.tur = tur;
  $$("#mesaj-tur button").forEach(b => b.classList.toggle("aktif", b.dataset.tur === tur));
  $("#mesaj-kutu").placeholder = tur === "istek" ? "Ne istiyorsun? (örn. Kırmızı kalem alabilir misin?)" : "Mesajını yaz…";
}

async function mesajGonder(e) {
  e && e.preventDefault();
  const kutu = $("#mesaj-kutu");
  const metin = kutu.value.trim();
  if (!metin) return;
  const ben = benKisi();
  try {
    if (mesajDurumu.sohbet !== "aile") {
      await Bulut.konusmaMesaji(ben, mesajDurumu.sohbet.kisi, metin);
      kutu.value = "";
      return;
    }
    durum.veri.koleksiyonlar.mesajlar.push(await api("POST", "k/mesajlar", { metin, tur: mesajDurumu.tur }));
    const istek = mesajDurumu.tur === "istek";
    kutu.value = "";
    mesajTuruSec("mesaj");
    mesajlariCiz();
    // Alıcıya bildirim (öğrenci yazdıysa velilerine, veli yazdıysa öğrenciye); kuyruğa yazılamazsa mesaj yine gitmiştir
    if (ben && typeof Bulut !== "undefined" && Bulut.bildirimKuyruga && OTURUM.ogrenci) {
      const ogrenciYazdi = !veliAktif();
      Bulut.bildirimKuyruga(ben, {
        hedef: ogrenciYazdi ? { ogrenci_velileri: OTURUM.ogrenci } : { kisi: OTURUM.ogrenci },
        baslik: `${istek ? "🙋" : "💬"} ${ogrenciYazdi ? (durum.veri.profil.ogrenci_adi || ben.ad) : ben.ad}`, metin, ac: "mesaj",
      }).catch(() => {});
    }
  } catch (hata) { bildir(hata.message, true); }
}

function mesajOlaylariniKur() {
  $("#mesaj-ac").addEventListener("click", () => mesajPenceresiAc());
  $("#mesaj-kapat").addEventListener("click", () => $("#mesaj-pencere").close());
  $("#mesaj-pencere").addEventListener("close", () => { mesajDurumu.kapat.forEach(f => f()); mesajDurumu.kapat = []; mesajDurumu.sohbet = "aile"; });
  $("#mesaj-kisiler").addEventListener("click", async e => {
    const b = e.target.closest("[data-sohbet]");
    if (!b) return;
    sohbetSec(b.dataset.sohbet);
    if (b.dataset.sohbet === "aile") { await okunduIsaretle(); mesajlariCiz(); }
  });
  $("#duyuru-form").addEventListener("submit", duyuruGonder);
  $("#mesaj-form").addEventListener("submit", mesajGonder);
  $("#mesaj-kutu").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); mesajGonder(); } });
  $("#mesaj-tur").addEventListener("click", e => { const b = e.target.closest("[data-tur]"); if (b) mesajTuruSec(b.dataset.tur); });
  $("#hizli-cevaplar").addEventListener("click", e => { const b = e.target.closest("[data-hizli]"); if (b) { $("#mesaj-kutu").value = b.dataset.hizli; mesajGonder(); } });
  $("#mesaj-listesi").addEventListener("click", async e => {
    const b = e.target.closest("[data-tamam]");
    if (!b) return;
    const m = durum.veri.koleksiyonlar.mesajlar.find(x => x.id === b.dataset.tamam);
    try { Object.assign(m, await api("PUT", "k/mesajlar/" + m.id, { tamam: true })); mesajlariCiz(); bildir("İstek tamamlandı ✅"); }
    catch (hata) { bildir(hata.message, true); }
  });
}

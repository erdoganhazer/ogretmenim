/* ÖğretmeniM — veli ↔ öğrenci mesajları (okundu bilgisi, istekler)
   Arın'ın ekranında "ben" = öğrenci; veli modunda Mint'ten yazılırsa "ben" = veli. */
"use strict";

const mesajDurumu = { tur: "mesaj", sonOkunmamis: 0 };
const HIZLI_CEVAPLAR = ["👍", "Tamam!", "Teşekkürler ❤️", "Birazdan yaparım", "Yardım eder misin?"];

function benKimim() { return veliAktif() ? "veli" : "ogrenci"; }
function aktifMesajlar() {
  return durum.veri.koleksiyonlar.mesajlar.filter(m => !m.silindi).sort((a, b) => a.olusturma.localeCompare(b.olusturma));
}
function okunmamislar() { const ben = benKimim(); return aktifMesajlar().filter(m => m.kime === ben && !m.okundu); }

function mesajRozetiCiz() {
  const n = okunmamislar().length;
  const r = $("#mesaj-sayi");
  r.hidden = !n;
  r.textContent = n;
  $("#mesaj-ac").classList.toggle("yeni", n > 0);
  // Yeni mesaj geldiyse haber ver (pencere kapalıyken)
  if (n > mesajDurumu.sonOkunmamis && !$("#mesaj-pencere").open) {
    const son = okunmamislar().slice(-1)[0];
    const kimden = son.kimden === "veli" ? (son.veli_adi || "Velin") : (durum.veri.profil.ogrenci_adi || "Öğrenci");
    bildir(`💬 ${kimden}: ${son.metin.slice(0, 60)}`);
  }
  mesajDurumu.sonOkunmamis = n;
}

function saatYazisi(z) {
  const t = new Date(z), bugun = new Date().toDateString() === t.toDateString();
  return (bugun ? "" : `${t.getDate()} ${AYLAR[t.getMonth()].slice(0, 3)} `) + `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}

function mesajlariCiz() {
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

async function mesajPenceresiAc() {
  $("#mesaj-baslik").textContent = benKimim() === "ogrenci" ? "💬 Mesajlar — Annem & Babam" : `💬 Mesajlar — ${durum.veri.profil.ogrenci_adi || "Öğrenci"}`;
  $("#hizli-cevaplar").innerHTML = HIZLI_CEVAPLAR.map(c => `<button type="button" data-hizli="${esc(c)}">${esc(c)}</button>`).join("");
  mesajTuruSec("mesaj");
  mesajlariCiz();
  $("#mesaj-pencere").showModal();
  $("#mesaj-kutu").focus();
  await okunduIsaretle();
  mesajlariCiz();
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
  try {
    durum.veri.koleksiyonlar.mesajlar.push(await api("POST", "k/mesajlar", { metin, tur: mesajDurumu.tur }));
    kutu.value = "";
    mesajTuruSec("mesaj");
    mesajlariCiz();
  } catch (hata) { bildir(hata.message, true); }
}

function mesajOlaylariniKur() {
  $("#mesaj-ac").addEventListener("click", mesajPenceresiAc);
  $("#mesaj-kapat").addEventListener("click", () => $("#mesaj-pencere").close());
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

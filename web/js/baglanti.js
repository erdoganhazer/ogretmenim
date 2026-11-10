/* ÖğretmeniM 0.19 — Bağlantıyı ve güncellemeyi uygulamanın içinden yönetme (terminal gerekmez).
   Ayarlar › Veli bilgisayarı bağlantısı: "Bilgisayarımı bul ve bağlan" → ağ taranır, Windows bilgisayarları listelenir,
   seçilene bağlanılır (gerekirse Windows parolası bir kez sorulur, Mint anahtarlığına kaydedilir).
   Ayarlar › Güncelleme: paylaşımda yeni sürüm varsa tek düğmeyle kurulur; pencere yeni sürümle kendini yeniler. */

const bag = { adaylar: [], secili: null, bekleyen: null, kuruluyor: false };

function baglantiOlaylariniKur() {
  $("#ag-bul").addEventListener("click", agBul);
  $("#ag-sonuc").addEventListener("click", agSonucTik);
  $("#ag-sonuc").addEventListener("submit", agSifreGonder);
  $("#guncelleme-yenile").addEventListener("click", () => guncellemeCiz());
  $("#guncelleme-durumu").addEventListener("click", e => { if (e.target.closest("[data-gn-kur]")) guncellemeKur(e.target.closest("[data-gn-kur]").dataset.gnKur === "imzasiz"); });
  $("#oto-guncelle").addEventListener("change", otoGuncelleKaydet);
  $("#baglanti-uyari").addEventListener("click", async () => {
    if (!(await veliGerekli("Bağlantıyı onarmak için veli şifresi gerekli."))) return;
    await sayfaAc("ayarlar");
    $("#esitleme-ayarlari").scrollIntoView({ behavior: "smooth", block: "start" });
    agBul();
  });
  setInterval(baglantiDenetle, 60000);
  setTimeout(baglantiDenetle, 4000);
}

/* ---------- B3: bağlantı sorunu uyarısı (yalnız veli modunda görünür; Arın'ı rahatsız etmez) ---------- */
let sonEsitleme = null;
async function baglantiDenetle() {
  if (!veliAktif()) { $("#baglanti-uyari").hidden = true; return; }
  try { baglantiUyarisi(await api("GET", "esitleme")); } catch (_) {}
}
function baglantiUyarisi(e) {
  sonEsitleme = e;
  $("#baglanti-uyari").hidden = !(veliAktif() && e && e.sorun);
}

/* ---------- Bilgisayarımı bul ---------- */
async function agBul() {
  const kap = $("#ag-sonuc");
  const dugme = $("#ag-bul");
  dugme.disabled = true;
  kap.innerHTML = `<div class="bag-bilgi"><span class="bag-donen"></span> Ağdaki Windows bilgisayarları aranıyor… (en çok 20 saniye)</div>`;
  try {
    const t = await api("GET", "ag/tara");
    bag.adaylar = t.adaylar || [];
    if (!bag.adaylar.length) {
      kap.innerHTML = `<div class="bag-bilgi kotu">Ağda dosya paylaşımı açık bir Windows bilgisayarı bulunamadı.</div>
        <ul class="bag-neden">
          <li>Windows bilgisayarı açık ve uyanık mı? (Uyku modundaysa bir tuşa bas.)</li>
          <li>İki bilgisayar aynı modeme mi bağlı? Bu bilgisayarın ağı: <b>${esc(t.yerel ? t.yerel.ag || t.yerel.ip || "" : "—")}</b></li>
          <li>Windows'ta ağ “Ortak” olmuş olabilir: Belgeler › OgretmeniM-Paylasim › <b>Ağ Onarımı.bat</b>'ı bir kez çalıştır, sonra burada yeniden ara.</li>
        </ul>`;
      return;
    }
    kap.innerHTML = `<div class="bag-liste">${bag.adaylar.map((a, i) => `
      <div class="bag-aday${a.onerilen ? " onerilen" : ""}">
        <span class="bag-ad">💻 <b>${esc(a.ad || "Adı bilinmeyen bilgisayar")}</b> <small>${esc(a.ip)}</small>
          ${a.onerilen ? `<em class="bag-etiket">kayıtlı bilgisayar</em>` : ""}${a.sifre ? `<em class="bag-etiket gri">şifre kayıtlı</em>` : ""}</span>
        <button class="dugme kucuk${a.onerilen || bag.adaylar.length === 1 ? " ana-dugme" : ""}" type="button" data-bag="${i}">Bağlan</button>
      </div>`).join("")}</div>`;
  } catch (hata) {
    kap.innerHTML = `<div class="bag-bilgi kotu">${esc(hata.message)}</div>`;
  } finally { dugme.disabled = false; }
}

function agSonucTik(e) {
  const b = e.target.closest("[data-bag]");
  if (b) return agBaglan(bag.adaylar[+b.dataset.bag]);
  if (e.target.closest("[data-bag-vazgec]")) agBul();
}

async function agBaglan(aday, kimlik) {
  if (!aday) return;
  bag.secili = aday;
  const kap = $("#ag-sonuc");
  kap.innerHTML = `<div class="bag-bilgi"><span class="bag-donen"></span> ${esc(aday.ad || aday.ip)} bilgisayarına bağlanılıyor…</div>`;
  try {
    const s = await api("POST", "ag/baglan", Object.assign({ ip: aday.ip, ad: aday.ad }, kimlik || {}));
    if (s.tamam) return agEsitlemeBekle(s);
    if (s.kod === "sifre_gerekli" || s.kod === "sifre_yanlis") return agSifreFormu(aday, s);
    kap.innerHTML = `<div class="bag-bilgi kotu">${esc(s.hata || "Bağlanılamadı")}</div>
      <button class="dugme kucuk" type="button" data-bag-vazgec>Yeniden ara</button>`;
  } catch (hata) {
    kap.innerHTML = `<div class="bag-bilgi kotu">${esc(hata.message)}</div>
      <button class="dugme kucuk" type="button" data-bag-vazgec>Yeniden ara</button>`;
  }
}

function agSifreFormu(aday, s) {
  $("#ag-sonuc").innerHTML = `
    <form class="bag-sifre" autocomplete="off">
      <div class="bag-bilgi${s.kod === "sifre_yanlis" ? " kotu" : ""}">${esc(s.hata)}</div>
      <p class="panel-not">Windows bilgisayarında oturum açtığın kullanıcı adı ve parola (ya da Microsoft hesabı e-postası ve parolası).
        Bir kez sorulur; bu bilgisayarın anahtarlığında saklanır, hiçbir dosyaya yazılmaz.</p>
      <div class="alanlar">
        <label>Kullanıcı adı <input name="kullanici" required placeholder="Hazer" autocomplete="off"></label>
        <label>Parola <input name="parola" type="password" required autocomplete="new-password"></label>
      </div>
      <div class="dugme-grubu">
        <button class="dugme ana-dugme" type="submit">Bağlan</button>
        <button class="dugme" type="button" data-bag-vazgec>Vazgeç</button>
      </div>
    </form>`;
  $("#ag-sonuc [name=kullanici]").focus();
}

function agSifreGonder(e) {
  if (!e.target.classList.contains("bag-sifre")) return;
  e.preventDefault();
  const f = e.target;
  const kimlik = { kullanici: f.kullanici.value.trim(), parola: f.parola.value };
  f.parola.value = "";
  agBaglan(bag.secili, kimlik);
}

async function agEsitlemeBekle(s) {
  const kap = $("#ag-sonuc");
  const once = (sonEsitleme && sonEsitleme.son_basari) || "";
  kap.innerHTML = `<div class="bag-bilgi iyi">Bağlandı ✓ ${esc(s.bilgisayar || "")} — ilk eşitleme bekleniyor <span class="bag-donen"></span></div>`;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const e = await api("GET", "esitleme");
      if (e.son_basari && e.son_basari !== once) {
        kap.innerHTML = `<div class="bag-bilgi iyi">Eşitlendi ✓ Veli Paneli ile bu bilgisayar yeniden konuşuyor.</div>`;
        esitlemeCiz();
        return;
      }
    } catch (_) {}
  }
  kap.innerHTML = `<div class="bag-bilgi kotu">Bağlantı kuruldu ama eşitleme henüz olmadı. Bir dakika sonra “Yenile”ye bas.</div>`;
  esitlemeCiz();
}

/* ---------- Güncelleme ---------- */
async function guncellemeCiz(g) {
  const kap = $("#guncelleme-durumu");
  if (!kap || bag.kuruluyor) return;
  try { g = g || await api("GET", "guncelleme"); } catch (hata) { kap.innerHTML = `<div class="gun-bos">${esc(hata.message)}</div>`; return; }
  let ic = `<div class="esit-satir"><span>Kurulu sürüm</span><b>${esc(g.kurulu)}</b></div>`;
  if (!g.baglanti) ic += `<div class="esit-satir"><span>Paylaşımdaki sürüm</span><b class="kotu">Paylaşıma bağlı değil</b></div>`;
  else ic += `<div class="esit-satir"><span>Paylaşımdaki sürüm</span><b class="${g.yeni ? "kotu" : "iyi"}">${esc(g.paylasim || "—")}${g.yeni ? "" : " ✓"}</b></div>`;
  if (g.yeni) {
    ic += g.imzali
      ? `<div class="gn-hazir"><span>Yeni sürüm hazır: <b>${esc(g.paylasim)}</b> <small>(${esc(g.imzalayan)} onayladı)</small></span>
           <button class="dugme ana-dugme" type="button" data-gn-kur="imzali">⬆ Şimdi kur</button></div>`
      : `<div class="gn-hazir"><span>Yeni sürüm var: <b>${esc(g.paylasim)}</b> <small>(Veli Paneli'nden henüz onaylanmadı)</small></span>
           <button class="dugme ana-dugme" type="button" data-gn-kur="imzasiz">⬆ Veli olarak kur</button></div>`;
  }
  if (g.yeni && g.bozuk && g.bozuk === g.paylasim) ic += `<p class="panel-not">Bu sürüm daha önce açılamadı ve önceki sürüme dönüldü (ayrıntı: ~/.local/share/ogretmenim/guncelleme.log).</p>`;
  if (g.durum && g.durum !== "kuruluyor") ic += `<p class="panel-not">${esc(g.durum)}</p>`;
  kap.innerHTML = ic;
}

function otoGuncelleCiz() { const k = $("#oto-guncelle"); if (k) k.checked = !!(durum.veri.ayarlar && durum.veri.ayarlar.oto_guncelle); }
async function otoGuncelleKaydet(e) {
  try { durum.veri.ayarlar = await api("PUT", "ayarlar", { oto_guncelle: e.target.checked }); bildir(e.target.checked ? "Onaylı sürümler kendiliğinden kurulacak" : "Kendiliğinden güncelleme kapalı"); }
  catch (hata) { e.target.checked = !e.target.checked; bildir(hata.message, true); }
}

async function guncellemeKur(imzasiz) {
  const kap = $("#guncelleme-durumu");
  const eski = durum.surum;
  try {
    const s = await api("POST", "guncelleme/kur", imzasiz ? { imzasiz: true } : {});
    bag.kuruluyor = true;
    kap.innerHTML = `<div class="bag-bilgi"><span class="bag-donen"></span> ${esc(s.surum)} kuruluyor… Uygulama birkaç saniye kapanıp kendini yenileyecek.</div>`;
  } catch (hata) { bildir(hata.message, true); return; }
  for (let i = 0; i < 45; i++) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const { surum } = await fetch("/api/sayac").then(r => r.json());
      if (surum && surum !== eski) { location.reload(); return; }
    } catch (_) { /* motor yeniden başlıyor */ }
  }
  bag.kuruluyor = false;
  kap.innerHTML = `<div class="bag-bilgi kotu">Kurulum bitmedi. Ayrıntı: ~/.local/share/ogretmenim/guncelleme.log</div>`;
}

/* Motor yeni sürümle açıldıysa (Veli Paneli'nden istenen ya da kendiliğinden kurulan güncelleme) pencere kendini yeniler.
   Arın bir şey yazıyorsa beklenir; çalışma sayacı localStorage'da olduğundan yenilemede kaybolmaz. */
function surumDegistiMi(surum) {
  if (!surum || !durum.surum || surum === durum.surum) return false;
  const mesgul = $$("dialog").some(p => p.open) || (typeof defter !== "undefined" && defter.duzenlenen) ||
                 (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement.value);
  if (!mesgul) location.reload();
  return true;
}

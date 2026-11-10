/* ÖğretmeniM — yüklenebilir uygulama (PWA): çevrimdışı dosyası, otomatik güncelleme, "Uygulamayı yükle" düğmesi.
   Android ve bilgisayarda (Chrome, Edge) tarayıcının kendi yükleme penceresi açılır; iPhone/iPad'de Safari'nin
   "Ana Ekrana Ekle" adımları gösterilir. Uygulama zaten yüklü açıldıysa düğme görünmez. */
"use strict";
(() => {
  const yuklu = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let bekleyen = null;                                   // tarayıcının ertelenmiş yükleme isteği

  const dugmeler = () => document.querySelectorAll("[data-uygulama-yukle]");
  const goster = acik => dugmeler().forEach(b => { b.hidden = !acik; });

  /* ---------- çevrimdışı dosyası + güncelleme ---------- */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    let oncekiVardi = !!navigator.serviceWorker.controller;
    let yenilenecek = false;
    const yenile = () => { if (!document.querySelector("dialog[open]")) location.reload(); else yenilenecek = true; };
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!oncekiVardi) { oncekiVardi = true; return; }  // ilk kurulum: sayfa zaten güncel
      yenile();                                          // yeni sürüm geldi: açık pencere yoksa hemen yenile
    });
    addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").then(kayit => {
        // uygulamaya geri dönülünce yeni sürüm var mı bak; açık pencere yüzünden bekleyen yenileme varsa şimdi yap
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "hidden" && yenilenecek) location.reload();
          if (document.visibilityState === "visible") kayit.update().catch(() => {});
        });
      }).catch(() => { /* çevrimdışı dosyası kurulamadı: uygulama yine çalışır */ });
    });
  }

  /* ---------- "Uygulamayı yükle" ---------- */
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); bekleyen = e; if (!yuklu()) goster(true); });
  addEventListener("appinstalled", () => { bekleyen = null; goster(false); });

  function iosYardim() {
    let p = document.getElementById("yukle-pencere");
    if (!p) {
      p = document.createElement("dialog");
      p.id = "yukle-pencere"; p.className = "pencere yukle-pencere";
      p.innerHTML = `
        <div class="pencere-ust"><h2>📲 ÖğretmeniM'i ana ekrana ekle</h2></div>
        <ol class="yukle-adimlar">
          <li>Bu sayfayı <b>Safari</b>'de aç (Chrome'da da olur).</li>
          <li>Alttaki <b>Paylaş</b> düğmesine dokun <span class="yukle-simge" aria-hidden="true">⬆︎</span></li>
          <li>Listeyi kaydırıp <b>Ana Ekrana Ekle</b>'yi seç.</li>
          <li>Sağ üstte <b>Ekle</b>'ye dokun. ÖğretmeniM simgesi ana ekranında olacak.</li>
        </ol>
        <p class="pencere-not yukle-not">Ana ekrandan ilk açışta bir kez giriş yapman gerekir.</p>
        <div class="pencere-alt"><button type="button" class="dugme ana-dugme" data-kapat>Tamam</button></div>`;
      p.querySelector("[data-kapat]").onclick = () => p.close();
      document.body.appendChild(p);
    }
    p.showModal();
  }

  document.addEventListener("click", async e => {
    if (!e.target.closest("[data-uygulama-yukle]")) return;
    const menu = document.getElementById("oturum-menu"); if (menu) menu.hidden = true;
    if (bekleyen) {
      bekleyen.prompt();
      const { outcome } = await bekleyen.userChoice.catch(() => ({}));
      if (outcome === "accepted") goster(false);
      bekleyen = null;
    } else if (ios) iosYardim();
  });

  // iPhone/iPad'de tarayıcı kendi düğmesini sunmaz: yüklü değilse yardım düğmesini göster
  document.addEventListener("DOMContentLoaded", () => { if (ios && !yuklu()) goster(true); });
})();

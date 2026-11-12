/* ÖğretmeniM — telefonun geri tuşu (Android geri, iPhone'da kenardan kaydırma) uygulama içinde geri götürür.
   Her sayfa geçişi ve açılan her pencere tarayıcı geçmişine yazılır (adres değişmez). Geri basılınca sırayla:
   1) açık menü kapanır, 2) oyun/sınav penceresinde bir üst ekrana dönülür, 3) açık pencere kapanır, 4) önceki sayfaya dönülür.
   Ana sayfada ilk geri "Çıkmak için bir daha geri'ye bas" der; iki saniye içinde ikinci geri uygulamadan çıkar. */
"use strict";
(() => {
  const G = { sayfa: null, iceride: false, yoksay: 0, kapatiliyor: false, sonUyari: 0 };
  const asilSayfaAc = window.sayfaAc;
  if (typeof asilSayfaAc !== "function") return;

  /* ---------- sayfa geçişleri ---------- */
  window.sayfaAc = function (ad, ...geri) {
    if (!G.iceride && ad !== G.sayfa) {
      if (G.sayfa === null) {                                   // ilk sayfa: altına bir "kök" kaydı (çıkış uyarısı için)
        history.replaceState({ oo: 1, sayfa: ad, kok: true }, "");
        history.pushState({ oo: 1, sayfa: ad }, "");
      } else history.pushState({ oo: 1, sayfa: ad }, "");
    }
    G.sayfa = ad;
    return asilSayfaAc.call(this, ad, ...geri);
  };
  const sayfayaDon = ad => { G.iceride = true; try { window.sayfaAc(ad); } finally { G.iceride = false; } };
  const yerindeKal = () => history.pushState({ oo: 1, sayfa: G.sayfa }, "");

  /* ---------- pencereler: açılınca geçmişe bir kayıt; ✕ ya da Esc ile kapanınca o kayıt geri alınır ---------- */
  const asilAc = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal = function (...a) {
    const r = asilAc.apply(this, a);
    if (G.sayfa !== null && !this._gecmiste) {
      this._gecmiste = true;
      history.pushState({ oo: 1, sayfa: G.sayfa, pencere: this.id || "pencere" }, "");
      this.addEventListener("close", () => {
        this._gecmiste = false;
        if (G.kapatiliyor) return;                               // geri tuşuyla kapandı: kayıt zaten geri alındı
        if (history.state && history.state.pencere) { G.yoksay++; history.back(); }
      }, { once: true });
    }
    return r;
  };

  /* Oyun/sınav penceresi: önce oyundan menüye, sonra bir üst ekrana; en üstteyse pencere kapanır */
  function oyunGeri(p) {
    const ctx = typeof miniOyun !== "undefined" && miniOyun.ctx;
    if (ctx && !ctx.kapandi && typeof ctx.cik === "function") { ctx.cik(); return true; }
    const g = document.getElementById("oyun-geri-tus");
    if (g && !g.hidden && p.contains(g)) { g.click(); return true; }
    return false;
  }

  addEventListener("popstate", e => {
    if (G.yoksay) { G.yoksay--; return; }
    const s = e.state || {};
    // 1) açık menüler
    const menu = document.querySelector("#oturum-menu:not([hidden])");
    if (menu) { menu.hidden = true; return yerindeKal(); }
    // 2–3) açık pencere (en üstteki)
    const acik = [...document.querySelectorAll("dialog[open]")].pop();
    if (acik) {
      if (acik.id === "oyun-pencere" && oyunGeri(acik)) { history.pushState({ oo: 1, sayfa: G.sayfa, pencere: acik.id }, ""); return; }
      G.kapatiliyor = true;
      try { acik.close(); } finally { G.kapatiliyor = false; }
      return;
    }
    if (!s.oo) return;                                            // bizim olmayan kayıt (ör. bildirimden gelen adres)
    // 4) ana sayfada: çıkış uyarısı
    if (s.kok) {
      if (Date.now() - G.sonUyari < 2000) { history.back(); return; }
      G.sonUyari = Date.now();
      if (typeof bildir === "function") bildir("Çıkmak için bir daha geri'ye bas");
      return yerindeKal();
    }
    if (s.sayfa && s.sayfa !== G.sayfa) sayfayaDon(s.sayfa);
  });
})();

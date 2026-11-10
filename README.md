# ÖğretmeniM (web)

Arın'ın ev çalışma uygulamasının tarayıcıda çalışan sürümü. Barındırma: GitHub Pages; hesaplar ve veri: Firebase (giriş + Firestore).

- `web/` — uygulama (statik dosyalar)
- `web/js/motor/` — eski Python motorunun JavaScript karşılığı: `planlayici.js`, `rapor.js`, `cekirdek.js` (veri kuralları + /api yönlendiricisi), `depo.js` (kalıcı kayıt)
- `test/` — Python motoruyla karşılaştırmalı testler (`*_uret.py` senaryo üretir, `*_karsilastir.js` JS ile aynı sonucu verdiğini denetler)
- `docs/` — süreç günlüğü

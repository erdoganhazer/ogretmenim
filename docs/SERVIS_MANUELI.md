# Servis manueli — ÖğretmeniM web

## Nerede ne var
- Uygulama: GitHub Pages (`erdoganhazer.github.io/ogretmenim`), depo `erdoganhazer/ogretmenim`, yayın `.github/workflows/yayin.yml` (main'e `web/` değişikliği gelince).
- Hesaplar ve veri: Firebase projesi `ogretmenim-d0524` (console.firebase.google.com).

## Sık işler
- **Yeni öğrenci/veli:** yönetici girişi › üstteki ad › Hesapları yönet.
- **Şifre unutuldu:** Hesapları yönet › kişiyi seç › yeni şifre yaz › Kaydet.
- **Hesabı kapat:** aynı yerde "Hesap açık" işaretini kaldır.
- **Kurallar değişti:** `firestore.rules` main'e gelince Actions'taki "Güvenlik kuralları testi" önce testleri çalıştırır, yeşilse `yayinla` adımı kuralları Firebase'e yayınlar (`FIREBASE_SERVICE_ACCOUNT` sırrıyla). Elle yayın gerekirse: içeriği Firebase › Firestore › Rules'a yapıştır › Publish.

## İlk kurulum (bir kez)
- **GitHub Pages:** depo › Settings › Pages › Build and deployment › Source: **GitHub Actions**. Sonra Actions › "Yayın (GitHub Pages)" › Run workflow (ya da main'e `web/` değişikliği).
- **Kural yayını sırrı:** Firebase › Proje ayarları › Hizmet hesapları › Yeni özel anahtar oluştur (JSON). Hesabın Google Cloud IAM'de en az *Firebase Rules Admin* rolü olmalı
  ("serviceusage" yetki hatası verirse *Service Usage Consumer* da eklenir). JSON'un tamamı depo › Settings › Secrets and variables › Actions › New repository secret › ad: `FIREBASE_SERVICE_ACCOUNT`.
- **Firebase Authentication › Settings › Authorized domains:** `erdoganhazer.github.io` ekli olmalı.

## Uygulamayı yükleme
- **Android (Chrome/Samsung):** siteyi aç › menü ya da giriş ekranındaki **📲 Uygulamayı yükle** › Yükle. Simge ana ekrana gelir.
- **iPhone/iPad:** Safari › Paylaş › **Ana Ekrana Ekle** (uygulamadaki 📲 düğmesi adımları gösterir). Ana ekrandan ilk açışta bir kez giriş gerekir.
- **Bilgisayar (Chrome/Edge):** adres çubuğundaki yükleme simgesi ya da hesap menüsündeki 📲. Uygulama kendi penceresinde açılır.
- Güncelleme kendiliğinden: her yayında `sw.js`'ye sürüm yazılır (`araclar/sw_damgala.py`), uygulama yeni sürümü indirip yenilenir
  (açık bir pencere varsa uygulamadan çıkınca). Eski sürümde takılı kalırsa: uygulamayı kapatıp yeniden aç.

## Sorun giderme
- Actions'ta `yayinla` "FIREBASE_SERVICE_ACCOUNT sırrı tanımlı değil" diyorsa sır eklenmemiş; "PERMISSION_DENIED" diyorsa hizmet hesabının rolü eksik.
- "Bu işlem için yetkin yok": kurallar yayınlanmamış ya da hesap öğrenciye atanmamış.
- Giriş ekranında sürekli "Yükleniyor…": Authentication'da Email/Password kapalı ya da alan adı Authorized domains'te yok.
- Geliştirme: `web/` klasörünü `python3 -m http.server` ile aç; Firebase dosyası yerine `test/sahte_firebase.js` yüklenirse her şey tarayıcıda çalışır.

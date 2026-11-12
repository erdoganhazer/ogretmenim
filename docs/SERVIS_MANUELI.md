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

## Öğrenci dosyası ve eski veriler
- **Eski uygulamadan geçiş:** Arın'ın bilgisayarında eski uygulamanın Ayarlar › Yedekleme › Şimdi yedek al ile .zip al (ya da `~/OgretmeniM-Yedekler`).
  Web'de veli › Ayarlar › Öğrenci dosyası › İçe aktar › zip'i seç › raporu oku › "Önce yedeği indir, sonra aktar". Konu Defteri arşivini ayrıca indir.
- **Yıllık yedek / başka hesaba taşıma:** Öğrenci dosyası › Dışa aktar (.json). Aynı dosya tekrar yüklenirse çoğalmaz.
- **Sınıf atlama:** Ayarlar › Sınıf › Yeni sınıfa geç. Yanlış sınıfta kalan ders: "Dersleri sınıflar arasında taşı".

## İçerik paketleri
- Katalog `web/hazirlik/paketler.json`. Öğrenciye atama: Hesapları yönet › öğrenci › İçerik paketleri › Kaydet.
- Yeni dönem yazılı içeriği: `araclar/hazirlik/*.py` → `araclar/hazirlik_derle.py` → yeni dosya + katalogda yeni `id`.

## Bildirimler
- Her veli kendi cihazında: Ayarlar › Bildirimler › Bu cihaza bildirim gönder; saat ve uyarı türleri orada. iPhone'da önce Ana Ekrana Ekle.
- Gönderim: Actions › "Veli bildirimleri" (yarım saatte bir). Elle denemek için Run workflow › kuru = 1 (göndermez, günlüğe yazar).
- GitHub 60 gün değişiklik olmayan depoda zamanlanmış işi durdurur: Actions › Veli bildirimleri › Enable workflow.
- Bildirim gelmiyorsa: cihaz "🔔" mi, saat geçti mi, "Haberim var" denmiş mi, Actions günlüğünde "gönderilemedi" var mı (geçersiz cihaz kendiliğinden kapanır).

## Mesajlar ve bildirim gönderme
- **Aile sohbeti** (öğrenci ↔ veliler): üstteki 💬. **Veliler arası özel sohbet:** 💬 › kişiler satırında öbür velinin adı. Öğrenci yalnız aile sohbetini görür.
- **Yönetici bildirimi:** 💬 › **📣 Bildirim gönder** › kişileri seç › mesaj › Gönder. Listede 🔔 olanların bildirimi açık bir cihazı var.
- Her mesaj ve bildirim `bildirim_kuyrugu`'na düşer; Firebase fonksiyonu **kuyrukGonder** hemen gönderir ve kaydı siler.
  Elle: Actions › "Mesaj bildirimleri" › Run workflow (kuru = 1: göndermez; deneme = kullanıcı adı: o kişiye deneme bildirimi). Gönderilen kayıt silinir; 2 günden eski takılı kayıt temizlenir.
- **Öğrenci de mesaj bildirimi alabilir:** öğrenci girişi › ⚙️ Ayarlar › 🔔 Mesaj bildirimleri › Bildirimleri aç.
- Kişi listesi aynı ailedeki hesaplardan oluşur (`aile` alanı). İlk sürümde açılan yönetici kaydına aile girişte kendiliğinden yazılır;
  eksik kalan hesaplar yönetici "Hesapları yönet"i açınca tamamlanır.
- Gönderim izni: sunucu (`functions/ortak/alicilar.mjs`) ayrıca denetler: veli → kendi öğrencisi ya da aynı ailenin velisi; öğrenci → kendi velileri;
  duyuru yalnız yöneticiden. Testi: `node --test test/alicilar_test.mjs`.

## Firebase fonksiyonları ve kota uyarısı
- Fonksiyonlar (`functions/`): **kuyrukGonder** (mesaj/duyuru/ödev bildirimi anında), **gunlukUyarilar** (30 dakikada bir veli uyarıları),
  **butceUyarisi** (bütçe eşiği aşılınca yöneticilere 🔔 + telefon). Ortak mantık `functions/ortak/`. `functions/` main'e gelince
  Actions › "Firebase fonksiyonları" yükler (Firestore bölgesini kendisi bulur).
- **Kurulum (bir kez):**
  1. Firebase › proje › sol altta plan › **Blaze**'e geç (kart). Ücretsiz kota aynen geçerli; aşılmadıkça ücret yok.
  2. Google Cloud › IAM › `firebase-adminsdk-…` hizmet hesabına **Editor** ve **Project IAM Admin** rolleri.
  3. Actions › "Firebase fonksiyonları" › Run workflow (ilk yüklemede Google bir izin hatası verirse birkaç dakika sonra yeniden çalıştır).
  4. Google Cloud › Faturalandırma › **Bütçeler ve uyarılar** › Bütçe oluştur: proje ogretmenim-d0524, tutar 1 USD (≈ ücretsiz kotanın üstündeki ilk harcama),
     eşikler %50 / %90 / %100, e-posta uyarısı açık, **"Pub/Sub konusuna bağla" → `butce-uyari`**. Böylece eşik aşılınca yöneticiye zil + telefon bildirimi gelir.
- Maliyet sınırı: her fonksiyon en çok 2 örnek, 256 MB.

## Bildirim zili (🔔)
- Üst şeritte; okunmamış sayısını gösterir. Mesaj, duyuru, "ödev bitti" ve günlük veli uyarıları burada listelenir; açınca okundu sayılır.
- Telefon bildirimi gecikse ya da kapalı olsa da zil anında güncellenir (gelen kutusu: `kisiler/{k}/gelen`, `ogrenciler/{oid}/gelen`).

## Sürüm ve güncelleme
- Sürüm, Ayarlar'ın altında ve hesap menüsünün en altında soluk bir satırda: `Sürüm abc1234 · 12 Kas 15:30 · ✓ güncel`.
- Yeni sürüm yayındaysa aynı satırda **⬆ Güncelle** çıkar; basınca uygulama yeni sürüme geçer. (Kendiliğinden de geçer; düğme beklememek için.)
- Sürüm = commit'in kısa kimliği; yayında `araclar/sw_damgala.py` yazar (`web/surum.json` yayındaki, `web/js/surum.js` cihazda çalışan sürüm).

## Uygulamayı yükleme
- **Android (Chrome/Samsung):** siteyi aç › menü ya da giriş ekranındaki **📲 Uygulamayı yükle** › Yükle. Simge ana ekrana gelir.
- **iPhone/iPad:** Safari › Paylaş › **Ana Ekrana Ekle** (uygulamadaki 📲 düğmesi adımları gösterir). Ana ekrandan ilk açışta bir kez giriş gerekir.
- **Bilgisayar (Chrome/Edge):** adres çubuğundaki yükleme simgesi ya da hesap menüsündeki 📲. Uygulama kendi penceresinde açılır.
- Güncelleme kendiliğinden: her yayında `sw.js`'ye sürüm yazılır (`araclar/sw_damgala.py`), uygulama yeni sürümü indirip yenilenir
  (açık bir pencere varsa uygulamadan çıkınca). Eski sürümde takılı kalırsa: uygulamayı kapatıp yeniden aç.

## Geri tuşu
- Telefonun geri tuşu uygulama içinde geri götürür (pencere → oyunda üst ekran → önceki sayfa). Ana sayfada iki kez basınca uygulamadan çıkar (`js/gezinti.js`).

## Sorun giderme
- Actions'ta `yayinla` "FIREBASE_SERVICE_ACCOUNT sırrı tanımlı değil" diyorsa sır eklenmemiş; "PERMISSION_DENIED" diyorsa hizmet hesabının rolü eksik.
- "Bu işlem için yetkin yok": kurallar yayınlanmamış ya da hesap öğrenciye atanmamış.
- Giriş ekranında sürekli "Yükleniyor…": Authentication'da Email/Password kapalı ya da alan adı Authorized domains'te yok.
- Geliştirme: `web/` klasörünü `python3 -m http.server` ile aç; Firebase dosyası yerine `test/sahte_firebase.js` yüklenirse her şey tarayıcıda çalışır.

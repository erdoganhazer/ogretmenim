# Süreç günlüğü — web taşıma

## 10.11.2026 — Aşama 2: motor tarayıcıya taşındı
- `planlayici.js`: planlayici.py birebir. 2.700 rastgele senaryoda Python ile fark 0 (Python `//` bölmesi için `pyFloorDiv`).
- `rapor.js`: rapor.py birebir. 2.800 senaryoda fark 0. Python `"%.1f"` yarıda çifte yuvarlar (1,25 → 1,2) — `f1` bunu taklit eder.
  rapor.py'de hata bulundu: not temalarında "isteksiz" kodunun önerisi `isteksizlik` anahtarında; bu tema en sık çıkınca rapor çöküyordu. Web sürümünde düzeltildi.
- `cekirdek.js`: motor.py'nin veri kuralları (koleksiyon CRUD, veli/öğrenci yetkileri, doğrulamalar, ödev kaynak listesi), plan işlemleri, plan özeti, rapor üretimi,
  gelişim/istatistik/yazılı/kelime özetleri, oyun geçmişi, sınıf atlama ve /api yönlendiricisi. Karşılaştırmalı test motor.py'yi HTTP'siz, sabit saat ve sıralı kimlikle
  çalıştırıp her adımda yanıtı ve tüm veriyi karşılaştırır: ~6.000 rastgele adımda fark 0.
- İşlem günlüğü ve alıştırma kayıtları dosya yerine veri nesnesinin içinde (`gunluk`, `alistirmalar`).
- Hata olan istekte veri işlem öncesine döner (eski motorda bellekte yarım kalabiliyordu).
- `depo.js`: veri şimdilik tarayıcının deposunda (IndexedDB); app.js'deki `api()` artık sunucuya değil tarayıcıdaki motora gidiyor. Firestore bağlantısı 3. aşamada.
- Web'de olmayacaklar (sunucu gerektiriyordu): eşitleme, güncelleme, ağ, yedek klasörü, müzik klasörü, fotoğraf/ek yükleme. Giriş ekranı gelince veli.js yerine hesaplar.

## 10.11.2026 — Aşama 3: giriş, roller, bulut
- Firebase projesi: `ogretmenim-d0524` (Spark). Ayar: `web/js/firebase_ayar.js`. SDK npm'den paketlendi: `web/js/vendor/firebase.js` (araclar/fb; CDN'e bağlı değil, çevrimdışı çalışır).
- Hesaplar kullanıcı adı + şifre. Firebase'de sahte e-posta (`<ad>.<sürüm>@ogretmenim.example.com`); `girisler/{ad}` kullanıcı adını e-postaya çevirir.
- Roller: yönetici (veli yetkisi + hesap yönetimi), veli (atandığı öğrenciler), öğrenci. `kisiler/{id}`, `uidler/{authUid}`.
- İlk açılışta hiç yönetici yoksa giriş ekranı "yönetici hesabını oluştur" olur (`sistem/kurulum` bir kez yazılır).
- Şifre sıfırlama: ücretsiz planda başkasının şifresi değiştirilemediği için yönetici kişiye yeni giriş hesabı açar, eskisinin bağını keser; veri aynı kalır.
- Veri modeli: `ogrenciler/{oid}` ana belge + kayıt başına belge (`odevler/`, `dersler/`, …, `ders_notlari/`), `plan/ayarlar`, `plan_gun/{tarih}`,
  `alistirmalar/{gün}` ve `gunluk/{gün}` (yalnız eklenir). Çeviri: `web/js/motor/parcala.js` (gidiş-dönüş testi: test/parcala_test.js).
- Eşitleme (`Bulut.Esitleyici`): her istekten sonra yalnız değişen belgeler toplu yazılır; başka cihazdaki değişiklik anında gelir. Firestore yerel önbelleğiyle internetsiz çalışır.
- Kurallar `firestore.rules`; testleri `test/kurallar` (emülatör ister; GitHub Actions'ta `kurallar.yml` çalıştırır — buradaki ortam Google'a bağlanamıyor).
- Arayüz denemesi sahte Firebase ile (test/sahte_firebase.js): kurulum → öğrenci ve veli hesabı → veli ödev girer → öğrenci girer, velinin ödevini değiştiremez, "yaptım" diyebilir, gelişimi göremez.
- Eski veli şifresi (PIN) penceresi devre dışı; yetki oturumdan gelir (giris.js).

## 10.11.2026 — Depo ve yayın
- Proje `erdoganhazer/ogretmenim` deposuna yüklendi. Web: `yayin.yml` main'deki `web/` klasörünü GitHub Pages'e yayınlar (Settings › Pages › Source: GitHub Actions gerekir).
- `kurallar.yml`'e `yayinla` işi eklendi: testler yeşilse ve dal main ise `firebase deploy --only firestore:rules` (`FIREBASE_SERVICE_ACCOUNT` sırrı, google-github-actions/auth).
  Artık kuralları konsola elle yapıştırmak gerekmiyor; `firebase.json` değişikliği de iş akışını tetikler.

## 10.11.2026 — Telefon ve tablet görünümü
- `tema.css` sonuna iki blok: ≤1023 px'te sayfa doğal kayar (eskiden gövde sabit yükseklikteydi, içerik kesiliyordu), üst şerit yapışkan ve sığar,
  ana sekmeler alt gezinme çubuğuna iner; ≤760 px'te tüm ızgaralar tek sütun, pencereler ekran genişliğinde, oyun/sınav penceresi tam ekran.
- `index.html`: sekme yazıları simge + ad olarak ayrıldı (`.sk-ikon`, `.sk-ad`); Sınav provası düğmesi telefonda yalnız simge.
- Denetim: sahte Firebase ile 360, 390, 820, 1024, 1280 px'te tüm sayfalar ve 8 dersin oyunları açıldı; yatay taşma yok, masaüstü görünümü aynı.

## 10.11.2026 — Giriş "network-request-failed" düzeltmesi
- Neden: `guvenlik.js` (eski yerel motor için) bütün fetch isteklerine `X-OgretmeniM` başlığı ekliyordu. Firebase Auth bu başlığa CORS izni vermediği
  için tarayıcı isteği kesiyordu (Firestore fetch kullanmadığı için etkilenmedi). Artık başlık yalnız aynı kaynağa giden isteklere ekleniyor.
- Doğrulama: gerçek Firebase'e, var olmayan hesapla giriş denemesi — eski kod `auth/network-request-failed`, yeni kod `auth/invalid-credential`.
- Not: sahte Firebase ile yapılan arayüz denemeleri bunu yakalayamaz; giriş akışı gerçek projeyle de denenmeli.

## 10.11.2026 — Aşama 5: yüklenebilir uygulama (PWA)
- `manifest.webmanifest` (ad her yerde ÖğretmeniM), simgeler `img/uygulama-*.png` (maskable dahil), iPhone için `apple-touch-icon` ve meta etiketleri.
- `sw.js`: yayında sürüm + dosya listesiyle damgalanır; sitenin dosyalarını önbelleğe alır, Firebase'e dokunmaz; eski önbelleği siler.
  Yerelde damgasız olduğu için hiçbir şey önbelleğe almaz.
- `js/uygulama.js`: kayıt, yeni sürümde kendiliğinden yenileme (açık pencere varken beklenir), "📲 Uygulamayı yükle" (Android/masaüstü yükleme
  penceresi, iPhone'da adım adım yardım).
- Denendi: manifest okunuyor, 66 dosya önbellekte, internet kesikken uygulama açılıyor, yeni sürüm yayınlanınca önbellek değişip sayfa yenileniyor,
  iPhone görünümünde yardım penceresi açılıyor.

## 12.11.2026 — Toparlama: çelişkiler, roller, ders sayfası, aktarım, bildirim
- **Çelişkiler giderildi:** öğrenci not/ortalama görmez (notlar `sinav_notlari/{id}` ayrı belgede, kural yalnız veliye açık; `Parcala` etkinlikten
  ayırır, birleştirirken geri koyar). Konu Defteri, müzik, ödev ekleri, eski eşitleme/güncelleme/yedek/PIN panelleri kalktı
  (defter.js, disari.js, muzik.js, baglanti.js silindi). Profil fotoğrafı 256 px JPEG olarak profilde. Boş rapor anlamsız cümle kurmuyor.
- **Önemli hata:** mini oyunlar ve Cevap Kontrol sonuçlarını `fetch("/api/alistirma")` ile gönderiyordu; web'de bu adres yok, sonuçlar
  kaybediliyordu. Artık `api()` ile motora gidiyor. Yazılı içeriği de `/hazirlik/...` mutlak yolla aranıyordu (Pages alt klasöründe 404); göreli yapıldı.
- **İçerik paketleri:** `hazirlik/paketler.json` katalog; `yazili1.json` paketi `yazili-5-2026-d1-y1`. Öğrencinin ana belgesinde `icerik.paketler`;
  Hesapları yönet › öğrenci › İçerik paketleri. Atanmamış öğrencide yazılı hazırlık ve otomatik yazılı tarihleri yok. Ana belge `merge` ile yazılır.
- **Roller:** `body.veli-modu` / `.yalniz-veli` / `.yalniz-ogrenci`. Öğrenci: Bugün · Çalışma Masam · Öğren · Derslerim · Defterim.
  Veli: Özet · Dersler · Rapor (+ Ayarlar). Veli girişinde Özet açılır.
- **Ders sayfası** (`ders_sayfa.js`): sınavlar (velide notlu), kaynaklar, ders saatleri, yazılıya hazırlan, Notlarım (`ders_notlari`; öğrenci yazar, veli okur).
- **Veli Özet** (`veli_ozet.js`): durum şeridi, senden beklenenler (aynı türden çoksa tek satır), hızlı giriş, son 7 gün, yaklaşan sınavlar + hazırlık, son notlar.
  "Haberim var" → `ogrenciler/{oid}/veli/bilinen` (o gün tekrar çıkmaz; bildirime de gitmez).
- **Öğrenci dosyası** (`ogrenci_dosyasi.js`, `Motor.disaAktar/iceAktar`): biçim `ogretmenim-ogrenci-dosyasi` v1. Eski yedek .zip (fflate) ya da dosya.
  Önce deneme raporu; uygulamadan önce mevcut veri indirilir. Eşleştirme kimlik, yoksa doğal anahtar; ikinci yükleme hiçbir şey eklemez (test/ice_aktar_test.js).
  Konu Defteri + ekler arşivi tek HTML (fotoğraflar gömülü). Ayarlar › Sınıf › "Dersleri sınıflar arasında taşı".
- **Bildirimler:** istemci `bildirim.js` (FCM token, cihaz `kisiler/{ben}/cihazlar`, tercih `kisiler/{ben}/ayar/bildirim`); `sw.js` push + "Haberim var" eylemi;
  sunucu `araclar/bildirim/gonder.mjs` (firebase-admin) ve kurallar `uyarilar.mjs` (veli Özet'iyle aynı); `.github/workflows/bildirim.yml` 7. ve 37. dakikalarda.
  Günde bir kez, velinin saatinden sonra; gönderilen `ogrenciler/{oid}/veli/gonderilen`. VAPID anahtarı `firebase_ayar.js`.
- **Kelime listeleri** Ayarlar'da (yerel 0.33'teki ekranın web karşılığı).
- Testler: motor karşılaştırma 726 adım 0 fark (web'e özgü `icerik`, `ders_notlari` hariç), parça gidiş-dönüş, içe aktarım, uyarı kuralları; kurallar testine
  `sinav_notlari`, `veli/`, `kisiler/*/cihazlar` eklendi. Uçtan uca: sahte Firebase ile kurulum → hesaplar + paket → eski zip aktarımı → veli Özet/Dersler/Rapor/
  bildirim → öğrenci (notlu etkinlik 0) → ders notu → telefon görünümü; konsol hatası yok.

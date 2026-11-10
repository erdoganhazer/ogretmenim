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

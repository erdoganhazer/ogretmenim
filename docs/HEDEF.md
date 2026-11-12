# Hedef — ÖğretmeniM web

Arın'ın ev çalışma uygulamasını, Hazer'in bilgisayarına bağlı olmadan, telefonda ve bilgisayarda aynı hesaplarla çalışan bir web uygulamasına taşımak.

- Önceden tanımlı hesaplarla giriş (kullanıcı adı + şifre); yönetici, veli, öğrenci rolleri; çok öğrenci, çok veli.
- Yetki sunucuda (Firestore kuralları) denetlenir.
- Veli Paneli yok; her şey tek uygulamada. Öğrenci istatistik, not ve süre görmez.
- Konu Defteri, fotoğraflar (avatar hariç) ve ödev ekleri kalkar; eskileri taşımada arşiv olarak verilir.
- Ders sayfası: yazılı notları, ortalama, yaklaşan sınavlar, kaynaklar, ders programı, yazılı hazırlık, Notlarım.
- Çevrimdışı çalışan PWA (Samsung A05, Linux Mint'te otomatik açılış).
- Taşıma kayıpsız: eski yedek .zip'ten aktarım ve sayım raporu.

## Aşamalar
1. GitHub + Firebase ✓  2. Motor tarayıcıya ✓  3. Giriş, roller, yönetici, kurallar ✓ (kural testleri CI'da)
4. Veli görünümü, ders sayfası, Notlarım ✓  5. PWA, çevrimdışı ✓ (otomatik açılış kaldı)  6. Yedekten aktarım + rapor + arşiv ✓  7. Yan yana deneme ve geçiş
8. Veli bildirimleri ✓ (web push + GitHub zamanlanmış denetim)  9. Başarımlar (planlandı: docs/BASARIMLAR_PLANI.md)

## Kararlar (12.11.2026)
- Ticari ürün şimdilik durduruldu; Arın + iki veli için çelişkisiz kullanım önce. Ticari dönüş için şimdiden kurulan yapılar:
  hesaplarda `aile` alanı, sınav notlarının ayrı belgede (`sinav_notlari`, ileride öğretmen de yazar), içerik paketleri (`hazirlik/paketler.json`,
  öğrenciye atanır), sürümlü öğrenci dosyası (`ogretmenim-ogrenci-dosyasi` v1), rol listesi genişletilebilir.
- Öğrenci not, ortalama, süre görmez — veri de cihazına gelmez (kural düzeyinde).
- Öğrenci dosyası yıllar boyu taşınır: tüm sınıflar tek dosyada; dersler sınıflar arasında taşınabilir (ileri/geri).
- Başarımlar istendi (bronz/gümüş/altın); not ve süreye değil emeğe/düzene bağlı olacak.

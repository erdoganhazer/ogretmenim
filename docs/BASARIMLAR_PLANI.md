# Başarımlar planı (henüz uygulanmadı)

Tasarım taslağı: https://claude.ai/artifact/YX36bn1nuDEjoCAcPH7TxV

## İlke
- Emek ödüllendirilir: düzen, bitirme, öğrenme. Not, puan, süre, doğru/yanlış oranı ve başkasıyla kıyas **yok** (öğrenci not ve süre görmez kuralıyla uyumlu).
- Her aile 3 kademe: Bronz → Gümüş → Altın. Kilitli kademe gri görünür, altında yalnız "kaç tane kaldı" yazar.
- Kazanılan rozet geri alınmaz (kayıt silinse de).

## Aileler ve eşikler
| Aile | Ölçüt | Bronz | Gümüş | Altın |
|---|---|---|---|---|
| Ateş Serisi | Üst üste çalışılan gün (plan/alıştırma/ödev kaydı olan gün) | 3 | 7 | 21 |
| Görev Avcısı | Bitirilen ödev | 10 | 50 | 150 |
| Erkenci | Teslimden ≥1 gün önce bitirilen ödev | 5 | 20 | 60 |
| Kelime Ustası | Öğrenilen kelime (kutu ≥ 4) | 25 | 100 | 300 |
| Yazılı Kahramanı | Yazılı hazırlıkta tamamlanan konu | 3 | 10 | 25 |
| Kararlı | "Zorlandım" denip yine de bitirilen ödev | 1 | 5 | 15 |
| Not Ustası | Notlarım'a yazılan ders notu | 5 | 20 | 50 |
| Haftanın Yıldızı | Planın ≥ %90'ı biten hafta | 1 | 4 | 12 |
| Kâşif | Oynanan farklı oyun konusu | 5 | 15 | 40 |
| Gün Kapanışı | Gün sonu değerlendirmesi yapılan gün | 5 | 20 | 60 |

## Veri
- Sayımlar mevcut kayıtlardan hesaplanır (`odevler`, `kelimeler`, `plan_gun`, `alistirmalar`, `gunluk`, `ders_notlari`); yeni sayaç tutulmaz.
- Yeni belge `ogrenciler/{oid}/basarim/durum`: `{ kazanilan: { "<aile>-<kademe>": "<ISO tarih>" }, kutlanan: [...] }`. Öğrenci yazabilir (yalnız ekleme), veli okur.
- Hesaplama `web/js/basarim.js` içinde saf fonksiyon: `basarimHesapla(veri) → [{aile, sayi, kademe, sonraki}]`; test edilebilir.

## Görünüm
- Öğrenci **Bugün** şeridi: yeni kazanılan rozet + en yakın 3 hedefin ilerleme çubuğu.
- **Öğren › Başarımlarım**: 10 aile × 3 kademe ızgarası.
- Kazanılınca bir kez kısa kutlama (konfeti, rozet büyür); `kutlanan` listesine eklenir.
- Veli Özet'te küçük satır: "Bu hafta 2 yeni başarım".
- Rozetler satır içi SVG: madalyon + aile simgesi, gümüşte noktalı halka, altında defne ve yıldız.

## Uygulama sırası (sonra)
1. `basarim.js` + birim testi (gerçek Arın yedeğiyle beklenen sayılar).
2. Kural: `basarim/durum` yazma izni.
3. Bugün şeridi + Başarımlarım sayfası + kutlama.
4. Veli özet satırı.

# Mini Oyunlar — ders içerik dosyası şeması

Her ders tek bir dosyadır: `web/js/oyun/icerik/<kod>.js`. Dosya yalnız **bir** `dersTanimla({...})` çağrısı içerir (başka kod yok).
Hedef kitle: **5. sınıf** (10–11 yaş), Türkiye Yüzyılı Maarif Modeli (TYMM) programı ve MEB ders kitabı sırası.
Oyunlar yalnız fareyle oynanır; öğrenci yazı yazmaz.

```js
"use strict";
dersTanimla({
  kod: "fen",                       // matematik | turkce | fen | sosyal | ingilizce | almanca | din | bilisim
  ad: "Fen Bilimleri",
  simge: "🔬",
  kaynak: "TYMM Fen Bilimleri 5. sınıf programı; MEB ders kitabı sırası",
  uniteler: [
    {
      no: 1,                                        // kitaptaki sıra (1, 2, 3 …)
      ad: "Gökyüzündeki Komşularımız ve Biz",        // MEB'deki tam ad
      simge: "🌞",
      kisa: "Güneş, Ay ve Dünya",                    // kart altında görünen kısa açıklama (≤ 40 karakter)
      ozet: [                                        // "Hatırla" kartları: 4–10 adet, her biri 1–3 kısa cümle, çocuk diliyle
        "Güneş bir yıldızdır. Isı ve ışık kaynağıdır.",
        "Ay, Dünya'nın doğal uydusudur. Kendi ışığı yoktur; Güneş'ten aldığı ışığı yansıtır.",
      ],
      etkinlikler: [ /* aşağıdaki türlerden en az 3 farklı tür */ ],
    },
  ],
});
```

## Etkinlik ortak alanları

| Alan | Zorunlu | Açıklama |
|---|---|---|
| `id` | ✔ | Ders içinde benzersiz, küçük harf-rakam-tire: `u1-bilgi`, `u3-hucre-esle` |
| `tur` | ✔ | `sikli` · `dogruyanlis` · `eslestir` · `siniflandir` · `sirala` · `kelime` · `yazim` · `oyun` |
| `ad` | ✔ | Kartta görünen oyun adı, kısa ve çekici (≤ 28 karakter): "Ay'ın Evreleri", "Işık Dedektifi" |
| `simge` | ✔ | Tek emoji |
| `beceri` | ✔ | Velinin Gelişim ekranında göreceği beceri/konu adı (≤ 60 karakter): "Ay'ın evrelerini sıralama" |
| `yonerge` | – | Soru üstünde görünen kısa yönerge |

Bir turda en çok 10 soru sorulur; havuz daha büyükse her turda farklı sorular gelir (zorlanılanlar daha sık).

## Türler

**sikli** — çoktan seçmeli (boşluk doldurma da bununla: soruda `___` kullan)
```js
{ id: "u1-bilgi", tur: "sikli", ad: "Gökyüzü Bilgi Yarışması", simge: "❓", beceri: "Güneş ve Ay'ın özellikleri",
  sorular: [ { s: "Ay'ın ışığı nereden gelir?", d: "Güneş'ten", y: ["Kendisinden", "Dünya'dan", "Yıldızlardan"], a: "Ay ışık kaynağı değildir; Güneş'ten aldığı ışığı yansıtır." } ] }
```
`s` soru (≤ 180), `d` doğru şık, `y` 2–3 yanlış şık (şıklar ≤ 60 karakter, birbirinden ve `d`'den farklı), `a` kısa açıklama (≤ 200; yanlış cevaptan sonra gösterilir, öğretici olsun). En az 8 soru.

**dogruyanlis**
```js
{ id: "u1-dy", tur: "dogruyanlis", ad: "Doğru mu Yanlış mı?", simge: "⚖️", beceri: "…",
  ifadeler: [ { s: "Güneş bir gezegendir.", d: false, a: "Güneş bir yıldızdır." } ] }
```
En az 8 ifade; doğru ve yanlışlar dengeli olsun (her biri en az %30).

**eslestir** — soldakini seç, sağdaki eşine tıkla (tahtada 5'er çift)
```js
{ id: "u3-organel", tur: "eslestir", ad: "Organel Eşleştir", simge: "🧩", beceri: "…",
  yonerge: "Organeli seç, sonra görevine tıkla.",
  ciftler: [ { sol: "Çekirdek", sag: "Hücrenin yönetim merkezi", a: "…" } ] }
```
En az 6 çift. `sol` ve `sag` ≤ 70 karakter. Aynı `sag` iki farklı `sol`'a ait olmasın (tek doğru eş).

**siniflandir** — kartı doğru kutuya at
```js
{ id: "u4-isik", tur: "siniflandir", ad: "Işık Geçer mi?", simge: "💡", beceri: "…",
  yonerge: "Bu madde ışığı nasıl geçirir?",
  kutular: [ { kod: "saydam", ad: "Saydam", simge: "🪟" }, { kod: "yari", ad: "Yarı saydam", simge: "🌫️" }, { kod: "opak", ad: "Saydam olmayan", simge: "🧱" } ],
  kartlar: [ { m: "Pencere camı", k: "saydam", simge: "🪟", a: "Cam ışığın neredeyse tamamını geçirir." } ] }
```
2–6 kutu; en az 8 kart; her kutuya en az 2 kart. `simge` kartta isteğe bağlı.

**sirala** — öğeleri doğru sıraya tıkla
```js
{ id: "u1-evre", tur: "sirala", ad: "Ay'ın Evreleri", simge: "🌙", beceri: "…",
  diziler: [ { s: "Ay'ın evrelerini yeni aydan başlayarak sırala.", o: ["Yeni ay", "İlk dördün", "Dolunay", "Son dördün"], a: "…" } ] }
```
`o` doğru sıradadır (3–6 öğe, oyun karıştırır). En az 3 dizi. Sıra tartışmasız olmalı.

**kelime** (yabancı dil) — resim/Türkçe ↔ kelime eşleştirme; **yazim** — harf taşlarıyla kelimeyi yazma
```js
{ id: "u1-kelime", tur: "kelime", ad: "Word Match", simge: "🧩", beceri: "School Life kelimeleri",
  kelimeler: [ { e: "📚", en: "library", tr: "kütüphane" } ] }
{ id: "u1-yazim", tur: "yazim", ad: "Spelling Bee", simge: "🐝", beceri: "School Life kelimelerinin yazılışı",
  kelimeler: [ { e: "📚", en: "library", tr: "kütüphane" } ] }
```
`kelime` en az 10 kelime; emoji kelimeyi açıkça anlatmalı, ünite içinde aynı emoji iki kez kullanılmasın.
`yazim` için yalnız 3–10 harfli, boşluksuz kelimeler. Almancada da `en` alanı kullanılır (yabancı kelime);
`kelime` etkinliğinde isimler artikelli yazılır (`"der Tisch"`), `yazim` etkinliğinde artikelsiz (`"Tisch"`; ä ö ü ß kullanılabilir).

**oyun** — özel yazılmış oyun (yalnız: `carpim` = çarpım tablosu, `noktalama` = cümledeki boşluğa noktalama işareti koyma)
```js
{ id: "u2-carpim", tur: "oyun", oyun: "carpim", ad: "Çarpım Kahramanı", simge: "🦸", beceri: "Çarpım tablosu" }
{ id: "t2-noktalama", tur: "oyun", oyun: "noktalama", isaretler: [",", "?", "."], ad: "Noktalama Avcısı", simge: "🎯", beceri: "Virgül ve soru işareti" }
```
`isaretler` o temada işlenen işaretlerle sınırlar (seçenekler: `.` `,` `?` `!` `:` `...` `'`). Oyun sayılan 20 öğe yerine geçer.
Noktalama oyununa temaya özel cümleler verilebilir: `cumleler: ["Arın{,} bu akşam kitap okuyalım mı{?}", …]` — `{…}` boşluktur, içindeki işaret doğru cevaptır;
iki işaret de doğruysa `{.|!}` yaz. Boşluklardaki işaretler `isaretler` listesinde olmalı. En az 8 cümle; ders kitabı metinlerinden cümle kopyalama, kendi cümlelerini yaz.

## İçerik kuralları (çok önemli)

1. **Doğruluk.** Yalnız ders kitabı/öğretim programında olan ya da tartışmasız doğru bilgi. Emin olmadığın hiçbir şeyi yazma; o soruyu atla.
2. **Düzey.** 5. sınıf dili: kısa cümleler, bilinmeyen terim yok (ünitenin anahtar kavramları hariç). Soru kökü tek anlamlı, tek doğru cevaplı.
3. **Çeldiriciler** makul olsun (saçma şık yok) ama doğru cevapla karıştırılmayacak kadar net yanlış olsun. "Hepsi / Hiçbiri" şıkkı kullanma.
4. **Açıklamalar** öğretsin: neden doğru olduğunu bir cümlede söyle. Suçlayıcı değil, cesaretlendirici ton.
5. **Kişisel bilgi sorma**, öğrencinin kendi duygusunu/tercihini "yanlış" sayma. Din dersinde ibadeti yapıp yapmadığını sorma; yalnız bilgi. Ayet/dua mealleri gerekirse Diyanet (Kur'an Yolu) mealine sadık kal.
6. **Tekrar yok.** Aynı soru iki etkinlikte aynen olmasın.
7. **Her ünite:** 4–10 `ozet` kartı + en az 3 farklı türde etkinlik + toplamda en az 40 soru/kart/çift. Sayılar kitabın ağırlığına göre artabilir.
8. Türkçe karakterleri doğru kullan (ç, ğ, ı, İ, ö, ş, ü, â, î). Metinlerde HTML kullanma, düz metin yaz.

## Denetim

Her dosyayı yazdıktan sonra çalıştır ve hata kalmayana kadar düzelt:

```
node /home/claude/ogretmenim/araclar/icerik_dogrula.js /home/claude/ogretmenim/web/js/oyun/icerik/<kod>.js
```

## Yazılıya hazırlık içeriği (0.24)
Kaynak: `araclar/hazirlik/<ders>.py` içinde `YAZILI = {ders, ad, simge, yazili, tarih ("" olabilir), bicim, not, ciktilar: [...]}`.
Her çıktı: `{kod, ad, simge, soru (yazılıdaki soru sayısı), hap: [...], etkinlikler: [...]}`. `beceri` yazılmaz (kod + ad kullanılır).
- **hap** kartı düz metin ya da `{b: başlık, m: metin (**kalın**, \n satır), c: çizim}`.
- **c** (çizim) sikli, dogruyanlis ve acik sorularında da kullanılır: `evre:<yeniay|hilal|ilkdordun|siskin|dolunay|siskin2|sondordun|hilal2>`,
  `dizilis:<yeniay|dolunay>`, `gda`, `yorunge`, `aci:<derece>[:ABC]`, `acisiz:<derece>`, `aciolcer:<derece>`, `dogrular:<paralel|dik|kesisen>`,
  `kesisen:<d>` (O'da kesişen, a/b/c), `kesen:<d>` (d // e, 1–8 açılar, 2 = d), `cokgen:<n>[:kosegen]`, `cember`, `sembol:<dogru|isin|dogruparcasi>`.
- **acik** (yazılı provası): `sorular: [{s, c?, cevap: örnek cevap, noktalar: [2–6 anahtar nokta]}]`. Arın yazar, örnek cevabı görür,
  yazdığı noktaları işaretler; %60 ve üstü doğru sayılır.
- Metinli sorularda `s` = "METİN: …\n\nSORU: …" (kayıt anahtarı SORU kısmıdır). Aynı etkinlikte aynı soru metni (+çizim) iki kez olamaz.
- Denetim: `python3 araclar/hazirlik_derle.py`.

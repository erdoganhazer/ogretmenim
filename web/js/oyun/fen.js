/* ÖğretmeniM — Fen Bilimleri oyunları (0.11: Geri Dönüşüm Ayıklama, Hâl Değişimi) */
"use strict";

/* ---------- F1 Geri Dönüşüm Ayıklama ---------- */
const ATIK_KUTULARI = [
  { kod: "kagit", ad: "Kâğıt", simge: "📦", renk: "#2563EB" },
  { kod: "plastik", ad: "Plastik", simge: "🧴", renk: "#EAB308" },
  { kod: "cam", ad: "Cam", simge: "🫙", renk: "#16A34A" },
  { kod: "metal", ad: "Metal", simge: "🥫", renk: "#64748B" },
  { kod: "organik", ad: "Organik (kompost)", simge: "🍂", renk: "#92400E" },
  { kod: "pil", ad: "Pil ve elektronik", simge: "🔋", renk: "#DC2626" },
];
// [simge, ad, kutu, açıklama]
const ATIKLAR = [
  ["📰", "Eski gazete", "kagit", "Gazete, dergi ve defter kâğıtları geri dönüşünce yeniden kâğıt olur; böylece daha az ağaç kesilir."],
  ["📦", "Karton koli", "kagit", "Karton kâğıttan yapılır. Katlayıp kâğıt kutusuna atmak yer kazandırır."],
  ["📓", "Biten defter", "kagit", "Defter kâğıttır; kâğıt kutusuna gider."],
  ["🧻", "Havlu kâğıt rulosunun kartonu", "kagit", "Rulonun ortasındaki karton kâğıt atığıdır."],
  ["🍼", "Pet su şişesi", "plastik", "Pet şişeler plastiktir; eritilip yeni plastik ürünlere dönüştürülür."],
  ["🧴", "Boş şampuan şişesi", "plastik", "Şampuan şişesi plastiktir; içini boşaltıp plastik kutusuna atarız."],
  ["🥣", "Plastik yoğurt kabı", "plastik", "Yoğurt kabı plastiktir. Önce içini boşaltıp çalkalamak iyi olur."],
  ["🛍️", "Plastik poşet", "plastik", "Poşet plastiktir. Az kullanmak, bez çanta taşımak daha da iyidir."],
  ["🫙", "Boş reçel kavanozu", "cam", "Kavanoz camdır; cam defalarca eritilip yeniden kullanılabilir."],
  ["🍾", "Cam şişe", "cam", "Cam şişeler cam kumbarasına atılır."],
  ["🥫", "Konserve kutusu", "metal", "Konserve kutuları metaldir; eritilip yeniden metal yapılır."],
  ["🥤", "Alüminyum içecek kutusu", "metal", "İçecek kutuları alüminyumdur, yani metaldir."],
  ["🔩", "Paslı vida", "metal", "Vida metalden yapılır."],
  ["🍌", "Muz kabuğu", "organik", "Meyve ve sebze artıkları organiktir; toprağa karışınca gübre (kompost) olur."],
  ["🥚", "Yumurta kabuğu", "organik", "Yumurta kabuğu organik atıktır; kompostta toprağı zenginleştirir."],
  ["🍎", "Elma koçanı", "organik", "Meyve artıkları organik atıktır."],
  ["🫖", "Demlenmiş çay posası", "organik", "Çay posası organiktir; bitkiler için güzel bir gübredir."],
  ["🥕", "Havuç kabukları", "organik", "Sebze kabukları organik atıktır."],
  ["🔋", "Biten pil", "pil", "Piller zararlı maddeler içerir! Asla çöpe atılmaz, pil toplama kutusuna verilir."],
  ["📱", "Bozuk cep telefonu", "pil", "Telefonlar elektronik atıktır; içindeki değerli ve zararlı maddeler için özel toplama noktasına verilir."],
  ["🎧", "Bozuk kulaklık", "pil", "Kulaklık elektronik atıktır; elektronik atık kutusuna gider."],
  ["🔌", "Eski şarj kablosu", "pil", "Kablolar elektronik atıktır."],
];

oyunTanimla({
  id: "geri-donusum", ders: "fen", ad: "Geri Dönüşüm Ayıklama", simge: "♻️", kisa: "Atığı doğru kutuya at",
  konu: "Sürdürülebilir Yaşam ve Geri Dönüşüm",
  async baslat(ctx) {
    const havuz = ATIKLAR.map(([simge, metin, kutu, aciklama]) => {
      const k = ATIK_KUTULARI.find(x => x.kod === kutu);
      return { anahtar: metin, kart: { simge, metin }, kutular: ATIK_KUTULARI, dogru: kutu, aciklama,
        beceri: "fen.atik." + kutu, beceri_adi: "Atık ayırma: " + k.ad, konu: "Sürdürülebilir Yaşam ve Geri Dönüşüm",
        yonerge: "Bu atık hangi kutuya gider?" };
    });
    const sonuc = await turOyna(ctx, agirlikliSec(ctx, havuz, 10), gosterSiniflandir, { dogrudaAciklama: true });
    turSonu(ctx, sonuc, { not: "♻️ Her doğru ayırdığın atık, doğaya bir iyilik!" });
  },
});

/* ---------- F2 Hâl Değişimi ---------- */
const HAL_DEGISIMLERI = {
  erime: { ad: "Erime", gecis: "Katı → Sıvı", isi: "alir" },
  donma: { ad: "Donma", gecis: "Sıvı → Katı", isi: "verir" },
  buharlasma: { ad: "Buharlaşma", gecis: "Sıvı → Gaz", isi: "alir" },
  yogusma: { ad: "Yoğuşma", gecis: "Gaz → Sıvı", isi: "verir" },
  sublimlesme: { ad: "Süblimleşme", gecis: "Katı → Gaz", isi: "alir" },
  kiragilasma: { ad: "Kırağılaşma", gecis: "Gaz → Katı", isi: "verir" },
};
// [simge, olay, hâl değişimi]
const HAL_OLAYLARI = [
  ["🍦", "Güneşte kalan dondurmanın akması", "erime"],
  ["🕯️", "Yanan mumun kenarlarının sıvılaşması", "erime"],
  ["⛄", "İlkbaharda karların yok olması", "erime"],
  ["🧈", "Sıcak tavaya konan tereyağının sıvılaşması", "erime"],
  ["🧊", "Buzluğa konan suyun buz olması", "donma"],
  ["🏞️", "Kışın göl yüzeyinin buz tutması", "donma"],
  ["🍫", "Erimiş çikolatanın buzdolabında sertleşmesi", "donma"],
  ["👕", "Islak çamaşırların ipte kuruması", "buharlasma"],
  ["💧", "Yerdeki su birikintisinin güneşte kaybolması", "buharlasma"],
  ["🍲", "Ocakta kaynayan suyun zamanla azalması", "buharlasma"],
  ["🥛", "Soğuk su bardağının dışında damlacıklar oluşması", "yogusma"],
  ["🪞", "Duştan sonra banyo aynasının buğulanması", "yogusma"],
  ["🫖", "Çaydanlık kapağının iç yüzünde su damlaları oluşması", "yogusma"],
  ["👓", "Soğuktan sıcak odaya girince gözlüğün buğulanması", "yogusma"],
  ["🧦", "Dolaptaki naftalinin zamanla küçülüp kaybolması", "sublimlesme"],
  ["🌫️", "Kuru buzun erimeden doğrudan dumana dönüşmesi", "sublimlesme"],
  ["🌱", "Soğuk kış sabahı çimenlerin üzerinde kırağı oluşması", "kiragilasma"],
  ["🪟", "Çok soğuk günde pencere camında buz çiçekleri oluşması", "kiragilasma"],
];
const HAL_KUTULARI = Object.entries(HAL_DEGISIMLERI).map(([kod, h]) => ({ kod, ad: h.ad, simge: h.gecis.replace(" → ", "→") }));

function halAciklama(kod) {
  const h = HAL_DEGISIMLERI[kod];
  return `<b>${h.ad}</b>: ${h.gecis}. Bu değişimde madde ısı <b>${h.isi === "alir" ? "alır" : "verir"}</b>.`;
}

oyunTanimla({
  id: "hal-degisimi", ders: "fen", ad: "Hâl Değişimi", simge: "🧊", kisa: "Erime, donma, yoğuşma…",
  konu: "Maddenin Doğası",
  async baslat(ctx) {
    const olaylar = HAL_OLAYLARI.map(([simge, metin, kod]) => ({
      tur: "olay", anahtar: metin, kart: { simge, metin }, kutular: HAL_KUTULARI, dogru: kod, aciklama: halAciklama(kod),
      beceri: "fen.hal.olay", beceri_adi: "Hâl değişimi: günlük hayattaki örnekleri tanıma", konu: "Maddenin Doğası",
      yonerge: "Bu olayda hangi hâl değişimi var?",
    }));
    const gecisler = Object.entries(HAL_DEGISIMLERI).map(([kod, h]) => ({
      tur: "gecis", anahtar: h.gecis + " = ?", beceri: "fen.hal.ad", beceri_adi: "Hâl değişimi: adları", konu: "Maddenin Doğası",
      ust: "Maddenin hâli şöyle değişiyor. Bu değişimin adı ne?",
      soruHtml: `<span class="hal-gecis">${h.gecis.replace("→", "<span>➜</span>")}</span>`,
      secenekler: Object.values(HAL_DEGISIMLERI).map(x => x.ad), dogru: h.ad, sutun: 3, aciklama: halAciklama(kod),
    }));
    const isiler = Object.entries(HAL_DEGISIMLERI).map(([kod, h]) => ({
      tur: "isi", anahtar: h.ad + ": ısı?", beceri: "fen.hal.isi", beceri_adi: "Hâl değişimi: ısı alma / verme", konu: "Maddenin Doğası",
      kart: { simge: "🌡️", metin: `${h.ad} (${h.gecis})` },
      kutular: [{ kod: "alir", ad: "Isı alır", simge: "🔥", renk: "#EA580C" }, { kod: "verir", ad: "Isı verir", simge: "❄️", renk: "#0284C7" }],
      dogru: h.isi, yonerge: "Bu hâl değişiminde madde ısı alır mı, verir mi?",
      aciklama: `Erime, buharlaşma ve süblimleşmede madde <b>ısı alır</b>; donma, yoğuşma ve kırağılaşmada <b>ısı verir</b>.`,
    }));
    const sorular = karistir([...agirlikliSec(ctx, olaylar, 5), ...agirlikliSec(ctx, gecisler, 3), ...agirlikliSec(ctx, isiler, 2)]);
    const sonuc = await turOyna(ctx, sorular, (kap, s, cevapla) => (s.tur === "gecis" ? gosterSikli : gosterSiniflandir)(kap, s, cevapla));
    turSonu(ctx, sonuc);
  },
});

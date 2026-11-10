/* ÖğretmeniM — Din Kültürü ve Ahlak Bilgisi oyunları (0.11)
   5. sınıf üniteleri: Allah İnancı · Namaz · Kur'an-ı Kerim · Peygamber Kıssaları · Mimarimizde Dinî Motifler.
   Yalnız bilgi düzeyinde, ders kitabıyla uyumlu olgular; ibadet "performansı" ölçülmez. */
"use strict";

/* ---------- D1 Güzel İsimler (Esmaü'l-Hüsna) — Ünite 1 ---------- */
const ESMA = [
  ["Er-Rahmân", "Dünyada bütün canlılara merhamet eden"],
  ["Er-Rahîm", "Ahirette müminlere merhamet eden"],
  ["El-Hâlık", "Her şeyi yoktan yaratan"],
  ["El-Alîm", "Her şeyi bilen"],
  ["Es-Semî", "Her şeyi işiten"],
  ["El-Basîr", "Her şeyi gören"],
  ["El-Kadîr", "Her şeye gücü yeten"],
  ["El-Adl", "Son derece adaletli olan"],
  ["El-Vedûd", "Kullarını çok seven"],
  ["El-Kerîm", "Çok cömert olan"],
  ["Er-Rezzâk", "Bütün canlıların rızkını veren"],
  ["El-Gafûr", "Günahları çokça bağışlayan"],
  ["El-Hakîm", "Her işi hikmetli, yerli yerinde olan"],
  ["Es-Selâm", "Esenlik ve barış veren"],
  ["El-Latîf", "Kullarına iyilik ve lütufta bulunan"],
];

oyunTanimla({
  id: "guzel-isimler", ders: "din", ad: "Güzel İsimler", simge: "✨", kisa: "Esmaü'l-Hüsna ve anlamları",
  konu: "Allah İnancı",
  async baslat(ctx) {
    const havuz = ESMA.map(([ad, anlam]) => ({ anahtar: ad, sol: ad, sag: anlam, beceri: "din.esma", beceri_adi: "Allah'ın güzel isimleri", konu: "Allah İnancı" }));
    const secilen = agirlikliSec(ctx, havuz, 10);
    let dogru = 0, toplam = 0;
    for (const [i, t] of [secilen.slice(0, 5), secilen.slice(5, 10)].entries()) {
      if (ctx.kapandi) return;
      const r = await eslestirmeOyna(ctx, t, { yonerge: `${i + 1}/2 — İsmi seç, sonra anlamına tıkla.`, ilerlemeBas: i * 5, ilerlemeToplam: 10 });
      dogru += r.dogru; toplam += r.toplam;
    }
    turSonu(ctx, { dogru, toplam }, { not: "✨ Allah'ın güzel isimlerine Esmaü'l-Hüsna denir." });
  },
});

/* ---------- D2 Kur'an'ı Tanıyorum — Ünite 3 ---------- */
// [soru, doğru, [çeldiriciler], açıklama]
const KURAN_SORULARI = [
  ["Kur'an-ı Kerim'de kaç sure vardır?", "114", ["30", "99", "124"], "Kur'an-ı Kerim 114 sureden oluşur."],
  ["Kur'an-ı Kerim kaç cüzdür?", "30", ["20", "40", "114"], "Kur'an-ı Kerim 30 cüzdür; bir cüz yaklaşık 20 sayfadır."],
  ["Kur'an-ı Kerim'in ilk suresi hangisidir?", "Fâtiha", ["Bakara", "İhlas", "Nâs"], "Mushafın ilk suresi Fâtiha suresidir."],
  ["Kur'an-ı Kerim'in son suresi hangisidir?", "Nâs", ["Fâtiha", "Kevser", "İhlas"], "Mushafın son suresi Nâs suresidir."],
  ["Kur'an-ı Kerim'in en uzun suresi hangisidir?", "Bakara", ["Fâtiha", "Yâsin", "Kevser"], "En uzun sure 286 ayetlik Bakara suresidir."],
  ["Kur'an-ı Kerim'in en kısa suresi hangisidir?", "Kevser", ["Bakara", "Fâtiha", "Yâsin"], "En kısa sure 3 ayetlik Kevser suresidir."],
  ["Surelerin her bir bölümüne (cümlesine) ne ad verilir?", "Ayet", ["Cüz", "Hizip", "Mushaf"], "Surelerin her bir bölümüne ayet denir."],
  ["Birden çok ayetten oluşan, başı ve sonu belli bölümlere ne denir?", "Sure", ["Ayet", "Cüz", "Hadis"], "Ayetlerden oluşan bölümlere sure denir."],
  ["Kur'an-ı Kerim'in yaklaşık 20 sayfalık bölümlerine ne denir?", "Cüz", ["Sure", "Ayet", "Hizip"], "Yaklaşık 20 sayfalık bölümlere cüz denir."],
  ["Bir cüzün dörtte birine (yaklaşık 5 sayfa) ne denir?", "Hizip", ["Ayet", "Sure", "Mushaf"], "Cüzün dörtte birine hizip denir."],
  ["Kur'an-ı Kerim'in kitap hâline getirilmiş şekline ne ad verilir?", "Mushaf", ["Hizip", "Cüz", "Tefsir"], "Sayfaları bir araya getirilip kitap hâline getirilmiş Kur'an'a mushaf denir."],
  ["Kur'an-ı Kerim hangi ayda indirilmeye başlanmıştır?", "Ramazan", ["Muharrem", "Recep", "Şevval"], "Kur'an Ramazan ayında, Kadir gecesi indirilmeye başlanmıştır."],
  ["İlk vahiy nerede gelmiştir?", "Hira mağarasında", ["Sevr mağarasında", "Kâbe'de", "Medine'de"], "İlk vahiy Nur dağındaki Hira mağarasında gelmiştir."],
  ["İlk inen ayetler hangi surededir?", "Alak", ["Fâtiha", "Bakara", "İhlas"], "İlk inen ayetler Alak suresinin ilk beş ayetidir; \"Oku!\" emriyle başlar."],
  ["Vahiy meleğinin adı nedir?", "Cebrail", ["Mikail", "İsrafil", "Azrail"], "Vahiyleri peygamberlere getiren melek Cebrail'dir."],
  ["Kur'an-ı Kerim yaklaşık kaç yılda tamamlanmıştır?", "23", ["10", "40", "63"], "Kur'an-ı Kerim yaklaşık 23 yılda indirilmiştir."],
  ["Kur'an-ı Kerim hangi halife döneminde kitap (mushaf) hâline getirilmiştir?", "Hz. Ebubekir", ["Hz. Ömer", "Hz. Osman", "Hz. Ali"], "Hz. Ebubekir döneminde mushaf hâline getirilmiş, Hz. Osman döneminde çoğaltılmıştır."],
  ["Mushaf hangi halife döneminde çoğaltılıp başka şehirlere gönderilmiştir?", "Hz. Osman", ["Hz. Ebubekir", "Hz. Ömer", "Hz. Ali"], "Hz. Osman döneminde mushaf çoğaltılıp önemli şehirlere gönderilmiştir."],
  ["\"De ki: O Allah birdir.\" ayetiyle başlayan sure hangisidir?", "İhlas", ["Fâtiha", "Kevser", "Nâs"], "İhlas suresi Allah'ın bir olduğunu anlatır; 5. sınıfta anlamıyla öğrenilir."],
];

const KURAN_INIS = ["hangi ayda", "İlk vahiy", "İlk inen", "Vahiy meleğinin", "kaç yılda", "kitap (mushaf) hâline", "çoğaltılıp"];

oyunTanimla({
  id: "kurani-taniyorum", ders: "din", ad: "Kur'an'ı Tanıyorum", simge: "📖", kisa: "Sure, ayet, cüz ve vahiy",
  konu: "Kur'an-ı Kerim",
  async baslat(ctx) {
    const havuz = KURAN_SORULARI.map(([soru, dogru, yanlislar, aciklama]) => ({
      anahtar: soru, soruHtml: esc(soru), secenekler: [dogru, ...yanlislar], dogru, aciklama, sutun: 2,
      beceri: KURAN_INIS.some(k => soru.includes(k)) ? "din.kuran.inis" : "din.kuran.duzen",
      beceri_adi: KURAN_INIS.some(k => soru.includes(k)) ? "Kur'an'ın indirilişi ve korunması" : "Kur'an'ın iç düzeni (sure, ayet, cüz)",
      konu: "Kur'an-ı Kerim",
    }));
    const sonuc = await turOyna(ctx, agirlikliSec(ctx, havuz, 10), gosterSikli, { dogrudaAciklama: true });
    turSonu(ctx, sonuc);
  },
});

/* ---------- D3 Camiyi Tanıyalım — Ünite 5 ---------- */
const CAMI_BOLUMLERI = [
  ["🧭 Mihrap", "Kıble yönünü gösteren, imamın namaz kıldırdığı oyuk"],
  ["🪜 Minber", "Cuma ve bayram hutbelerinin okunduğu merdivenli yer"],
  ["🪑 Kürsü", "Vaaz ve sohbetlerin yapıldığı yüksekçe oturma yeri"],
  ["🕌 Minare", "Ezanın okunduğu yüksek kule"],
  ["⭕ Şerefe", "Minarede ezan okunan balkon"],
  ["🔵 Kubbe", "Caminin üstünü örten yarım küre biçimli çatı"],
  ["⛲ Şadırvan", "Avluda abdest almak için yapılan musluklu yapı"],
  ["🏛️ Son cemaat yeri", "Caminin girişinde, üstü örtülü ön bölüm"],
  ["🧱 Avlu", "Caminin çevresindeki duvarla çevrili açık alan"],
  ["🎙️ Müezzin mahfili", "Müezzinin namazda tekbir ve dualar okuduğu yüksek bölüm"],
];
const CAMI_ORNEKLERI = [
  ["Selimiye Camii", "Edirne — Mimar Sinan'ın ustalık eseri"],
  ["Süleymaniye Camii", "İstanbul — Mimar Sinan'ın kalfalık eseri"],
  ["Sultanahmet Camii", "İstanbul — altı minareli, \"Mavi Cami\""],
  ["Divriği Ulu Camii", "Sivas — taş işçiliğiyle UNESCO listesinde"],
  ["Bursa Ulu Camii", "Bursa — 20 kubbeli, içinde şadırvan var"],
];

oyunTanimla({
  id: "camiyi-taniyalim", ders: "din", ad: "Camiyi Tanıyalım", simge: "🕌", kisa: "Caminin bölümleri ve ünlü camiler",
  konu: "Mimarimizde Dinî Motifler",
  async baslat(ctx) {
    const bolumler = CAMI_BOLUMLERI.map(([ad, tanim]) => ({ anahtar: ad.replace(/^\S+\s/, ""), sol: ad, sag: tanim,
      beceri: "din.cami.bolum", beceri_adi: "Caminin bölümleri", konu: "Mimarimizde Dinî Motifler" }));
    const ornekler = CAMI_ORNEKLERI.map(([ad, yer]) => ({ anahtar: ad, sol: ad, sag: yer,
      beceri: "din.cami.ornek", beceri_adi: "Kültürümüzden cami örnekleri", konu: "Mimarimizde Dinî Motifler" }));
    let dogru = 0, toplam = 0;
    // 1. tahta: bölümler; 2. tahta: ya kalan bölümler ya da ünlü camiler
    const ilk = agirlikliSec(ctx, bolumler, 5);
    const kalan = bolumler.filter(b => !ilk.includes(b));
    const tahtalar = [
      [ilk, "1/2 — Bölümün adını seç, sonra tanımına tıkla."],
      Math.random() < .5 ? [ornekler, "2/2 — Camiyi seç, sonra bulunduğu şehre tıkla."] : [agirlikliSec(ctx, kalan, 5), "2/2 — Bölümün adını seç, sonra tanımına tıkla."],
    ];
    for (const [i, [t, yonerge]] of tahtalar.entries()) {
      if (ctx.kapandi) return;
      const r = await eslestirmeOyna(ctx, t, { yonerge, ilerlemeBas: i * 5, ilerlemeToplam: 10 });
      dogru += r.dogru; toplam += r.toplam;
    }
    turSonu(ctx, { dogru, toplam }, { not: "🕌 Bir dahaki cami ziyaretinde bu bölümleri bulmaya çalış!" });
  },
});

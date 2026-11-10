/* ÖğretmeniM — Sosyal Bilgiler oyunları (0.11: Medeniyetler Pazarı) */
"use strict";

/* ---------- S1 Medeniyetler Pazarı ----------
   Buluş, eser ya da özelliği doğru medeniyet / yerleşim yeriyle eşle.
   [soldaki kart, medeniyet, bölge, açıklama] */
const MEDENIYET_BOLGELERI = {
  mezopotamya: { ad: "Mezopotamya medeniyetleri" },
  anadolu: { ad: "Anadolu medeniyetleri" },
  yerlesim: { ad: "Anadolu'nun ilk yerleşim yerleri" },
};
const MEDENIYET_BILGILERI = [
  ["🔺 Çivi yazısı", "Sümerler", "mezopotamya", "Yazıyı ilk bulan Sümerlerdir. Kil tabletlere çivi biçiminde işaretler kazırlardı."],
  ["🛕 Ziggurat tapınakları", "Sümerler", "mezopotamya", "Zigguratlar Sümerlerin basamaklı tapınaklarıdır; gözlemevi ve ambar olarak da kullanılırdı."],
  ["⚖️ Hammurabi Kanunları", "Babiller", "mezopotamya", "Babil Kralı Hammurabi'nin kanunları, en bilinen yazılı kanunlardandır."],
  ["🌿 Asma bahçeleri", "Babiller", "mezopotamya", "Babil'in Asma Bahçeleri dünyanın yedi harikasından biri sayılır."],
  ["📚 Ninova Kütüphanesi", "Asurlar", "mezopotamya", "Asur Kralı Asurbanipal'in Ninova'daki kütüphanesi binlerce kil tablet içerir."],
  ["🐪 Kültepe'de ticaret kolonileri (Karum)", "Asurlar", "mezopotamya", "Asurlu tüccarlar Kayseri Kültepe'de ticaret merkezleri kurdu; Anadolu'ya yazıyı da onlar getirdi."],
  ["🤝 Kadeş Antlaşması", "Hititler", "anadolu", "Hititler ile Mısırlılar arasında yapılan Kadeş Antlaşması bilinen ilk yazılı antlaşmadır."],
  ["🏰 Başkent Hattuşa", "Hititler", "anadolu", "Hititlerin başkenti Hattuşa'dır (Çorum, Boğazkale)."],
  ["🪙 İlk madenî para", "Lidyalılar", "anadolu", "Parayı ilk kullanan Lidyalılardır; bu, ticareti çok kolaylaştırdı."],
  ["🏛️ Başkent Sardes", "Lidyalılar", "anadolu", "Lidyalıların başkenti Sardes'tir (Manisa, Salihli)."],
  ["💧 Su kanalları ve barajlar", "Urartular", "anadolu", "Urartular Van Gölü çevresinde su kanalları ve barajlar yaptı; madencilikte de ustaydılar."],
  ["⛰️ Başkent Tuşpa", "Urartular", "anadolu", "Urartuların başkenti Tuşpa'dır (Van)."],
  ["👑 Kral Midas ve Gordion", "Frigler", "anadolu", "Friglerin başkenti Gordion'dur (Ankara, Polatlı). Kral Midas en ünlü kralıdır."],
  ["🌾 Tarıma büyük önem", "Frigler", "anadolu", "Frigler tarıma çok önem verirdi; tarlaya ve öküze zarar vermek ağır cezalandırılırdı."],
  ["🧠 Tales ve Heredot (bilim, felsefe, tarih)", "İyonlar", "anadolu", "Ege kıyısındaki İyon şehirleri bilim ve felsefenin merkeziydi."],
  ["⛵ Ege kıyısında liman şehirleri (Efes)", "İyonlar", "anadolu", "İyonlar Batı Anadolu kıyılarında Efes gibi liman şehirleri kurdu ve denizcilikle uğraştı."],
  ["🗿 Bilinen en eski tapınak alanı", "Göbeklitepe", "yerlesim", "Şanlıurfa'daki Göbeklitepe yaklaşık 12.000 yıllıktır; bilinen en eski tapınak alanıdır."],
  ["🏘️ Damdan girilen bitişik evler", "Çatalhöyük", "yerlesim", "Konya'daki Çatalhöyük'te evler bitişikti; kapı yerine damdaki açıklıktan merdivenle girilirdi."],
  ["🎨 Duvar resimleri", "Çatalhöyük", "yerlesim", "Çatalhöyük evlerinin duvarlarında av sahneleri gibi resimler bulunmuştur."],
];

oyunTanimla({
  id: "medeniyetler", ders: "sosyal", ad: "Medeniyetler Pazarı", simge: "🏺", kisa: "Buluşu medeniyetiyle eşle",
  konu: "Ortak Mirasımız",
  async baslat(ctx) {
    const havuz = MEDENIYET_BILGILERI.map(([sol, sag, bolge, aciklama]) => ({
      anahtar: sol.replace(/^\S+\s/, ""), sol, sag, aciklama,
      beceri: "sos.medeniyet." + bolge, beceri_adi: MEDENIYET_BOLGELERI[bolge].ad, konu: "Ortak Mirasımız",
    }));
    // Zorlanılanlar öne; her tahtada her medeniyet en fazla bir kez
    const sirali = agirlikliSec(ctx, havuz, havuz.length);
    const tahtalar = [[], []];
    for (const c of sirali) {
      const t = tahtalar.find(t => t.length < 5 && !t.some(x => x.sag === c.sag));
      if (t) t.push(c);
      if (tahtalar.every(t => t.length === 5)) break;
    }
    let dogru = 0, toplam = 0;
    for (const [i, t] of tahtalar.entries()) {
      if (ctx.kapandi) return;
      const r = await eslestirmeOyna(ctx, t, {
        yonerge: `Pazar tezgâhı ${i + 1}/2 — Soldaki buluşu seç, sonra onu yapan medeniyete tıkla.`,
        ilerlemeBas: i * 5, ilerlemeToplam: 10,
      });
      dogru += r.dogru; toplam += r.toplam;
    }
    turSonu(ctx, { dogru, toplam }, { not: "🏺 Anadolu ve Mezopotamya, insanlığa yazıdan paraya pek çok armağan verdi!" });
  },
});

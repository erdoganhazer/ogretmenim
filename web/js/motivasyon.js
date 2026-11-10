/* ÖğretmeniM — motivasyon balonu
   Ödev/sınav durumuna göre çocuk diliyle, suçlamadan, özgüveni besleyen mesajlar.
   İlke: çabayı öv (sonucu değil), hatayı öğrenmenin parçası say, işi küçük adımlara böl, "yapabilirsin" de. */
"use strict";

const MOTIVASYON = {
  sinav_bugun: [
    "Bugün {ders} sınavın var. Derin bir nefes al… Çalıştın, biliyorsun. Kendine güven! ⭐",
    "{ders} sınavı bugün! Soruları sakin sakin oku, bildiğin yerden başla. Sen hazırsın! 💪",
    "Bugün {ders} sınavında elinden gelenin en iyisini yapacaksın. Bu kadarı yeterli! 🌟",
    "Bugün {ders} sınavı var. Bildiklerini kâğıda dökme günü, o kadar.",
    "{ders} sınavı bugün. Zor bir soruya takılırsan geç, sonra dön.",
    "Sınav günü! Kahvaltını yaptın mı? Tok karın, açık zihin. 🍞",
    "{ders} sınavında acele etme; süre yeterli, sen de hazırsın.",
    "Bugün {ders} sınavı. Heyecan normal, nefesini yavaşlat yeter.",
    "Bildiğin soruları önce çöz, puanlar cebinde olsun. Bugün {ders} sınavı!",
    "{ders} sınavında sorunun ne istediğini iki kez oku. Çoğu hata acelecilikten.",
    "Bugün sınav var ama sen bu konuları çalıştın. Kendine güven.",
    "{ders} sınavı için son tavsiye: kontrol etmeyi unutma. 🔍",
    "Bugün {ders} sınavı. Elinden geleni yaparsan sonuç ne olursa olsun gurur duy.",
    "Sınav sadece bir ölçüm, sen ondan çok daha fazlasısın. Bugün {ders}.",
    "{ders} sınavında rahat ol; önce adını yaz, sonra derin nefes, sonra başla. 😊",
  ],
  bugun_teslim: [
    "{ders} ödevinin teslim günü bugün. Bitiş çizgisi göründü, az kaldı! 🏁",
    "Bugün {ders} ödevini tamamlama günü. Bir kere başla, gerisi kendiliğinden gelir! 🚀",
    "{ders} ödevi seni bekliyor. Birlikte bitirince içinin nasıl rahatlayacağını düşün! 😊",
    "{ders} ödevini bugün teslim ediyorsun. Çantana koydun mu?",
    "Bugün {ders} ödevi isteniyor. Bitmediyse ilk fırsatta tamamla.",
    "{ders} için bugün son gün. Hadi, birkaç dakika yeter belki!",
    "Teslim günü: {ders}. Öğretmenine gururla uzatacağın bir ödev olsun.",
    "{ders} ödevi bugün okulda. Bir kez daha kontrol etmek iyi fikir.",
    "Bugün {ders} ödevinin günü. Eksik bir yer kaldıysa şimdi bakalım.",
    "{ders} ödevini bugün götürüyorsun. Adını yazdın mı? ✏️",
    "Bugünün önemli işi {ders} ödevini teslim etmek.",
    "{ders} ödevi bugün kontrol edilecek. Hazırsın!",
    "Bitirdiysen harika, bitirmediysen şimdi tam zamanı: {ders}.",
    "{ders} ödevi bugün. Küçük bir son dokunuş, sonra rahatla.",
    "Bugün teslim edilecek bir {ders} ödevin var. Unutmayalım.",
  ],
  geciken: [
    "Bazı ödevler biraz gecikmiş, olsun! Herkesin başına gelir. Birini seç ve bitir, kendini çok iyi hissedeceksin. 🌱",
    "Geciken bir ödevin var. Dert etme; şimdi küçük bir adım at, gerisi daha kolay olacak. 👣",
    "Bir ödevi yetiştirememiş olabilirsin, önemli olan şimdi ne yaptığın. Hadi, en kısa olanından başla! 💡",
    "Geciken bir ödevin var. En kısasından başlarsan çabuk toparlarsın.",
    "Gecikmiş işler omzunda yük gibi durur. Birini bitir, hafifle.",
    "Bir ödev beklemede kalmış. Şimdi beş dakika ayır, başla.",
    "Gecikme olur, önemli olan toparlamak. Çalışma Masam'da sırası belli.",
    "Bir ödevin süresi geçmiş. Bugün bitirip öğretmenine götürebilirsin.",
    "Geride kalan ödev seni bekliyor. Bitirince içini rahatlatacak.",
    "Dünden kalan bir iş var. Bugüne taze başlamak için önce onu kapat.",
    "Gecikmiş ödev, unutulmuş ödev değildir. Hadi tamamlayalım.",
    "Biraz geç kaldık ama telafisi kolay. İlk adımı at.",
    "Geciken ödevi bitirmek, en çok iyi hissettiren iştir.",
    "Bir ödevin teslimi geçti. Velin de biliyor; birlikte çözersiniz.",
    "Eksik kalan bir iş var. Bugün onu listenin başına koyalım.",
  ],
  sinav_yakin: [
    "{gun} gün sonra {ders} sınavın var. Her gün biraz tekrar yaparsan beynin bilgileri daha iyi saklar! 🧠",
    "{ders} sınavına {gun} gün kaldı. Bugün sadece 15 dakika çalışsan bile büyük fark yaratır! ⏱️",
    "{ders} sınavı yaklaşıyor. Hazırlanmak için bolca vaktin var ve sen bunu başarabilirsin! 📚",
    "{ders} sınavına {gun} gün var. Her gün biraz tekrar, sınav günü rahatlık.",
    "{gun} gün sonra {ders} sınavı. Bugün defterini bir kez gözden geçir.",
    "{ders} sınavı yaklaşıyor. Anlamadığın bir konu varsa şimdi sormanın tam zamanı.",
    "{ders} sınavına {gun} gün kaldı. Kısa bir tekrar bile çok işe yarar.",
    "Sınava hazırlık maraton gibi: her gün biraz koşmak lazım. {ders} sınavına {gun} gün.",
    "{ders} için kendine birkaç soru sor, cevaplayabiliyor musun bak.",
    "{gun} gün sonra {ders} sınavı var. Bugün bir konu, yarın bir konu.",
    "{ders} sınavı yakında. Defterini düzenli tutman şimdi işe yarayacak.",
    "Yaklaşan {ders} sınavı için bugün 15 dakika ayırmaya ne dersin?",
    "{ders} sınavına {gun} gün var. Zor gelen konuları bir kâğıda yaz.",
    "Tekrar etmek unutmayı yener. {ders} sınavına {gun} gün!",
    "{ders} sınavı geliyor. Mini oyunlarla da tekrar yapabilirsin. 🎮",
  ],
  yarin_teslim: [
    "{ders} ödevin yarın teslim. Bugün biraz ilerlersen yarın rahat edersin. İlk adımı at! 🚀",
    "Yarın {ders} ödevini teslim edeceksin. Şimdi başlarsan sonra keyfine bakarsın! 🎈",
    "{ders} ödevi için bugün küçük bir parça yapmaya ne dersin? Adım adım her şey biter. 🧩",
    "{ders} ödevi yarın teslim. Bu akşam bitirirsen sabah rahatsın.",
    "Yarın {ders} ödevi isteniyor. Çalışma Masam'da sırası hazır.",
    "{ders} için son akşam bugün. Bitir, çantana koy.",
    "Yarın teslim edilecek bir {ders} ödevin var. Başlamak için en iyi an şimdi.",
    "{ders} ödevini bu akşam tamamla; sabah sadece çantana koyarsın.",
    "Yarın {ders} ödevi kontrol edilecek. Bugün bitirmek akıllıca.",
    "{ders} ödevi yarına. Hadi ilk sayfayı aç.",
    "Yarın teslim, bugün bitir. Basit kural, rahat sabah.",
    "{ders} ödevin seni bekliyor; yarın sabah teslim.",
    "Bu akşamın işi: {ders} ödevi. Yarın öğretmenine götüreceksin.",
    "Yarın {ders} ödevi var. Bitirince listeden çizmek çok keyifli.",
    "{ders} ödevi için bugün son fırsat. Sen yaparsın!",
  ],
  yeni_bitti: [
    "Bir ödevi daha bitirdin! Emek verdin ve başardın. Kendinle gurur duyabilirsin! 🏆",
    "Harika iş çıkardın! Bitirdiğin her ödev seni daha güçlü yapıyor. 💪",
    "Tebrikler! Başladığın işi bitirmek çok değerli bir yetenek, sende var! 🌟",
    "Bir ödev daha bitti! Bu düzen seni çok rahatlatacak.",
    "Bitirdin! Şimdi kısa bir mola hak ettin.",
    "Güzel iş. Her bitirdiğin ödev bir sonrakini kolaylaştırır.",
    "Tamamlandı! Kendine bir aferin de.",
    "Bir yük daha kalktı. Nasıl hissediyorsun?",
    "Harika! Listen kısalıyor.",
    "Ödevini bitirdin; bu, sözünü tutmak demek.",
    "Emeğine sağlık! Çantana koymayı unutma.",
    "Bir ödev daha geride. Böyle devam!",
    "Bitti! Şimdi biraz su iç, gözlerini dinlendir.",
    "Başladığın işi bitirdin. Bu çok değerli bir alışkanlık.",
    "Süper! Plan da kendini yeniledi, sıradakine bakabilirsin.",
  ],
  cok_odev: [
    "Bu aralar biraz yoğunsun ama sen bunu yapabilirsin! Büyük işler küçük adımlarla biter. 🧗",
    "{sayi} ödevin var. Hepsini birden düşünme; önce en kolayını seç, sonra sıradakine geç. ✅",
    "Yoğun bir hafta! Ara vermeyi de unutma; yorulunca kısa bir mola iyi gelir. 🍎",
    "{sayi} ödev var ama Çalışma Masam'da günlere dağıttım. Bugününe bakman yeter.",
    "Liste uzun görünüyor, ama her gün biraz yapınca kısalacak.",
    "{sayi} ödevin var. Hepsi aynı gün değil; sırası belli.",
    "Kalabalık bir hafta! En yakın teslimden başlarsan gerisi kolaylaşır.",
    "{sayi} ödev, bir sürü küçük adım demek. İlk adım bugün.",
    "Bu hafta dolu. Molaları unutma, su içmeyi de.",
    "Çok ödev var diye panik yok. Çalışma Masam sana yol gösterecek.",
    "{sayi} ödevin var. Bugünkü payını bitirmek yeterli.",
    "Bu kadar ödev seni korkutmasın; hepsinin günü ayrı.",
    "Yoğun bir hafta ama sen düzenlisin. Adım adım!",
    "{sayi} ödev var. Bir tanesini bitirince ne kadar hafiflediğini göreceksin.",
    "Ödevler çok ama vakit de yeterli. Ben hesapladım. 🙂",
  ],
  az_odev: [
    "{sayi} ödevin var. Bir tanesini hemen bitirsen, gerisi çocuk oyuncağı olur! 😄",
    "Az kaldı! {sayi} ödevi bitirince tamamen özgürsün. Hadi başlayalım! 🎯",
    "Bugün {sayi} ödevin var. Sen bunları kolayca halledersin, biliyorum! 💫",
    "{sayi} ödevin var. Bugün birini bitirsen hafta çok rahat geçer.",
    "Az ödevli bir hafta! Erken bitir, keyfine bak.",
    "Sadece {sayi} ödev. Çalışma Masam'da ne zaman yapacağın yazıyor.",
    "Ödevler az, zaman bol. Kitap okumaya da vakit kalır.",
    "{sayi} ödev seni bekliyor. Kısa ve kolay görünüyor!",
    "Hafif bir liste. İlkini hemen bitirmeye ne dersin?",
    "{sayi} ödevin var; hepsi teslimden önce rahatça biter.",
    "Bugün biraz ödev, sonra serbest zaman. Fena değil!",
    "Listende {sayi} ödev var. Bir tanesini şimdi aradan çıkar.",
    "Az ödev, büyük rahatlık. Yine de düzenli gidelim.",
    "{sayi} ödev kaldı. Bitince liste tertemiz.",
    "İşler az, moral yüksek! Hadi başlayalım.",
  ],
  hepsi_bitti: [
    "Bütün ödevlerini bitirdin! Çok çalıştın, şimdi biraz dinlenmeyi hak ettin. 🏖️",
    "Ödev listen tertemiz! Kitap okumaya ya da oyun oynamaya ne dersin? 📖⚽",
    "Tüm işlerin tamam! Kendine bir aferin de, bunu sen başardın. 👏",
    "Bütün ödevler bitti! Bugün sana kalmış.",
    "Liste boş. Bu düzeni sürdürmek harika olur.",
    "Hiç ödevin kalmadı. Biraz oyun, biraz kitap?",
    "Tüm ödevler tamam. Yeni gelenleri Çalışma Masam hemen yerleştirir.",
    "Ödevlerin bitti; şimdi dinlenme zamanı.",
    "Her şey tamam! Kendinle gurur duyabilirsin.",
    "Ödevsiz bir akşam! Hak ettin.",
    "Tüm işlerini bitirdin. Yarın da böyle olsun.",
    "Bütün ödevler tik! Çantan hazır mı?",
    "Ödev listesi bomboş. Mini oyunlara göz atabilirsin. 🎮",
    "Hepsini bitirmişsin, ne güzel!",
    "Tüm ödevlerin tamam. Şimdi biraz hareket etmeye ne dersin? ⚽",
  ],
  iyi_sonuc: [
    "{ders} sınavında çok güzel bir sonuç aldın! Çalışmanın karşılığını gördün. 👏",
    "{ders} sonucun harika! Bu, emeğinin ne kadar işe yaradığını gösteriyor. 🌟",
    "{ders} sonucun çok iyi! Düzenli çalışmanın sonucu bu.",
    "{ders} sınavında emeğinin karşılığını aldın.",
    "{ders} sonucu güzel! Nasıl çalıştığını hatırla, işe yarıyor.",
    "Tebrikler! {ders} sınavı iyi geçmiş.",
    "{ders} sınavındaki başarı tesadüf değil. Aferin sana.",
    "{ders} sonucunu görünce çok sevindim!",
    "Çalıştın ve oldu: {ders} sonucu harika.",
    "{ders} sınavında iyi iş çıkardın. Bu güzel duyguyu hatırla.",
    "Güzel bir {ders} sonucu! Kendine bir ödül ver. 🎁",
    "{ders} sınavı iyi geçti. Demek ki yöntemin doğru.",
    "{ders} sınavı sonucu emeğini gösteriyor. Tebrikler!",
    "Bu {ders} sonucu, düzenli tekrarın gücünü gösteriyor.",
    "{ders} sonucunla gurur duy. Hak ettin.",
  ],
  hafta_sonu: [
    "Hafta sonu! Dinlen, oyna, eğlen. Beynin de biraz tatil yapmayı hak ediyor. 🌈",
    "Hafta sonunun tadını çıkar! Pazartesiye enerji dolu başlarsın. ☀️",
    "Hafta sonu! Ödev varsa Çalışma Masam'da kısa tuttum, gerisi senin.",
    "Cumartesi ya da Pazar: biraz ödev, bol dinlenme.",
    "Hafta sonu enerji toplama zamanı. Dışarı çıkmaya ne dersin?",
    "Bugün okul yok! Ama kitap okumak her gün güzel. 📖",
    "Hafta sonunda biraz hareket, biraz oyun, biraz kitap.",
    "Dinlenmiş bir zihin pazartesi daha iyi öğrenir.",
    "Hafta sonu keyfi! Çantanı pazar akşamı hazırlamayı unutma.",
    "Bugün tatil havası. Ailenle güzel vakit geçir.",
    "Hafta sonu! Planında ödev varsa sabah erkenden bitir, gününün tadını çıkar.",
    "Okulsuz bir gün! Merak ettiğin bir şeyi araştırmaya ne dersin? 🔍",
    "Haftayı bitirdin, aferin. Şimdi şarj olma zamanı.",
    "Hafta sonu güneşi seni çağırıyor. ☀️",
    "Bugün biraz serbestlik var. Yine de her gün yapılacakları unutma.",
  ],
  genel: [
    "Beynin bir kas gibi; çalıştıkça güçlenir! 🧠💪",
    "Bir şey zor geliyorsa, öğreniyorsun demektir. Devam! 🚀",
    "Hata yapmak, denemek demektir. Denemeye devam eden her zaman öğrenir! 🌱",
    "Bugün dünden biraz daha iyi olman yeterli. 🌟",
    "Sorular sormak akıllı insanların işidir. Merak etmeye devam et! 🔍",
    "Henüz yapamıyorsan, sadece 'henüz'. Biraz daha pratikle yapacaksın! ⏳",
    "Küçük adımlar, büyük yollar demektir. 👣",
    "Merak ettiğin bir şeyi öğrenmek için bugün iyi bir gün.",
    "Bugün bir şey öğrendin mi? Akşam birine anlat, daha iyi aklında kalır.",
    "Düzenli olmak süper güç gibidir. 🦸",
    "Zor sorular seni büyütür.",
    "Bir kitabın ilk sayfası, yeni bir dünyanın kapısıdır. 📚",
    "Yorulduğunda dinlen, ama vazgeçme.",
    "Bugünkü sen, dünkü senden biraz daha bilgili.",
    "Bilmiyorum demek, öğrenmenin ilk adımıdır.",
  ],
};

const motivasyon = { kaydirma: 0, sonAnahtar: "" };

function motivasyonDurumu() {
  const simdi = new Date();
  const bugun = tarihStr(simdi), yarin = tarihStr(gunEkle(simdi, 1));
  const simdiSaat = saatYaz(simdi.getHours() * 60 + simdi.getMinutes());
  const odevler = aktifOdevler(), sinavlar = aktifEtkinlikler().filter(e => e.tur === "sinav");
  const acik = odevler.filter(o => !o.bitti && o.teslim >= bugun);
  const dersAdi = k => (dersBul(k.ders_id) || {}).ad || "Ders";
  const sinavBugun = sinavlar.find(s => s.tarih === bugun && (!s.bit || s.bit > simdiSaat));
  if (sinavBugun) return { k: "sinav_bugun", ders: dersAdi(sinavBugun) };
  const bugunTeslim = acik.find(o => o.teslim === bugun);
  if (bugunTeslim) return { k: "bugun_teslim", ders: dersAdi(bugunTeslim) };
  if (odevler.some(o => !o.bitti && o.teslim < bugun)) return { k: "geciken" };
  const yeniBitti = odevler.find(o => o.bitti && o.bitti_zaman && Date.now() - new Date(o.bitti_zaman) < 2 * 3600e3);
  if (yeniBitti) return { k: "yeni_bitti" };
  const yakinSinav = sinavlar.filter(s => s.tarih > bugun).sort((a, b) => a.tarih.localeCompare(b.tarih))[0];
  if (yakinSinav) {
    const gun = Math.round((strTarih(yakinSinav.tarih) - gunBasi(simdi)) / 864e5);
    if (gun <= 3) return { k: "sinav_yakin", ders: dersAdi(yakinSinav), gun };
  }
  const yarinTeslim = acik.find(o => o.teslim === yarin);
  if (yarinTeslim) return { k: "yarin_teslim", ders: dersAdi(yarinTeslim) };
  if (acik.length >= 4) return { k: "cok_odev", sayi: acik.length };
  if (acik.length) return { k: "az_odev", sayi: acik.length };
  const iyi = sinavlar.find(s => typeof s.puan === "number" && s.puan >= 85 && Date.now() - strTarih(s.tarih) < 5 * 864e5);
  if (iyi) return { k: "iyi_sonuc", ders: dersAdi(iyi) };
  if (odevler.some(o => o.bitti && Date.now() - strTarih(o.teslim) < 7 * 864e5)) return { k: "hepsi_bitti" };
  if ([0, 6].includes(simdi.getDay())) return { k: "hafta_sonu" };
  return { k: "genel" };
}

function motivasyonCiz() {
  const kap = $("#motivasyon");
  if (!kap || !durum.veri) return;
  const d = motivasyonDurumu();
  const liste = MOTIVASYON[d.k];
  // Aynı durumda birkaç saatte bir farklı cümle; tıklayınca sıradaki
  const dilim = Math.floor(Date.now() / (3 * 3600e3));
  const anahtar = d.k + (d.ders || "") + dilim + "|" + motivasyon.kaydirma;
  if (anahtar !== motivasyon.sonAnahtar || !motivasyon.cumle) {
    // 0.17: aynı durumda bütün cümleler tükenmeden hiçbiri tekrar gelmez (rehber.js'teki deste)
    motivasyon.sonAnahtar = anahtar;
    if (typeof rehberSec === "function") { REHBER["m_" + d.k] = liste; motivasyon.cumle = rehberSec("m_" + d.k); }
    else motivasyon.cumle = liste[Math.floor(Math.random() * liste.length)];
  }
  const metin = motivasyon.cumle.replace(/\{ders\}/g, d.ders || "").replace(/\{gun\}/g, d.gun ?? "").replace(/\{sayi\}/g, d.sayi ?? "");
  kap.innerHTML = `<img src="img/logo.png" alt=""><div class="balon" title="Bir tane daha">${esc(metin)}</div>`;
  kap.dataset.tur = d.k;
}

// Ödev bitince kutlama
function motivasyonKutla(sessiz) {
  const cumleler = MOTIVASYON.yeni_bitti;
  if (!sessiz) bildir(cumleler[Math.floor(Math.random() * cumleler.length)]);
  const kutu = document.createElement("div");
  kutu.className = "konfeti";
  kutu.innerHTML = Array.from({ length: 18 }, (_, i) =>
    `<span style="--x:${Math.round(Math.random() * 100)}vw;--g:${(Math.random() * .6).toFixed(2)}s">${["🎉", "⭐", "🌟", "✨", "🏆"][i % 5]}</span>`).join("");
  document.body.append(kutu);
  setTimeout(() => kutu.remove(), 2600);
  motivasyonCiz();
}

function motivasyonOlaylariniKur() {
  $("#motivasyon").addEventListener("click", () => { motivasyon.kaydirma++; motivasyonCiz(); });
}

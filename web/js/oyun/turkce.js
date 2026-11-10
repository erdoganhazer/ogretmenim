/* ÖğretmeniM — Türkçe oyunları (0.11: Noktalama Avcısı, Ses Olayları Laboratuvarı) */
"use strict";

/* ---------- T1 Noktalama Avcısı ----------
   {x} boşluktur, x doğru işarettir. {.|!} → ikisi de doğru. */
const NOKTALAMA_ISARETLERI = [
  { k: ".", ad: "Nokta", kod: "nokta" },
  { k: ",", ad: "Virgül", kod: "virgul" },
  { k: "?", ad: "Soru işareti", kod: "soru" },
  { k: "!", ad: "Ünlem", kod: "unlem" },
  { k: ":", ad: "İki nokta", kod: "ikinokta" },
  { k: "...", ad: "Üç nokta", kod: "ucnokta" },
  { k: "'", ad: "Kesme işareti", kod: "kesme" },
];
const NOKTALAMA_KURALI = {
  ".": "Cümle bitince nokta konur. Sıra bildiren sayılardan sonra da nokta konur: 3. sınıf.",
  ",": "Sıralanan kelimeleri ayırmak için, seslenmelerden (Arın, …) ve evet/hayır sözlerinden sonra virgül konur.",
  "?": "Soru bildiren cümlelerin sonuna soru işareti konur.",
  "!": "Sevinç, korku, şaşkınlık gibi duygu bildiren ya da uyaran sözlerin sonuna ünlem konur.",
  ":": "Ardından örnek, açıklama ya da aktarılan bir söz gelecekse iki nokta konur.",
  "...": "Tamamlanmamış cümlelerin sonuna ve sayılan örneklerin devam ettiğini göstermek için üç nokta konur.",
  "'": "Özel adlara ve rakamla yazılan sayılara gelen ekler kesme işaretiyle ayrılır: Ankara'ya, 1923'te.",
};
const NOKTALAMA_CUMLELERI = [
  "Annem pazardan elma{,} armut{,} portakal aldı{.}",
  "Yarın okula kaçta gideceksin{?}",
  "Eyvah{!} Servisi kaçırdık{.}",
  "Çantama şunları koydum{:} kalem{,} silgi ve defter{.}",
  "Arın{,} bu akşam birlikte kitap okuyalım mı{?}",
  "Evet{,} ödevimi bitirdim{.}",
  "Tatilde İzmir{'}e gideceğiz{.}",
  "Atatürk{'}ün doğduğu şehir Selanik{'}tir{.}",
  "Cumhuriyet 29 Ekim 1923{'}te ilan edildi{.}",
  "Sepette elma{,} armut{,} muz{...} ne ararsan vardı{.}",
  "Ne güzel bir gün{!}",
  "Kardeşim 3{.} sınıfa gidiyor{.}",
  "Öğretmenimiz şöyle dedi{:} “Kitap okumak zihni geliştirir.”",
  "Sen de bizimle sinemaya gelir misin{?}",
  "Dikkat et{!} Yer ıslak{.|!}",
  "Ayşe{'}nin kedisi çok sevimli{.}",
  "Hafta sonu Kapadokya{'}yı gezdik{.}",
  "Sabah kalktım{,} yüzümü yıkadım{,} kahvaltı yaptım{.}",
  "Keşke biraz daha zamanım olsaydı{...}",
  "Hayır{,} bu kitabı daha önce okumadım{.}",
  "Doğum günün ne zaman{?}",
  "Yaşasın{!} Yarın okul gezisine gidiyoruz{.|!}",
  "Türkiye{'}nin başkenti Ankara{'}dır{.}",
  "Deftere şu kelimeleri yazdık{:} kitap{,} okul{,} öğretmen{.}",
  "Çocuklar{,} teneffüs bitti{.}",
  "Dedem 1960{'}ta doğmuş{.}",
  "Bu soruyu kim çözdü{?}",
  "Yarışmada 1{.} olduk{.|!}",
  "Kalemini{,} silgini ve cetvelini unutma{.|!}",
  "Van Gölü{'}nü hiç gördün mü{?}",
];

function noktalamaCozumle(cumle) {
  const parcalar = [], bosluklar = [];
  let son = 0;
  cumle.replace(/\{([^}]+)\}/g, (m, ic, i) => {
    parcalar.push(cumle.slice(son, i));
    bosluklar.push(ic.split("|"));
    son = i + m.length;
    return m;
  });
  parcalar.push(cumle.slice(son));
  const duz = cumle.replace(/\{([^}|]+)(\|[^}]*)?\}/g, "$1");
  return { parcalar, bosluklar, duz };
}

oyunTanimla({
  id: "noktalama", ders: "turkce", ad: "Noktalama Avcısı", simge: "🎯", kisa: "Doğru işareti yerine koy",
  konu: "Noktalama işaretleri",
  async baslat(ctx) {
    // Ünite etkinliğinden gelirse: o temanın işaretleri ve cümleleri (ctx.secenek)
    const sec = ctx.secenek || {};
    const izinli = sec.isaretler && sec.isaretler.length ? sec.isaretler : null;
    const kaynak = sec.cumleler && sec.cumleler.length ? sec.cumleler : NOKTALAMA_CUMLELERI;
    const havuz = kaynak.map(c => ({ ...noktalamaCozumle(c), anahtar: noktalamaCozumle(c).duz.slice(0, 80) }))
      .filter(c => !izinli || c.bosluklar.every(b => b.some(x => izinli.includes(x))));
    const palet = izinli ? NOKTALAMA_ISARETLERI.filter(x => izinli.includes(x.k)) : NOKTALAMA_ISARETLERI;
    const sorular = agirlikliSec(ctx, havuz, 8);
    const sonuc = await turOyna(ctx, sorular, (kap, s, cevapla) => {
      const dolu = s.bosluklar.map(() => null);
      let secili = 0;
      const ciz = () => {
        kap.innerHTML = `<div class="soru-ust">Boş kutuya tıkla, sonra doğru işareti seç.</div>
          <div class="nk-cumle">${s.parcalar.map((p, i) => esc(p) + (i < s.bosluklar.length
            ? `<button class="nk-bosluk${i === secili ? " secili" : ""}${dolu[i] ? " dolu" : ""}" data-b="${i}">${dolu[i] ? esc(dolu[i]) : "□"}</button>` : "")).join("")}</div>
          <div class="nk-palet">${palet.map(x => `<button class="nk-isaret" data-k="${esc(x.k)}"><b>${esc(x.k)}</b><small>${x.ad}</small></button>`).join("")}</div>
          <div class="nk-alt"><button class="dugme ana" id="nk-kontrol" ${dolu.every(Boolean) ? "" : "disabled"}>Kontrol et ✓</button></div>`;
        kap.querySelectorAll(".nk-bosluk").forEach(b => b.addEventListener("click", () => { secili = +b.dataset.b; sesCal("tik"); ciz(); }));
        kap.querySelectorAll(".nk-isaret").forEach(b => b.addEventListener("click", () => {
          if (secili == null) return;
          dolu[secili] = b.dataset.k;
          sesCal("tik");
          const bos = dolu.findIndex((x, i) => !x && i > secili);
          secili = bos >= 0 ? bos : dolu.findIndex(x => !x);
          if (secili < 0) secili = null;
          ciz();
        }));
        kap.querySelector("#nk-kontrol").addEventListener("click", kontrol);
      };
      const kontrol = () => {
        let hepsi = true;
        const yanlisIsaretler = [];
        s.bosluklar.forEach((kabul, i) => {
          const ok = kabul.includes(dolu[i]);
          hepsi = hepsi && ok;
          const beklenen = kabul[0], isaret = NOKTALAMA_ISARETLERI.find(x => x.k === beklenen);
          ctx.kaydet({ beceri: "tr.noktalama." + isaret.kod, beceri_adi: "Noktalama: " + isaret.ad, konu: "Noktalama işaretleri",
            soru: s.anahtar, cevap: dolu[i], dogru: ok });
          if (!ok && !yanlisIsaretler.includes(beklenen)) yanlisIsaretler.push(beklenen);
        });
        kap.querySelector(".nk-cumle").innerHTML = s.parcalar.map((p, i) => esc(p) + (i < s.bosluklar.length
          ? `<span class="nk-bosluk ${s.bosluklar[i].includes(dolu[i]) ? "dogru" : "yanlis"}">${esc(s.bosluklar[i].includes(dolu[i]) ? dolu[i] : s.bosluklar[i][0])}</span>` : "")).join("");
        kap.querySelectorAll(".nk-palet button, #nk-kontrol").forEach(b => b.disabled = true);
        cevapla(hepsi, { kayitli: true, dogruCevap: esc(s.duz), aciklama: yanlisIsaretler.map(k => "• " + NOKTALAMA_KURALI[k]).join("<br>") });
      };
      ciz();
    });
    turSonu(ctx, sonuc);
  },
});

/* ---------- T2 Ses Olayları Laboratuvarı ---------- */
const SES_OLAYLARI = {
  yumusama: { ad: "Ünsüz yumuşaması", aciklama: "p, ç, t, k ile biten kelimeye ünlüyle başlayan ek gelince bu sesler b, c, d, ğ (g) olur: kitap → kitabı." },
  benzesme: { ad: "Ünsüz benzeşmesi", aciklama: "Sert ünsüzle (f, s, t, k, ç, ş, h, p) biten kelimeye c, d, g ile başlayan ek gelince bu sesler ç, t, k olur: kitap + cı → kitapçı." },
  daralma: { ad: "Ünlü daralması", aciklama: "a ya da e ile biten fiillere -yor eki gelince a → ı/u, e → i/ü olur: başla + yor → başlıyor." },
  dusme: { ad: "Ünlü düşmesi", aciklama: "İkinci hecesinde dar ünlü (ı, i, u, ü) olan bazı kelimelere ünlüyle başlayan ek gelince bu ünlü düşer: ağız → ağzı." },
  tureme: { ad: "Ünsüz türemesi", aciklama: "Bazı tek heceli kelimelere ünlüyle başlayan ek gelince sondaki ünsüz ikizleşir: hak → hakkı." },
  yok: { ad: "Ses olayı yok", aciklama: "Bu kelimede ek gelince hiçbir ses değişmez." },
};
// [kök, ek, doğru yazılış, yanlış yazılışlar, olay]
const SES_KELIMELERI = [
  ["kitap", "ı", "kitabı", ["kitapı", "kitapi"], "yumusama"],
  ["ağaç", "a", "ağaca", ["ağaça", "ağacı"], "yumusama"],
  ["kanat", "ı", "kanadı", ["kanatı", "kanadi"], "yumusama"],
  ["çocuk", "u", "çocuğu", ["çocuku", "çocoğu"], "yumusama"],
  ["renk", "i", "rengi", ["renki", "renği"], "yumusama"],
  ["dolap", "ın", "dolabın", ["dolapın", "dolabin"], "yumusama"],
  ["yurt", "a", "yurda", ["yurta", "yurdu"], "yumusama"],
  ["ekmek", "i", "ekmeği", ["ekmeki", "ekmegi"], "yumusama"],
  ["kulak", "ı", "kulağı", ["kulakı", "kulagı"], "yumusama"],
  ["kitap", "cı", "kitapçı", ["kitapcı", "kitabcı"], "benzesme"],
  ["sokak", "da", "sokakta", ["sokakda", "sokağda"], "benzesme"],
  ["ağaç", "dan", "ağaçtan", ["ağaçdan", "ağacdan"], "benzesme"],
  ["süt", "cü", "sütçü", ["sütcü", "südcü"], "benzesme"],
  ["yurt", "da", "yurtta", ["yurtda", "yurdda"], "benzesme"],
  ["sepet", "de", "sepette", ["sepetde", "sepedde"], "benzesme"],
  ["aş", "cı", "aşçı", ["aşcı", "aççı"], "benzesme"],
  ["dört", "de", "dörtte", ["dörtde", "dördde"], "benzesme"],
  ["başla", "yor", "başlıyor", ["başlayor", "başliyor"], "daralma"],
  ["ara", "yor", "arıyor", ["arayor", "ariyor"], "daralma"],
  ["izle", "yor", "izliyor", ["izleyor", "izlıyor"], "daralma"],
  ["söyle", "yor", "söylüyor", ["söyleyor", "söyliyor"], "daralma"],
  ["bekle", "yor", "bekliyor", ["bekleyor", "beklüyor"], "daralma"],
  ["oyna", "yor", "oynuyor", ["oynayor", "oynıyor"], "daralma"],
  ["yaşa", "yor", "yaşıyor", ["yaşayor", "yaşiyor"], "daralma"],
  ["ağız", "ı", "ağzı", ["ağızı", "ağıza"], "dusme"],
  ["burun", "u", "burnu", ["burunu", "burnı"], "dusme"],
  ["oğul", "u", "oğlu", ["oğulu", "oğlı"], "dusme"],
  ["alın", "ı", "alnı", ["alını", "alni"], "dusme"],
  ["akıl", "ı", "aklı", ["akılı", "akli"], "dusme"],
  ["boyun", "u", "boynu", ["boyunu", "boynı"], "dusme"],
  ["şehir", "e", "şehre", ["şehire", "şehra"], "dusme"],
  ["isim", "i", "ismi", ["isimi", "ismı"], "dusme"],
  ["hak", "ı", "hakkı", ["hakı", "hağı"], "tureme"],
  ["sır", "ı", "sırrı", ["sırı", "sirri"], "tureme"],
  ["his", "i", "hissi", ["hisi", "hısı"], "tureme"],
  ["af", "ı", "affı", ["afı", "avı"], "tureme"],
  ["top", "u", "topu", ["tobu", "topı"], "yok"],
  ["saç", "ı", "saçı", ["sacı", "saçi"], "yok"],
  ["okul", "a", "okula", ["okla", "okule"], "yok"],
  ["kalem", "i", "kalemi", ["kalmi", "kalemı"], "yok"],
];

oyunTanimla({
  id: "ses-olaylari", ders: "turkce", ad: "Ses Olayları Laboratuvarı", simge: "🧪", kisa: "Kelime + ek = ?",
  konu: "Ses olayları",
  async baslat(ctx) {
    const havuz = SES_KELIMELERI.flatMap(([kok, ek, dogru, yanlislar, olay]) => {
      const beceri = "tr.ses." + olay, beceri_adi = "Ses olayları: " + SES_OLAYLARI[olay].ad;
      return [
        { tur: "yazim", kok, ek, dogru, yanlislar, olay, beceri, beceri_adi, anahtar: `${kok} + ${ek} = ?` },
        ...(olay === "yok" ? [] : [{ tur: "ad", kok, ek, dogru, olay, beceri, beceri_adi, anahtar: `${dogru}: hangi ses olayı?` }]),
      ];
    });
    const sorular = agirlikliSec(ctx, havuz, 10).map(s => s.tur === "yazim" ? {
      ...s, konu: "Ses olayları",
      ust: "Kelimeye eki ekle. Doğru yazılış hangisi?",
      soruHtml: `<span class="ses-kok">${esc(s.kok)}</span> + <span class="ses-ek">${esc(s.ek)}</span> = <span class="ses-bos">?</span>`,
      secenekler: [s.dogru, ...s.yanlislar], dogru: s.dogru,
      aciklama: `${esc(s.kok)} + ${esc(s.ek)} → <b>${esc(s.dogru)}</b>. ${SES_OLAYLARI[s.olay].aciklama}`,
    } : {
      ...s, konu: "Ses olayları",
      ust: "Bu kelimede hangi ses olayı var?",
      soruHtml: `<span class="ses-kok">${esc(s.kok)}</span> + <span class="ses-ek">${esc(s.ek)}</span> → <b class="ses-sonuc">${esc(s.dogru)}</b>`,
      secenekler: karistir(["yumusama", "benzesme", "daralma", "dusme", "tureme"].filter(o => o !== s.olay)).slice(0, 3).concat(s.olay).map(o => SES_OLAYLARI[o].ad),
      dogru: SES_OLAYLARI[s.olay].ad,
      aciklama: SES_OLAYLARI[s.olay].aciklama,
      sutun: 2,
    });
    const sonuc = await turOyna(ctx, sorular, gosterSikli);
    turSonu(ctx, sonuc);
  },
});

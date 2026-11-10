/* ÖğretmeniM 0.32 — Almanca 1. yazılı: yönlendirmeli konu çalışması (motor: ingilizce_calisma.js).
   Kapsam, öğretmenin çalışma kâğıdındaki konular: "Hallo! Wie geht's?" (Arbeitsblatt 5. Klasse): selamlaşma, hâl hatır, kendini tanıtma, sayılar 0–20.
   Görev başlıkları çalışma kâğıdındaki gibi Almanca; Arın önce görevin ne istediğini seçer. Sorular her seferinde yeniden üretilir. */
"use strict";

const DE_KONULAR = [];
const DE_SAYI = ["null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf", "dreizehn", "vierzehn",
  "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn", "zwanzig"];
const DE_KIZ = ["Mia", "Lena", "Emma", "Anna", "Lea", "Sophie", "Elif", "Zeynep", "Hannah", "Ela"];
const DE_ERKEK = ["Can", "Paul", "Ben", "Lukas", "Leon", "Max", "Jonas", "Ali", "Emir", "Tim"];
const deAd = () => icR([...DE_KIZ, ...DE_ERKEK]);
const deIkiAd = () => { const a = deAd(); let b; do { b = deAd(); } while (b === a); return [a, b]; };
const DE_BEFINDEN = [["super", "😄", "harika"], ["gut", "🙂", "iyi"], ["so lala", "😐", "şöyle böyle"], ["schlecht", "😢", "kötü"]];
const DE_GRUSS = {   // selam, durumlar [simge, saat aralığı, durum]
  morgen: ["Guten Morgen!", "🌅", [6, 10], ["okula geliyorsun", "kahvaltıda annene günaydın diyorsun", "servise biniyorsun", "sınıfa giriyorsun, öğretmenin orada"]],
  tag: ["Guten Tag!", "☀️", [11, 17], ["öğretmeni koridorda görüyorsun", "markete giriyorsun", "öğle yemeğinde müdürle karşılaşıyorsun", "kütüphaneye giriyorsun"]],
  abend: ["Guten Abend!", "🌙", [18, 21], ["komşuyu görüyorsun", "akşam yemeğine misafir geliyor", "akşam parkta öğretmenine rastlıyorsun", "dedenlere akşam ziyarete gidiyorsun"]],
  tschuss: ["Tschüss!", "👋", null, ["okuldan çıkıyorsun, arkadaşından ayrılıyorsun", "telefon konuşmasını bitiriyorsun", "misafirler gidiyor", "antrenmandan sonra eve dönüyorsun"]],
};
const deSaat = ([a, b]) => { const s = a + Math.floor(Math.random() * (b - a + 1)), d = icR(["00", "15", "30", "45"]); return `${String(s).padStart(2, "0")}:${d}`; };
function deGenisle(s) {
  s = String(s || "").toLocaleLowerCase("de").replace(/[’‘`´]/g, "'").replace(/[“”„"]/g, " ");
  s = s.replace(/ß/g, "ss").replace(/\bgeht's\b/g, "geht es").replace(/\bwie geht's\b/g, "wie geht es").replace(/\btschüs\b/g, "tschüss");
  s = s.replace(/[.!?,;:()–-]/g, " ");
  return s.replace(/\s+/g, " ").trim();
}
const DE_ISIM = ["Morgen", "Tag", "Abend", "Jahre", "Lieblingszahl", "Wiedersehen"];
function deEkUyari(y, beklenen) {
  const u = [];
  if (/ß/.test(beklenen) && !/ß/.test(y) && /ss/i.test(y)) u.push("Almancada <b>ß</b> yazılır (heiße); klavyende yoksa <b>ß</b> düğmesine bas");
  const kucuk = DE_ISIM.filter(w => beklenen.includes(w) && new RegExp(`\\b${w.toLowerCase()}\\b`).test(y));
  if (kucuk.length) u.push(`Almancada isimler büyük harfle başlar: <b>${kucuk.join(", ")}</b>`);
  return u;
}
const deE = (y, liste) => liste.some(x => deGenisle(x) === deGenisle(y));

const DE_SOZ = { wann: "ne zaman", sagst: "söylersin", du: "sen", was: "ne", "ergänze": "tamamla", den: "(belirli)", die: "(belirli)", dialog: "diyalog",
  wie: "nasıl", sagt: "söyler", man: "insan (genel)", das: "bunu", "auf deutsch": "Almanca", auf: "-ca", deutsch: "Almanca", geht: "gidiyor", es: "o", dir: "sana",
  schau: "bak", an: "(bak)", gesichter: "yüzler", antworte: "cevap ver", mit: "ile", einem: "bir", satz: "cümle", "sätze": "cümleler", lies: "oku",
  steckbrief: "kimlik kartı", und: "ve", beantworte: "cevapla", fragen: "sorular", schreib: "yaz", schreibe: "yaz", zahlen: "sayılar", "zahlen-tabelle": "sayı tablosu",
  tabelle: "tablo", als: "olarak", wort: "kelime", "wörter": "kelimeler", buchstabensalat: "harf salatası (karışık harfler)", rechnen: "hesap yapmak",
  ordnen: "sıraya koymak", mein: "benim", einen: "bir", kleinen: "küçük", "über": "hakkında", dich: "seni / kendin" };
const DE_YON = {
  de_yuz: ["Wie geht es dir? Schau die [Gesichter] an.", "Yüz ifadesine bakarak boşluğa uygun kelimeyi yaz."],
  de_cumle: ["Wie geht es dir? [Antworte] mit einem [Satz].", "Yüz ifadesine göre tam cümleyle cevap ver."],
  de_ceviri: ["Wie sagt man das [auf Deutsch]?", "Türkçe sözün Almancasını yaz."],
  de_durum: ["[Wann] sagst du [was]?", "Duruma uygun selamlaşma sözünü yaz."],
  de_bos: ["[Ergänze] den Dialog.", "Diyalogdaki boşluğu tamamla."],
  de_kart: ["Lies den [Steckbrief] und [beantworte] die Fragen.", "Kimlik kartını oku; soruları o kişiymiş gibi cevapla."],
  de_luecke: ["[Ergänze] die Sätze.", "Cümlelerdeki boşluğa eksik kelimeyi yaz."],
  de_frage: ["Schreib die [Fragen].", "Cevaplara uygun soruları yaz."],
  de_tablo: ["[Zahlen-Tabelle]", "Rakamı varsa kelimeyi, kelimesi varsa rakamı yaz."],
  de_yaz: ["Schreib die [Zahlen] als [Wort].", "Rakamları Almanca kelimeyle yaz."],
  de_salat: ["[Buchstabensalat]", "Karışık harfleri doğru sıraya koy, sayıyı yaz."],
  de_rechnen: ["[Rechnen] auf Deutsch", "İşlemin sonucunu Almanca kelimeyle yaz."],
  de_ordnen: ["[Dialog] [ordnen]", "Karışık cümleleri doğru sıraya diz: her cümleye 1'den başlayarak numara yaz."],
  de_ich: ["Mein [Steckbrief]", "Kendini tanıt: cümleleri kendine göre tamamla."],
  de_dialog_yaz: ["[Schreibe] einen kleinen Dialog.", "A'nın sözlerine B olarak cevap yaz."],
};

/* ---------- 1. Wie geht es dir? (kâğıt Aufgabe 1) ---------- */
icKonu({
  kod: "befinden", ad: "Wie geht es dir? (super – gut – so lala – schlecht)", simge: "😄", kaynak: "Çalışma kâğıdı · Aufgabe 1",
  kural: `<b>Wie geht es dir?</b> (Wie geht's?) = Nasılsın?<br>Cevap: <b>Mir geht es</b> … 😄 <b>super</b> (harika) · 🙂 <b>gut</b> (iyi) · 😐 <b>so lala</b> (şöyle böyle) · 😢 <b>schlecht</b> (kötü)<br>
    <b>danke</b> = teşekkürler · <b>Und dir?</b> = Ya sen?`,
  kesfet() {
    const s = icKaristir(DE_BEFINDEN);
    return { anahtar: "deb-k-" + s.map(x => x[0]).join(),
      ornekler: s.map(x => `${x[1]} Mir geht es ${icRenk(x[0], "ek")}. <small>(${x[2]})</small>`),
      soru: "😐 yüzü için hangisini söylersin?", secenekler: ["so lala", "super", "schlecht"], dogru: "so lala", ipucu: "Yüzlerin yanındaki kırmızı kelimelere bak." };
  },
  turler: {
    yuz() {
      const s = icKaristir(DE_BEFINDEN), ad = s.map(() => deAd());
      return { yon: "de_yuz", anahtar: "deb-y-" + s.map((x, i) => x[0] + ad[i]).join(), govde: `<p class="ic-ipucu">super – gut – so lala – schlecht</p>`,
        parcalar: s.map((x, i) => ({ s: `<span class="ic-buyuk-emoji">${x[1]}</span> A: Hallo, ${ad[i]}! Wie geht es dir? &nbsp; B: Mir geht es ____.`, b: [x[0]], tek: 1, ipucu: x[2], yuz: x })) };
    },
    cumle() {
      const s = icSec(DE_BEFINDEN, 3), a = deAd();
      return { yon: "de_cumle", anahtar: "deb-c-" + a + s.map(x => x[0]).join(), govde: "",
        parcalar: s.map(x => ({ s: `<span class="ic-buyuk-emoji">${x[1]}</span> ${a}: Hallo! Wie geht es dir?`, cevap: `Mir geht es ${x[0]}.`, ipucu: `Mir geht es … (${x[2]})`, yuz: x,
          d: y => { const w = deGenisle(y);
            if (new RegExp(`^(hallo )?mir geht es ${x[0]}( danke)?( und dir)?$`).test(w)) return { tur: "dogru" };
            const baska = DE_BEFINDEN.find(z => z[0] !== x[0] && new RegExp(`\\b${z[0]}\\b`).test(w));
            if (baska) return { tur: "yuz", m: `Yüze bak: ${x[1]} = <b>${x[0]}</b> (${x[2]}). Sen "${baska[0]}" (${baska[2]}) yazdın.` };
            if (w === x[0] || w === x[0] + " danke") return { tur: "kisa", m: `Tam cümle yaz: <b>Mir geht es ${x[0]}.</b>` };
            if (/^ich (bin|geht)/.test(w)) return { tur: "kalip", m: `Kalıp: <b>Mir geht es</b> ${x[0]}.` };
            return icGenelTeshis(`Mir geht es ${x[0]}.`, y); } })) };
    },
    diyalog() {
      const [a, b] = deIkiAd(), [m1, m2] = icSec(DE_BEFINDEN, 2), sel = icR(["Hallo", "Guten Morgen", "Guten Tag", "Guten Abend"]);
      return { yon: "de_bos", anahtar: "deb-d-" + a + b + m1[0] + m2[0] + sel,
        govde: icMetinKutu(`${a}: ${sel}, ${b}! Wie geht es dir?<br>${b}: ${m1[1]} Mir geht es <b>(1) ____</b>, danke. Und dir?<br>${a}: ${m2[1]} Mir geht es <b>(2) ____</b>. Tschüss!`),
        parcalar: [[m1, 1], [m2, 2]].map(([m, i]) => ({ s: `(${i}) ${m[1]}`, b: [m[0]], tek: 1, ipucu: m[2], yuz: m })) };
    },
    ceviri() {
      const ad = deAd(), n = icR([9, 10, 11, 12, 13]);
      const t = icSec([["Nasılsın?", ["Wie geht es dir?", "Wie geht's?", "Wie geht es dir"]], ["Harikayım!", ["Mir geht es super!", "Super!"]],
        [`${ad}, nasılsın?`, [`${ad}, wie geht es dir?`, `Wie geht es dir, ${ad}?`, `${ad}, wie geht's?`]], [`İyiyim. Ya sen, ${ad}?`, [`Mir geht es gut. Und dir, ${ad}?`, `Gut. Und dir, ${ad}?`, `Mir geht es gut. Und dir?`]],
        ["Bugün kötüyüm.", ["Mir geht es heute schlecht.", "Heute geht es mir schlecht.", "Mir geht es schlecht."]], [`Merhaba ${ad}! Ben harikayım.`, [`Hallo ${ad}! Mir geht es super.`]],
        ["Şöyle böyle.", ["Mir geht es so lala.", "So lala."]], ["Kötüyüm.", ["Mir geht es schlecht."]], ["İyiyim, teşekkürler.", ["Mir geht es gut, danke.", "Gut, danke.", "Danke, gut.", "Danke, mir geht es gut."]],
        ["Ya sen?", ["Und dir?", "Und du?"]]], 3);
      return { yon: "de_ceviri", anahtar: "deb-t-" + t.map(x => x[0]).join() + n, govde: "",
        parcalar: t.map(([tr, de]) => ({ s: `🇹🇷 ${tr}`, b: de, cevap: de[0], ipucu: de[0].replace(/(super|gut|so lala|schlecht|dir)/, "…") })) };
    },
  },
  adim: { 2: ["yuz", "cumle", "diyalog"], 3: ["yuz", "cumle", "diyalog", "ceviri"] },
  teshis(p, y) {
    const w = deGenisle(y);
    if (p.yuz && p.tek) { const z = DE_BEFINDEN.find(x => x[0] === w); if (z) return { tur: "yuz", m: `Yüze bak: ${p.yuz[1]} = <b>${p.yuz[0]}</b> (${p.yuz[2]}). "${z[0]}" = ${z[2]}.` }; }
    return null;
  },
}, DE_KONULAR);

/* ---------- 2. Begrüßung: Wann sagst du was? (kâğıt Aufgabe 2) ---------- */
function deDurum(tur) {
  const g = DE_GRUSS[tur], saat = g[2] ? deSaat(g[2]) : "";
  return { tur, selam: g[0], simge: g[1], saat, durum: icR(g[3]) };
}
const DE_GRUSS_KABUL = { morgen: ["Guten Morgen!"], tag: ["Guten Tag!"], abend: ["Guten Abend!"], tschuss: ["Tschüss!", "Auf Wiedersehen!", "Tschüs!"] };
function deGrussDenetle(d, y) {
  if (deE(y, DE_GRUSS_KABUL[d.tur]) || deE(y.replace(/,.*$/, ""), DE_GRUSS_KABUL[d.tur])) return { tur: "dogru" };
  const w = deGenisle(y);
  const yazilan = Object.keys(DE_GRUSS_KABUL).find(k => DE_GRUSS_KABUL[k].some(x => w.startsWith(deGenisle(x))));
  const neden = { morgen: "sabah (06–10) → <b>Guten Morgen!</b>", tag: "gündüz / öğle (11–17) → <b>Guten Tag!</b>", abend: "akşam (18–21) → <b>Guten Abend!</b>", tschuss: "ayrılırken → <b>Tschüss!</b> / <b>Auf Wiedersehen!</b>" }[d.tur];
  if (yazilan || /^hallo/.test(w)) return { tur: "selam", m: `${d.saat ? `Saat ${d.saat}: ` : ""}${neden}` };
  return icGenelTeshis(d.selam, y);
}
icKonu({
  kod: "gruss", ad: "Wann sagst du was? (Guten Morgen / Tag / Abend, Tschüss)", simge: "👋", kaynak: "Çalışma kâğıdı · Aufgabe 2",
  kural: `🌅 Sabah → <b>Guten Morgen!</b> (Günaydın) · ☀️ Gün içinde / öğle → <b>Guten Tag!</b> (İyi günler) · 🌙 Akşam → <b>Guten Abend!</b> (İyi akşamlar)<br>
    👋 Ayrılırken → <b>Tschüss!</b> (arkadaşa) / <b>Auf Wiedersehen!</b> (büyüklere) · <b>Hallo!</b> = Merhaba (her saatte, arkadaşa)<br>Morgen, Tag, Abend <b>büyük harfle</b> yazılır.`,
  kesfet() {
    const d = ["morgen", "tag", "abend", "tschuss"].map(deDurum);
    return { anahtar: "deg-k-" + d.map(x => x.saat + x.durum).join(),
      ornekler: d.map(x => `${x.simge} ${x.saat ? x.saat + " · " : ""}${icE(x.durum)} → ${icRenk(x.selam, "ek")}`),
      soru: "Akşam saat 19:30'da komşunla karşılaşınca ne dersin?", secenekler: ["Guten Abend!", "Guten Morgen!", "Tschüss!"], dogru: "Guten Abend!",
      ipucu: "Saatlere bak: hangi saatte hangi selam kullanılmış?" };
  },
  turler: {
    durum() {
      const d = icKaristir(["morgen", "tag", "abend", "tschuss"]).map(deDurum);
      return { yon: "de_durum", anahtar: "deg-d-" + d.map(x => x.saat + x.durum).join(), govde: "",
        parcalar: d.map((x, i) => ({ s: `${i + 1}. ${x.simge} ${x.saat ? "Saat " + x.saat + ", " : ""}${icE(x.durum)}.`, cevap: x.selam, ipucu: x.saat ? `Saat ${x.saat}: sabah mı, gündüz mü, akşam mı?` : "Ayrılırken ne denir?", d: y => deGrussDenetle(x, y) })) };
    },
    bos() {
      const d = icSec(["morgen", "tag", "abend"], 2).map(deDurum).concat([deDurum("tschuss")]);
      const [a, b] = deIkiAd(), hoca = icR(["Frau Weber", "Herr Müller", "Frau Schmidt", "Herr Kaya"]);
      return { yon: "de_bos", anahtar: "deg-b-" + d.map(x => x.saat + x.durum).join() + a,
        govde: "", parcalar: d.map((x, i) => {
          if (x.tur === "tschuss") return { s: `${x.simge} ${icE(x.durum)}. &nbsp; ${a}: ____, ${b}! &nbsp; ${b}: Tschüss, ${a}!`, b: ["Tschüss", "Auf Wiedersehen", "Tschüs"], tek: 1, cevap: "Tschüss", ipucu: "Ayrılırken…" };
          const kelime = x.selam.split(" ")[1].replace("!", "");
          return { s: `${x.simge} ${x.saat} &nbsp; ${a}: Guten ____, ${hoca}! &nbsp; ${hoca}: ${x.selam.replace("!", "")}, ${a}!`.replace(x.selam.replace("!", "") + ", " + a, "Hallo, " + a), b: [kelime], tek: 1, cevap: kelime,
            ipucu: `Saat ${x.saat}`, d: y => deE(y, [kelime]) ? (y.trim()[0] === y.trim()[0].toLowerCase() ? { tur: "buyuk", m: `<b>${kelime}</b> büyük harfle yazılır (Almancada isimler büyük harfle başlar).` } : { tur: "dogru" }) :
              ["morgen", "tag", "abend"].includes(deGenisle(y)) ? { tur: "selam", m: `Saat ${x.saat} → Guten <b>${kelime}</b>!` } : icGenelTeshis(kelime, y) };
        }) };
    },
    saat() {
      const s = icSec(["morgen", "tag", "abend", "morgen", "tag", "abend"], 4).map(deDurum);
      return { yon: "de_durum", anahtar: "deg-s-" + s.map(x => x.saat).join(), govde: `<p class="ic-ipucu">Es ist … Uhr = Saat …</p>`,
        parcalar: s.map((x, i) => ({ s: `${i + 1}. 🕰️ Es ist ${x.saat} Uhr.`, cevap: x.selam, ipucu: "Sabah mı, gündüz mü, akşam mı?", d: y => deGrussDenetle(x, y) })) };
    },
    ceviri() {
      const ad = deAd(), hoca = icR([["Frau Weber", "Weber Hanım"], ["Herr Müller", "Müller Bey"], ["Frau Schmidt", "Schmidt Hanım"], ["Herr Kaya", "Kaya Bey"]]);
      const t = icSec([["Günaydın!", ["Guten Morgen!"]], ["İyi günler!", ["Guten Tag!"]], ["İyi akşamlar!", ["Guten Abend!"]], ["Hoşça kal! (arkadaşına)", ["Tschüss!", "Tschüs!"]],
        ["Güle güle! (öğretmenine)", ["Auf Wiedersehen!"]], ["Merhaba!", ["Hallo!"]], [`Günaydın, ${hoca[1]}!`, [`Guten Morgen, ${hoca[0]}!`]],
        [`İyi akşamlar, ${hoca[1]}!`, [`Guten Abend, ${hoca[0]}!`]], [`Merhaba ${ad}!`, [`Hallo ${ad}!`, `Hallo, ${ad}!`]], [`Hoşça kal, ${ad}!`, [`Tschüss, ${ad}!`, `Tschüss ${ad}!`]],
        [`İyi günler, ${hoca[1]}!`, [`Guten Tag, ${hoca[0]}!`]], [`Hoşça kalın, ${hoca[1]}!`, [`Auf Wiedersehen, ${hoca[0]}!`]]], 3);
      return { yon: "de_ceviri", anahtar: "deg-t-" + t.map(x => x[0]).join(), govde: "",
        parcalar: t.map(([tr, de]) => ({ s: `🇹🇷 ${tr}`, b: de, cevap: de[0], ipucu: de[0].slice(0, 6) + "…" })) };
    },
  },
  adim: { 2: ["durum", "bos", "saat"], 3: ["durum", "bos", "saat", "ceviri"] },
}, DE_KONULAR);

/* ---------- 3. Kendini tanıtma: Wie heißt du? Wer bist du? Wie alt bist du? ---------- */
icKonu({
  kod: "vorstellen", ad: "Wie heißt du? Wer bist du? Wie alt bist du?", simge: "🙋", kaynak: "Çalışma kâğıdı · Aufgabe 6–7",
  kural: `<b>Wie heißt du?</b> (Adın ne?) → <b>Ich heiße</b> Can. · <b>Wer bist du?</b> (Sen kimsin?) → <b>Ich bin</b> Can.<br>
    <b>Wie alt bist du?</b> (Kaç yaşındasın?) → <b>Ich bin</b> elf <b>Jahre alt</b>. · <b>Und du?</b> = Ya sen?<br>ich <b>heiße</b> · du <b>heißt</b> · ich <b>bin</b> · du <b>bist</b> (ß klavyede yoksa düğmeden)`,
  kesfet() {
    const a = deAd(), n = icR([10, 11, 12]);
    return { anahtar: "dev-k-" + a + n,
      ornekler: [`Wie ${icRenk("heißt", "oz")} du? → Ich ${icRenk("heiße", "ek")} ${a}.`, `Wer ${icRenk("bist", "oz")} du? → Ich ${icRenk("bin", "ek")} ${a}.`, `Wie alt ${icRenk("bist", "oz")} du? → Ich ${icRenk("bin", "ek")} ${DE_SAYI[n]} Jahre alt.`],
      soru: "\"Wie alt bist du?\" ne soruyor?", secenekler: ["Kaç yaşındasın?", "Adın ne?", "Nasılsın?"], dogru: "Kaç yaşındasın?", ipucu: "alt = yaşlı (yaş). Örneklerdeki cevaba bak." };
  },
  turler: {
    kart() {
      const kiz = Math.random() < .5, a = icR(kiz ? DE_KIZ : DE_ERKEK), n = icR([9, 10, 11, 12, 13]), q = icSec(["heisst", "alt", "wer"], 3);
      const Q = { heisst: ["Wie heißt du?", `Ich heiße ${a}.`], alt: ["Wie alt bist du?", `Ich bin ${DE_SAYI[n]} Jahre alt.`], wer: ["Wer bist du?", `Ich bin ${a}.`] };
      return { yon: "de_kart", anahtar: "dev-c-" + a + n + q.join(), govde: `<div class="ic-kart-kisi"><span>${kiz ? "👧" : "👦"}</span><b>${a}</b><small>${n} Jahre</small></div>`,
        parcalar: q.map(k => ({ s: Q[k][0], b: k === "alt" ? [Q[k][1], `Ich bin ${DE_SAYI[n]}.`] : [Q[k][1]], cevap: Q[k][1], ipucu: Q[k][1].replace(a, "…").replace(DE_SAYI[n], "…"),
          d: y => { const w = deGenisle(y);
            if ((k === "alt" ? [Q[k][1], `Ich bin ${DE_SAYI[n]}.`] : [Q[k][1]]).some(x => deGenisle(x) === w)) return { tur: "dogru" };
            if (k === "alt" && new RegExp(`\\b${n}\\b`).test(w)) return { tur: "rakam", m: `Sayıyı Almanca yaz: <b>${DE_SAYI[n]}</b>. → ${Q[k][1]}` };
            if (k === "heisst" && /^ich bin /.test(w)) return { tur: "kalip", m: `"Wie heißt du?" → <b>Ich heiße</b> ${a}. (Ich bin ${a} de doğru ama soru heißen ile soruldu.)` };
            if (k === "heisst" && /^ich heisst/.test(w)) return { tur: "ek", m: `ich <b>heiße</b> · du heißt → <b>${Q[k][1]}</b>` };
            if (k === "alt" && !/jahre/.test(w) && /^ich bin/.test(w)) return { tur: "dogru" };
            if (/^ich bist/.test(w)) return { tur: "ek", m: "ich <b>bin</b> · du bist" };
            return icGenelTeshis(Q[k][1], y); } })) };
    },
    luecke() {
      const a = deAd(), n = icR([10, 11, 12]);
      const s = icSec([[`Ich ____ ${a}. (heißen)`, "heiße"], [`Ich ____ ${DE_SAYI[n]} Jahre alt.`, "bin"], ["Wie ____ du? — Ich heiße " + a + ".", "heißt"], ["Wie alt ____ du?", "bist"],
        ["____ bist du? — Ich bin " + a + ".", "Wer"], ["Wie ____ es dir?", "geht"], [`Ich bin elf Jahre alt. ____ du?`, "Und"]], 4);
      return { yon: "de_luecke", anahtar: "dev-l-" + s.map(x => x[0]).join(), govde: "",
        parcalar: s.map(([c, k]) => ({ s: c, b: [k], tek: 1, cevap: k, ipucu: { "heiße": "ich heiße", "bin": "ich bin", "heißt": "du heißt", "bist": "du bist", "Wer": "Kim?", "geht": "Wie geht es dir?", "Und": "Ya sen? = … du?" }[k],
          d: y => { if (deE(y, [k])) return /ss/i.test(y) && /ß/.test(k) ? { tur: "dogru" } : { tur: "dogru" };
            const w = deGenisle(y), x = deGenisle(k);
            if ((x === "heisse" && w === "heisst") || (x === "heisst" && w === "heisse")) return { tur: "ek", m: `ich <b>heiße</b> · du <b>heißt</b> → <b>${k}</b>` };
            if ((x === "bin" && w === "bist") || (x === "bist" && w === "bin")) return { tur: "ek", m: `ich <b>bin</b> · du <b>bist</b> → <b>${k}</b>` };
            return icGenelTeshis(k, y); } })) };
    },
    ceviri() {
      const a = deAd(), n = icR([9, 10, 11, 12, 13]), m = icR([10, 11, 12]);
      const t = icSec([[`Benim adım ${a}.`, [`Ich heiße ${a}.`]], [`Ben ${a}'yım.`.replace(/'yım/, ""), [`Ich bin ${a}.`]], [`${n} yaşındayım.`.replace(/^\d+/, String(n)), [`Ich bin ${DE_SAYI[n]} Jahre alt.`, `Ich bin ${DE_SAYI[n]}.`]],
        ["Adın ne?", ["Wie heißt du?"]], ["Sen kimsin?", ["Wer bist du?"]], ["Kaç yaşındasın?", ["Wie alt bist du?"]], [`Ben de ${m} yaşındayım.`, [`Ich bin auch ${DE_SAYI[m]}.`, `Ich bin auch ${DE_SAYI[m]} Jahre alt.`]],
        [`Benim adım ${a}. Ya senin?`, [`Ich heiße ${a}. Und du?`]], [`${m} yaşındayım. Ya sen?`, [`Ich bin ${DE_SAYI[m]} Jahre alt. Und du?`, `Ich bin ${DE_SAYI[m]}. Und du?`]]], 3);
      return { yon: "de_ceviri", anahtar: "dev-t-" + t.map(x => x[0]).join(), govde: "",
        parcalar: t.map(([tr, de]) => ({ s: `🇹🇷 ${tr}`, b: de, cevap: de[0], ipucu: de[0].split(" ").slice(0, 2).join(" ") + " …",
          d: y => deE(y, de) ? { tur: "dogru" } : /\d/.test(y) ? { tur: "rakam", m: `Sayıyı Almanca kelimeyle yaz: <b>${icE(de[0])}</b>` } : icGenelTeshis(de[0], y) })) };
    },
    frage() {
      const a = deAd(), s = icSec([[`Ich heiße ${a}.`, ["Wie heißt du?"]], [`Ich bin ${DE_SAYI[icR([10, 11, 12])]} Jahre alt.`, ["Wie alt bist du?"]],
        [`Mir geht es ${icR(DE_BEFINDEN)[0]}.`, ["Wie geht es dir?", "Wie geht's?", "Wie geht's dir?"]], [`Ich bin ${a}.`, ["Wer bist du?", "Wie heißt du?"]]], 2);
      return { yon: "de_frage", anahtar: "dev-f-" + s.map(x => x[0]).join(), govde: "",
        parcalar: s.map(([c, b]) => ({ s: `____? — ${c}`, b, cevap: b[0], ipucu: b[0].split(" ").slice(0, 2).join(" ") + " …?" })) };
    },
  },
  adim: { 2: ["kart", "luecke"], 3: ["kart", "luecke", "frage", "ceviri"] },
}, DE_KONULAR);

/* ---------- 4. Zahlen 0–20 (kâğıt Aufgabe 3) ---------- */
function deSayiTeshis(n, y) {
  const w = deGenisle(y), x = DE_SAYI[n];
  if (n === 16 && /sechszehn/.test(w)) return { tur: "16", m: "16 = <b>sechzehn</b> (sechs'teki s düşer)" };
  if (n === 17 && /siebenzehn/.test(w)) return { tur: "17", m: "17 = <b>siebzehn</b> (sieben'deki en düşer)" };
  if (n === 12 && /zwoelf|zwolf|zwelf/.test(w)) return { tur: "12", m: "12 = <b>zwölf</b> (ö ile)" };
  if (/fuenf|funf/.test(w) && /fünf/.test(x)) return { tur: "5", m: `<b>ü</b> ile yaz: <b>${x}</b>` };
  if (n === 1 && w === "ein") return { tur: "1", m: "Sayarken 1 = <b>eins</b>" };
  if (n >= 13 && n <= 19 && /zehn$/.test(w)) return { tur: "zehn", m: `13–19 arası: birler + zehn → <b>${x}</b>` };
  const b = DE_SAYI.indexOf(w); if (b >= 0) return { tur: "sayi", m: `"${icE(y.trim())}" = ${b}. ${n} = <b>${x}</b>` };
  return icGenelTeshis(x, y);
}
icKonu({
  kod: "zahlen", ad: "Zahlen 0–20 (Zahlen-Tabelle)", simge: "🔢", kaynak: "Çalışma kâğıdı · Aufgabe 3",
  kural: `0 null · 1 eins · 2 zwei · 3 drei · 4 vier · 5 fünf · 6 sechs · 7 sieben · 8 acht · 9 neun · 10 zehn<br>11 elf · 12 zwölf · 13 drei<b>zehn</b> · 14 vier<b>zehn</b> · 15 fünf<b>zehn</b> · 16 <b>sech</b>zehn · 17 <b>sieb</b>zehn · 18 acht<b>zehn</b> · 19 neun<b>zehn</b> · 20 zwanzig<br>
    13–19: birler + <b>zehn</b>. Dikkat: 16 = sechzehn (s düşer), 17 = siebzehn (en düşer). Okunuş: zwei [tsvay], drei [dray], sechs [zeks], zwanzig [tsvantsiç]`,
  kesfet() {
    const n = icSec([13, 14, 15, 18, 19], 3);
    return { anahtar: "dez-k-" + n.join(),
      ornekler: n.map(x => `${x - 10} ${DE_SAYI[x - 10]} → ${x} ${icRenk(DE_SAYI[x - 10], "oz")}${icRenk("zehn", "ek")}`).concat([`6 sechs → 16 ${icRenk("sech", "oz")}${icRenk("zehn", "ek")} · 7 sieben → 17 ${icRenk("sieb", "oz")}${icRenk("zehn", "ek")}`]),
      soru: "16 nasıl yazılır?", secenekler: ["sechzehn", "sechszehn", "zehnsechs"], dogru: "sechzehn", ipucu: "Son satırdaki 16 ve 17'ye dikkatle bak." };
  },
  turler: {
    tablo() {
      const n = icSec(Array.from({ length: 21 }, (_, i) => i), 6);
      return { yon: "de_tablo", anahtar: "dez-t-" + n.join(),
        govde: `<table class="ic-tablo"><tr><th>Ziffer</th><th>Wort</th></tr>${n.map((x, i) => i % 2 ? `<tr><td>____ (${i + 1})</td><td>${DE_SAYI[x]}</td></tr>` : `<tr><td>${x}</td><td>____ (${i + 1})</td></tr>`).join("")}</table>`,
        parcalar: n.map((x, i) => i % 2 ? { s: `(${i + 1}) ${DE_SAYI[x]} → Ziffer?`, b: [String(x)], tek: 1, ipucu: "Rakamla yaz", d: y => y.trim() === String(x) ? { tur: "dogru" } : { tur: "sayi", m: `${DE_SAYI[x]} = <b>${x}</b>` } }
          : { s: `(${i + 1}) ${x} → Wort?`, b: [DE_SAYI[x]], tek: 1, ipucu: x > 12 ? "… + zehn" : "", n: x }) };
    },
    reihe() {   // sayı dizileri: 1'er, 2'şer, 3'er, 5'er; ileri/geri
      const d = [];
      for (let i = 0; i < 3; i++) for (let k = 0; k < 50; k++) {
        const adim = icR([1, 2, 3, 5, -1, -2]), bas = Math.floor(Math.random() * 21), dz = [0, 1, 2, 3].map(j => bas + j * adim);
        if (dz.every(x => x >= 0 && x <= 20) && !d.some(z => z[0] === dz[0] && z[1] === dz[1])) { d.push(dz); break; }
      }
      return { yon: "de_yaz", anahtar: "dez-r-" + d.map(x => x.join(".")).join(), govde: `<p class="ic-ipucu">Dizideki sıradaki sayıyı Almanca kelimeyle yaz.</p>`,
        parcalar: d.map(x => ({ s: `${x.slice(0, 3).map(n => DE_SAYI[n]).join(", ")}, ____`, b: [DE_SAYI[x[3]]], tek: 1, n: x[3], ipucu: `${x[0]}, ${x[1]}, ${x[2]}, ?` })) };
    },
    nachbar() {   // önce / sonra gelen sayı
      const n = icSec(Array.from({ length: 19 }, (_, i) => i + 1), 4);
      const s = n.map(x => { const sonra = Math.random() < .5; return [x, sonra, sonra ? x + 1 : x - 1]; });
      return { yon: "de_yaz", anahtar: "dez-n-" + s.map(x => x.join(".")).join(), govde: `<p class="ic-ipucu">davor = önceki · danach = sonraki</p>`,
        parcalar: s.map(([x, sonra, c]) => ({ s: `${sonra ? "danach" : "davor"}: ${sonra ? `${DE_SAYI[x]} → ____` : `____ → ${DE_SAYI[x]}`}`, b: [DE_SAYI[c]], tek: 1, n: c, ipucu: `${sonra ? x + " + 1" : x + " − 1"}` })) };
    },
    yaz() {
      const n = icSec([1, 2, 3, 6, 7, 11, 12, 16, 17, 20, 13, 15, 5, 9, 0, 4, 8, 10, 14, 18, 19], 4);
      return { yon: "de_yaz", anahtar: "dez-y-" + n.join(), govde: "",
        parcalar: n.map(x => ({ s: `${x} =`, b: [DE_SAYI[x]], tek: 1, ipucu: x > 12 ? "birler + zehn" : `${DE_SAYI[x][0]}…`, n: x })) };
    },
  },
  adim: { 2: ["yaz", "nachbar"], 3: ["tablo", "yaz", "reihe", "nachbar"] },
  teshis(p, y) { return p.n != null ? deSayiTeshis(p.n, y) : null; },
}, DE_KONULAR);

/* ---------- 5. Buchstabensalat (kâğıt Aufgabe 4) ---------- */
function deKaristirHarf(w) {
  const h = w.toUpperCase().split(""); let s;
  for (let i = 0; i < 20; i++) { s = icKaristir(h).join(""); if (s !== w.toUpperCase()) break; }
  return s;
}
function deSalat(adet) {
  const n = icSec(Array.from({ length: 20 }, (_, i) => i + 1).filter(x => DE_SAYI[x].length >= 3), adet);
  return { yon: "de_salat", anahtar: "des-" + n.join(), govde: `<p class="ic-ipucu">Kelimeyi yaz; istersen yanına rakamını da ekle (sechs 6).</p>`,
    parcalar: n.map(x => ({ s: `<span class="ic-salat">${deKaristirHarf(DE_SAYI[x])}</span>`, cevap: `${DE_SAYI[x]} (${x})`, tek: 1, ipucu: `Bu sayı ${x}.`, n: x,
      d: y => { const w = deGenisle(y).replace(/\d+/g, "").trim(), rakam = (y.match(/\d+/) || [])[0];
        if (w === deGenisle(DE_SAYI[x])) return rakam && +rakam !== x ? { tur: "rakam", m: `Kelime doğru ama rakamı ${x} olmalı.` } : { tur: "dogru" };
        if (!w && rakam) return +rakam === x ? { tur: "kelime", m: `Rakam doğru; kelimeyi de yaz: <b>${DE_SAYI[x]}</b>` } : { tur: "sayi", m: `Bu harflerle <b>${DE_SAYI[x]}</b> (${x}) yazılır.` };
        return deSayiTeshis(x, w); } })) };
}
icKonu({
  kod: "salat", ad: "Buchstabensalat (karışık harflerden sayı)", simge: "🔤", kaynak: "Çalışma kâğıdı · Aufgabe 4",
  kural: `Karışık harflerin <b>hepsini</b> kullan, hiç harf ekleme ve çıkarma.<br>İpucu: kaç harf var? Hangi sayılar bu uzunlukta? (3 harf: elf, null… · 4: zwei, drei, vier, fünf, acht, neun, zehn · 5: sechs, zwölf…)<br>
    <b>ZEHN</b> parçası görürsen 13–19 arası bir sayı olabilir.`,
  kesfet() {
    const n = icSec([6, 8, 3, 9, 4, 10], 3);
    return { anahtar: "des-k-" + n.join(), ornekler: n.map(x => `${deKaristirHarf(DE_SAYI[x])} → ${icRenk(DE_SAYI[x].toUpperCase(), "ek")} (${x})`),
      soru: "THCA hangi sayı?", secenekler: ["acht (8)", "drei (3)", "neun (9)"], dogru: "acht (8)", ipucu: "Harfleri tek tek say: A, C, H, T." };
  },
  turler: { salat3() { return deSalat(3); }, salat5() { return deSalat(5); } },
  adim: { 2: ["salat3"], 3: ["salat5"] },
}, DE_KONULAR);

/* ---------- 6. Rechnen auf Deutsch (kâğıt Aufgabe 5) ---------- */
function deIslem() {
  for (;;) {
    const plus = Math.random() < .55, a = Math.floor(Math.random() * 21), b = Math.floor(Math.random() * 21), s = plus ? a + b : a - b;
    if (s >= 0 && s <= 20 && a + b > 1) return { a, b, plus, s, metin: `${DE_SAYI[a]} ${plus ? "plus" : "minus"} ${DE_SAYI[b]} =` };
  }
}
icKonu({
  kod: "rechnen", ad: "Rechnen auf Deutsch (plus – minus)", simge: "➕", kaynak: "Çalışma kâğıdı · Aufgabe 5",
  kural: `<b>plus</b> = + (artı) · <b>minus</b> = − (eksi) · <b>ist</b> = eşittir<br>Önce sayıları Türkçeye çevir, işlemi yap, sonucu <b>Almanca kelimeyle</b> yaz: zwei plus drei = <b>fünf</b>`,
  kesfet() {
    const i = deIslem();
    return { anahtar: "der-k-" + i.metin, ornekler: [`${icRenk(DE_SAYI[i.a], "oz")} (${i.a}) ${icRenk(i.plus ? "plus" : "minus", "ek")} ${icRenk(DE_SAYI[i.b], "oz")} (${i.b}) = ${DE_SAYI[i.s]} (${i.s})`, "zehn minus vier = ?"],
      soru: "zehn minus vier = ?", secenekler: ["sechs", "vierzehn", "vier"], dogru: "sechs", ipucu: "zehn = 10, vier = 4, minus = eksi." };
  },
  turler: {
    satz() {   // rakamla verilen işlemi Almanca yaz: 4 + 5 = 9 → vier plus fünf ist neun
      const i = [deIslem(), deIslem()];
      return { yon: "de_rechnen", anahtar: "der-s-" + i.map(x => x.metin).join(), govde: `<p class="ic-ipucu">İşlemi Almanca kelimelerle yaz: + plus · − minus · = ist</p>`,
        parcalar: i.map(x => { const c = `${DE_SAYI[x.a]} ${x.plus ? "plus" : "minus"} ${DE_SAYI[x.b]} ist ${DE_SAYI[x.s]}`;
          return { s: `${x.a} ${x.plus ? "+" : "−"} ${x.b} = ${x.s}`, b: [c, c.replace(" ist ", " gleich "), c.replace(" ist ", " = ")], cevap: c, tek: 1, ipucu: `${DE_SAYI[x.a]} … ist …`,
            d: y => deE(y.replace("=", " ist "), [c, c.replace(" ist ", " gleich ")]) ? { tur: "dogru" } : /\d/.test(y) ? { tur: "rakam", m: `Rakam değil, kelime: <b>${c}</b>` } : icGenelTeshis(c, y.replace("=", " ist ")) }; }) };
    },
    rechnen() {
      const i = [deIslem(), deIslem(), deIslem(), deIslem()];
      return { yon: "de_rechnen", anahtar: "der-" + i.map(x => x.metin).join(), govde: "",
        parcalar: i.map(x => ({ s: x.metin, b: [DE_SAYI[x.s]], tek: 1, n: x.s, ipucu: `${x.a} ${x.plus ? "+" : "−"} ${x.b} = ?`,
          d: y => { if (deE(y, [DE_SAYI[x.s]])) return { tur: "dogru" }; const r = (y.match(/\d+/) || [])[0];
            if (r) return +r === x.s ? { tur: "kelime", m: `Sonuç doğru (${x.s}); Almanca kelimeyle yaz: <b>${DE_SAYI[x.s]}</b>` } : { tur: "hesap", m: `${x.a} ${x.plus ? "+" : "−"} ${x.b} = ${x.s} → <b>${DE_SAYI[x.s]}</b>` };
            const w = DE_SAYI.indexOf(deGenisle(y).replace(/ss/g, "ss"));
            if (w >= 0) return { tur: "hesap", m: `${DE_SAYI[x.a]} = ${x.a}, ${DE_SAYI[x.b]} = ${x.b}; ${x.a} ${x.plus ? "+" : "−"} ${x.b} = ${x.s} → <b>${DE_SAYI[x.s]}</b>` };
            return deSayiTeshis(x.s, y); } })) };
    },
  },
  adim: { 2: ["rechnen"], 3: ["rechnen", "satz"] },
}, DE_KONULAR);

/* ---------- 7. Dialog ordnen (kâğıt Aufgabe 6) ---------- */
function deDiyalog(uzun) {
  const [a, b] = deIkiAd(), m = icR(DE_BEFINDEN)[0], n = icR([10, 11, 12]), ayni = Math.random() < .5, sel = icR(["Hallo!", "Guten Morgen!", "Guten Tag!"]);
  const s = uzun ? [
    `${sel} Wie heißt du?`, `Ich heiße ${b}. Und du?`, `Ich heiße ${a}. Wie geht es dir?`, `Mir geht es ${m}, danke. Wie alt bist du?`,
    `Ich bin ${DE_SAYI[n]} Jahre alt. Und du?`, ayni ? `Ich bin auch ${DE_SAYI[n]}. Tschüss, ${a}!` : `Ich bin ${DE_SAYI[n === 12 ? 11 : n + 1]} Jahre alt. Tschüss, ${a}!`, `Tschüss, ${b}!`]
    : [`${sel} Wie heißt du?`, `Ich heiße ${b}. Und du?`, `Ich heiße ${a}. Wie geht es dir?`, `Mir geht es ${m}, danke. Tschüss!`, `Tschüss, ${b}!`];
  return s;
}
icKonu({
  kod: "ordnen", ad: "Dialog ordnen (karışık diyaloğu sıraya koy)", simge: "💬", kaynak: "Çalışma kâğıdı · Aufgabe 6",
  kural: `Diyalog sırası: <b>1</b> selam + soru (Hallo! Wie heißt du?) → <b>2</b> cevap + "Und du?" → <b>3</b> cevap + yeni soru → … → son: <b>Tschüss!</b><br>
    İpucu: Her cümle bir önceki <b>sorunun cevabıdır</b>. "Und du?" (Ya sen?) diyen kişiye, sonraki cümlede aynı soruyla cevap verilir.<br>Adlara dikkat: "Tschüss, Mia!" diyen kişi Mia değildir.`,
  kesfet() {
    const s = deDiyalog(false);
    return { anahtar: "deo-k-" + s.join(), ornekler: s.map((x, i) => `${icRenk(i + 1 + ".", "ek")} ${icE(x)}`),
      soru: "\"Ich heiße Mia. Und du?\" cümlesinden sonra hangisi gelir?", secenekler: ["Ich heiße Can.", "Hallo! Wie heißt du?", "Tschüss, Mia!"], dogru: "Ich heiße Can.",
      ipucu: "\"Und du?\" = Ya sen? Karşıdaki kişi de adını söyler." };
  },
  turler: {
    kisa() { return deOrdnenSoru(false); },
    uzun() { return deOrdnenSoru(true); },
  },
  adim: { 2: ["kisa"], 3: ["uzun"] },
}, DE_KONULAR);
function deOrdnenSoru(uzun) {
  const s = deDiyalog(uzun), k = icKaristir(s.map((x, i) => [x, i + 1]));
  return { yon: "de_ordnen", anahtar: "deo-" + s.join(), govde: `<p class="ic-ipucu">Her cümlenin kutusuna sırasını yaz (1–${s.length}).</p>`,
    parcalar: k.map(([x, i]) => ({ s: icE(x), b: [String(i)], tek: 1, cevap: String(i), ipucu: i === 1 ? "Diyalog selamla başlar." : i === s.length ? "Son söz veda." : "Hangi sorunun cevabı?",
      d: y => y.trim() === String(i) ? { tur: "dogru" } : !/^\d+$/.test(y.trim()) ? { tur: "rakam", m: "Kutuya yalnız sıra numarasını yaz (1, 2, 3…)." } : { tur: "sira", m: `Bu cümle <b>${i}.</b> sırada. ${i === 1 ? "Diyalog selamla başlar." : `Önceki cümle: "${icE(s[i - 2])}"`}` } })) };
}

/* ---------- 8. Mein Steckbrief (kâğıt Aufgabe 7) ---------- */
const DE_SAYI_RE = DE_SAYI.map(x => deGenisle(x)).join("|");
icKonu({
  kod: "steckbrief", ad: "Mein Steckbrief (kendini tanıt, kısa diyalog yaz)", simge: "🪪", kaynak: "Çalışma kâğıdı · Aufgabe 7",
  kural: `<b>Ich heiße</b> … · <b>Ich bin</b> … <b>Jahre alt</b>. · <b>Mir geht es</b> super / gut / so lala / schlecht. · <b>Meine Lieblingszahl ist</b> … (en sevdiğim sayı)<br>
    Diyalog: A: Hallo! → B: <b>Hallo!</b> / Hallo! Wie heißt du? → … → <b>Tschüss!</b><br>Sayıları Almanca kelimeyle yaz; Jahre, Lieblingszahl büyük harfle.`,
  kesfet() {
    const a = deAd(), n = icR([10, 11, 12]), z = icR([3, 7, 9, 13, 20]);
    return { anahtar: "dest-k-" + a + n + z,
      ornekler: [`${icRenk("Ich heiße", "oz")} ${a}.`, `${icRenk("Ich bin", "oz")} ${DE_SAYI[n]} ${icRenk("Jahre alt", "oz")}.`, `${icRenk("Mir geht es", "oz")} gut.`, `${icRenk("Meine Lieblingszahl ist", "oz")} ${DE_SAYI[z]}.`],
      soru: "\"Meine Lieblingszahl ist sieben.\" ne demek?", secenekler: ["En sevdiğim sayı yedi.", "Yedi yaşındayım.", "Saat yedi."], dogru: "En sevdiğim sayı yedi.", ipucu: "Lieblings- = en sevilen, Zahl = sayı." };
  },
  turler: {
    ich() {
      const q = [
        ["Ich heiße …", "Ich heiße Arın.", new RegExp(`^ich heisse [a-zçğıöşüäß]+$`), w => /^ich bin [a-z]/.test(w) && !new RegExp(`^ich bin (${DE_SAYI_RE})`).test(w) ? "Bu satırda <b>Ich heiße</b> … kullan." : null],
        ["Ich bin … Jahre alt.", "Ich bin elf Jahre alt.", new RegExp(`^ich bin (${DE_SAYI_RE}) jahre alt$`), w => /\d/.test(w) ? "Yaşını Almanca kelimeyle yaz: <b>elf</b>, zwölf…" : /^ich bin \w+$/.test(w) ? "Sonuna <b>Jahre alt</b> ekle." : null],
        ["Mir geht es …", "Mir geht es gut.", /^mir geht es (super|gut|so lala|schlecht)( danke)?$/, w => /^(super|gut|so lala|schlecht)$/.test(w) ? "Tam cümle: <b>Mir geht es</b> gut." : null],
        ["Meine Lieblingszahl ist …", "Meine Lieblingszahl ist sieben.", new RegExp(`^meine lieblingszahl ist (${DE_SAYI_RE})$`), w => /\d/.test(w) ? "Sayıyı Almanca kelimeyle yaz: <b>sieben</b>…" : /^mein lieblingszahl/.test(w) ? "<b>Meine</b> Lieblingszahl (Zahl dişil → meine)." : null]];
      return { yon: "de_ich", anahtar: "dest-i-" + Math.random(), govde: "",
        parcalar: q.map(([s, c, re, tf]) => ({ s, cevap: c, ipucu: c, d: y => re.test(deGenisle(y)) ? { tur: "dogru" } : { tur: "kalip", m: tf(deGenisle(y)) || `Örnek: <b>${c}</b>` } })) };
    },
    dialog() {
      const a = deAd(), sel = icR(["Hallo!", "Guten Morgen!", "Guten Tag!"]);
      const q = [
        [`A: ${sel} Wie heißt du?`, `B: ${sel} Ich heiße Arın.`, /^((hallo|guten (morgen|tag|abend)|hi) )?ich heisse [a-zçğıöşüäß]+( und du)?$/, "Adını söyle: <b>Ich heiße</b> …"],
        [`A: Ich heiße ${a}. Wie geht es dir?`, "B: Mir geht es gut, danke. Und dir?", /^mir geht es (super|gut|so lala|schlecht)( danke)?( und dir)?$/, "Kalıp: <b>Mir geht es</b> gut, danke."],
        ["A: Wie alt bist du?", "B: Ich bin elf Jahre alt.", new RegExp(`^ich bin (${DE_SAYI_RE})( jahre alt)?( und du)?$`), "Kalıp: <b>Ich bin</b> elf <b>Jahre alt</b>. (sayı kelimeyle)"],
        [`A: Tschüss!`, `B: Tschüss, ${a}!`, /^(tschüss|auf wiedersehen|tschüs)( [a-zçğıöşüäß]+)?$/, `Veda: <b>Tschüss, ${a}!</b>`]];
      return { yon: "de_dialog_yaz", anahtar: "dest-d-" + a + sel + Math.random(), govde: "",
        parcalar: q.map(([s, c, re, m]) => ({ s: icE(s) + "<br>B: …", cevap: c.replace(/^B: /, ""), ipucu: c.replace(/^B: /, ""), d: y => re.test(deGenisle(y.replace(/^\s*B:\s*/i, ""))) ? { tur: "dogru" } : { tur: "kalip", m } })) };
    },
  },
  adim: { 2: ["ich"], 3: ["ich", "dialog"] },
}, DE_KONULAR);

IC_PROFIL.almanca = { ders: "almanca", oyun: "y1-almanca", konular: DE_KONULAR, sira: ["befinden", "gruss", "vorstellen", "zahlen", "salat", "rechnen", "ordnen", "steckbrief"],
  yon: DE_YON, soz: DE_SOZ, genisle: deGenisle, ekUyari: deEkUyari, ozelHarf: ["ä", "ö", "ü", "ß"],
  provaKagit: [["befinden", "yuz"], ["gruss", "durum"], ["zahlen", "tablo"], ["salat", "salat5"], ["rechnen", "rechnen"], ["ordnen", "uzun"], ["steckbrief", "ich"], ["steckbrief", "dialog"]],
  provaDefter: ["vorstellen"], provaDefterSayi: 1 };

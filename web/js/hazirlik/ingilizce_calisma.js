/* ÖğretmeniM 0.31 — İngilizce 1. yazılı: yönlendirmeli konu çalışması.
   - Arın konu/adım seçmez: "▶ Çalış" der, uygulama sıradaki konuyu ve adımı seçer (ingSonraki).
   - Her konu 4 adım: 1 Keşfet (kuralı bul) · 2 Birlikte dene (ipucu + kural) · 3 Kendin yaz · 4 Ustalaş (karışık tekrar).
   - Sorular İngilizce ve yazılı kâğıdı / ders kitabı biçiminde; her açılışta yeniden üretilir (aynı soru tekrar gelmez).
   - Cevaptan önce "Bu soru senden ne istiyor?" (yönergeyi anlama) adımı; bilmediği kelimeye dokununca anlamı çıkar.
   - Cevaplar yazılır; denetleyici kısaltmaları açar, yanlışın nedenini söyler, büyük harf/nokta unutulursa hatırlatır.
   - İlerleme kayıtlardan hesaplanır: soru anahtarı "ic:<konu>:<adım>" (oyun y1-ingilizce). Not/puan gösterilmez. */
"use strict";

const IC = { sayac: 0, son: "", geri: {}, prova: null, p: null };
/* 0.32: dil profilleri — aynı motor İngilizce ve Almanca yazılılarını çalıştırır */
const IC_PROFIL = {};
const icP = () => IC.p || IC_PROFIL.ingilizce;
const icNorm = s => (icP().genisle || icGenisle)(s);
const IC_ADIM = ["", "Keşfet", "Birlikte dene", "Kendin yaz", "Ustalaş"];

/* ================= Yardımcılar ================= */
const icR = a => a[Math.floor(Math.random() * a.length)];
const icKaristir = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const icSec = (a, n) => icKaristir(a).slice(0, n);
const icB = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const icE = s => esc(String(s));
let IC_GORULEN = null;
function icGorulen() {
  if (IC_GORULEN) return IC_GORULEN;
  try { IC_GORULEN = new Set(JSON.parse(localStorage.getItem("ic-gorulen") || "[]")); } catch (_) { IC_GORULEN = new Set(); }
  return IC_GORULEN;
}
function icGorulduSay(anahtar) {
  const g = icGorulen(); g.add(anahtar);
  try { localStorage.setItem("ic-gorulen", JSON.stringify([...g].slice(-4000))); } catch (_) { /* yer yoksa yalnız bu oturum */ }
}
/* Üret: daha önce görülmemiş bir soru bulana dek dene (birkaç yüz/bin olasılık var) */
function icUret(f) {
  let s = null;
  for (let i = 0; i < 40; i++) { s = f(); if (!icGorulen().has(s.anahtar)) break; }
  return s;
}

/* ---------- Kelime havuzları (MEB English Year 5 Theme 1–2, Revision 1–2 ve defterdeki konular) ---------- */
const IC_KIZ = ["Elif", "Zeynep", "Ela", "Defne", "Sarah", "Anna", "Emma", "Mina", "Ayşe", "Lily", "Nil", "Ece"];
const IC_ERKEK = ["Can", "Kaan", "Emir", "Mert", "Ali", "Tom", "Jack", "Lucas", "Kerem", "Efe", "Deniz", "Sam"];
function icKisi(cins) {
  const kiz = cins ? cins === "k" : Math.random() < .5;
  const ad = icR(kiz ? IC_KIZ : IC_ERKEK);
  return { ad, z: kiz ? "she" : "he", Z: kiz ? "She" : "He", iy: kiz ? "her" : "his", Iy: kiz ? "Her" : "His", kiz };
}
function icIkiKisi() { const a = icKisi(); let b; do { b = icKisi(); } while (b.ad === a.ad); return [a, b]; }
const IC_SAYI = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen"];
const IC_ULKE = [   // ülke, milliyet, Türkçe, bayrak, şehir, örnek ad, cinsiyet
  ["the USA", "American", "ABD", "🇺🇸", "New York", "Emma", "k"], ["England", "English", "İngiltere", "🏴", "London", "Harry", "e"],
  ["Canada", "Canadian", "Kanada", "🇨🇦", "Toronto", "Liam", "e"], ["Australia", "Australian", "Avustralya", "🇦🇺", "Sydney", "Chloe", "k"],
  ["Japan", "Japanese", "Japonya", "🇯🇵", "Tokyo", "Yuki", "k"], ["South Korea", "South Korean", "Güney Kore", "🇰🇷", "Seoul", "Min-ho", "e"],
  ["China", "Chinese", "Çin", "🇨🇳", "Beijing", "Li", "k"], ["France", "French", "Fransa", "🇫🇷", "Paris", "Marie", "k"],
  ["Germany", "German", "Almanya", "🇩🇪", "Berlin", "Hans", "e"], ["Italy", "Italian", "İtalya", "🇮🇹", "Rome", "Marco", "e"],
  ["Spain", "Spanish", "İspanya", "🇪🇸", "Madrid", "Lucia", "k"], ["Brazil", "Brazilian", "Brezilya", "🇧🇷", "Rio", "Ana", "k"],
  ["Mexico", "Mexican", "Meksika", "🇲🇽", "Mexico City", "Carlos", "e"], ["Türkiye", "Turkish", "Türkiye", "🇹🇷", "Ankara", "Elif", "k"],
  ["India", "Indian", "Hindistan", "🇮🇳", "Mumbai", "Priya", "k"], ["Russia", "Russian", "Rusya", "🇷🇺", "Moscow", "Ivan", "e"],
  ["Egypt", "Egyptian", "Mısır", "🇪🇬", "Cairo", "Amal", "k"], ["Saudi Arabia", "Saudi", "Suudi Arabistan", "🇸🇦", "Riyadh", "Omar", "e"],
  ["Sweden", "Swedish", "İsveç", "🇸🇪", "Stockholm", "Erik", "e"], ["Greece", "Greek", "Yunanistan", "🇬🇷", "Athens", "Nikos", "e"]];
const IC_ULKE_EK = { "the USA": ["america", "the usa", "usa", "the united states"], "England": ["england"], "Türkiye": ["türkiye", "turkey"] };
const IC_KULUP = [["chess", "♟️", "playing chess"], ["music", "🎸", "singing songs"], ["art", "🎨", "drawing pictures"], ["sports", "⚽", "playing football"],
  ["drama", "🎭", "acting in plays"], ["science", "🔬", "doing experiments"], ["technology", "💻", "playing computer games"], ["film", "🎬", "watching films"],
  ["folk dance", "💃", "dancing"], ["environment", "🌱", "planting trees"], ["maths", "➗", "solving problems"], ["ballet", "🩰", "doing ballet"]];
const IC_YER = [["library", "📚", "We read books here."], ["canteen", "🥪", "We eat sandwiches here."], ["science lab", "🧪", "We do experiments here."],
  ["gym", "🏀", "We play basketball here."], ["music room", "🎵", "We sing songs here."], ["art room", "🎨", "We draw pictures here."],
  ["computer lab", "💻", "We use computers here."], ["garden", "🌳", "We plant flowers here."], ["playground", "🛝", "We play games here."],
  ["conference hall", "🎤", "We watch shows here."], ["sports field", "🏟️", "We play football here."], ["classroom", "🏫", "We have lessons here."]];
const IC_ROL = ["English teacher", "Maths teacher", "Science teacher", "Art teacher", "Music teacher", "headmaster", "coach", "school nurse", "secretary"];
const IC_SOYAD = ["Kaya", "Brown", "Demir", "Smith", "Yılmaz", "Green", "Aksoy", "White"];
const IC_SIFAT = ["kind", "helpful", "friendly", "funny", "clever"];
const IC_KURAL = [   // [must mi, cümle (You must/mustn't …), öğretmenin sözü]
  [1, "listen to the teachers carefully", "Listen to the teachers carefully."], [1, "raise your hand to speak", "When you want to answer a question, raise your hand."],
  [1, "keep the classroom clean", "Our classroom is our home, so keep it clean."], [1, "be polite to your friends", "Be polite and speak kindly to your friends."],
  [1, "be on time", "Come to school on time."], [1, "wear your uniform", "Wear your school uniform every day."], [1, "tidy your desk", "Tidy your desk after the lesson."],
  [0, "run in the classroom", "It is dangerous to run in the classroom."], [0, "shout at your friends", "Don't shout at your friends."],
  [0, "throw rubbish on the floor", "Put your rubbish in the bin, not on the floor."], [0, "eat in the classroom", "Don't eat in the classroom."],
  [0, "chew gum in class", "Don't chew gum in class."], [0, "fight with your friends", "Don't fight with your friends."], [0, "use your phone in class", "Phones are not allowed in class."]];
const IC_DERS = [["Turkish", "we read stories"], ["Maths", "we solve problems"], ["Science", "we do experiments"], ["Social Studies", "we learn about history"],
  ["English", "we speak English"], ["Art", "we draw pictures"], ["Music", "we sing songs"], ["PE", "we play basketball"], ["IT", "we use computers"], ["Drama", "we act in plays"]];
const IC_GUN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const IC_NESNE = ["a bike", "a computer", "a red bag", "a big garden", "a calculator", "an umbrella", "a pencil case", "a new scarf", "a dictionary",
  "a raincoat", "a backpack", "an old car", "a tablet", "a blue jacket", "a watch", "a skateboard", "a camera"];
const IC_EVCIL = ["a cat", "a dog", "a parrot", "a rabbit", "a fish", "a turtle"];
const IC_AILE = ["a brother", "a sister", "two brothers", "a little sister", "a baby brother", "two sisters"];
const IC_FIIL = [   // yalın, nesneler
  ["play", ["football", "chess", "the guitar", "basketball", "computer games", "volleyball"]], ["watch", ["TV", "cartoons", "films"]],
  ["read", ["books", "comics", "the newspaper"]], ["eat", ["breakfast", "fish", "vegetables", "fast food"]], ["drink", ["milk", "coffee", "tea", "orange juice"]],
  ["like", ["Maths", "pizza", "rainy days", "cold weather", "Science"]], ["speak", ["English", "German", "Spanish", "French"]],
  ["go", ["to school by bus", "to the cinema", "to bed early", "swimming"]], ["get up", ["early", "at seven o'clock"]],
  ["live", ["in Ankara", "in İzmir", "in a big house", "near the sea"]], ["ride", ["a bike", "a horse"]], ["do", ["homework after school", "the shopping"]],
  ["have", ["lunch at school", "breakfast at home"]], ["wash", ["the dishes", "the car"]], ["study", ["English", "Science"]], ["visit", ["the museum", "their grandparents"]],
  ["walk", ["to school", "the dog"]], ["teach", ["English", "Maths"]], ["wear", ["a uniform", "glasses"]], ["listen", ["to music", "to the radio"]],
  ["swim", ["in the sea", "every day"]], ["cook", ["dinner", "pasta"]], ["catch", ["the bus", "fish"]], ["fly", ["a kite"]]];
function icS(v) {   // 3. tekil şahıs: -s / -es / -ies; have → has
  const [f, ...r] = v.split(" ");
  let s = f === "have" ? "has" : f === "do" ? "does" : f === "go" ? "goes" : /(s|sh|ch|x|o)$/.test(f) ? f + "es" : /[^aeiou]y$/.test(f) ? f.slice(0, -1) + "ies" : f + "s";
  return [s, ...r].join(" ");
}
const IC_NESNE_RESIM = [["pencil", "✏️"], ["book", "📕"], ["ruler", "📏"], ["bag", "🎒"], ["apple", "🍎"], ["umbrella", "☂️"], ["orange", "🍊"], ["egg", "🥚"],
  ["clock", "🕰️"], ["ball", "⚽"], ["cat", "🐱"], ["dog", "🐶"], ["bird", "🐦"], ["tree", "🌳"], ["car", "🚗"], ["kite", "🪁"], ["star", "⭐"], ["flower", "🌸"],
  ["elephant", "🐘"], ["onion", "🧅"], ["ice cream", "🍦"], ["island", "🏝️"], ["owl", "🦉"], ["ant", "🐜"], ["octopus", "🐙"], ["key", "🔑"], ["hat", "👒"],
  ["guitar", "🎸"], ["horse", "🐴"], ["house", "🏠"], ["eagle", "🦅"], ["unicorn", "🦄"], ["airplane", "✈️"], ["eye", "👁️"], ["axe", "🪓"], ["igloo", "🛖"]];
const icCogul = n => /(s|sh|ch|x)$/.test(n) ? n + "es" : n + "s";
const icAn = w => /^(hour|honest)/.test(w) ? "an" : /^(uni|use|eu|one)/.test(w) ? "a" : /^[aeiou]/.test(w) ? "an" : "a";
const IC_AY = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const IC_SIRA_1 = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth", "thirteenth",
  "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth", "twentieth"];
function icSira(n) { if (n <= 20) return IC_SIRA_1[n]; if (n === 30) return "thirtieth"; return (n < 30 ? "twenty-" : "thirty-") + IC_SIRA_1[n % 10]; }
const icSiraKisa = n => n + ((n % 10 === 1 && n !== 11) ? "st" : (n % 10 === 2 && n !== 12) ? "nd" : (n % 10 === 3 && n !== 13) ? "rd" : "th");

/* ================= Cevap denetimi ================= */
function icGenisle(s) {
  s = String(s || "").toLocaleLowerCase("en").replace(/[’‘`´]/g, "'").replace(/[“”"]/g, " ").replace(/i̇/g, "i");
  s = s.replace(/[.!?,;:()]/g, " ").replace(/\s*-\s*/g, "-");
  const R = [[/\bi'm\b/g, "i am"], [/\b(you|we|they)'re\b/g, "$1 are"], [/\b(he|she|it|that|what|where|who|this|there)'s got\b/g, "$1 has got"],
    [/\b(i|you|we|they)'ve got\b/g, "$1 have got"], [/\b(he|she|it|that|what|where|who|this|there)'s\b/g, "$1 is"], [/\bisn'?t\b/g, "is not"],
    [/\baren'?t\b/g, "are not"], [/\bdon'?t\b/g, "do not"], [/\bdoesn'?t\b/g, "does not"], [/\bhaven'?t\b/g, "have not"], [/\bhasn'?t\b/g, "has not"],
    [/\bmustn'?t\b/g, "must not"], [/\bcan'?t\b|\bcannot\b/g, "can not"], [/\bturkey\b|\bturkiye\b/g, "türkiye"], [/\bi am not\b/g, "i am not"],
    [/\bp\.?e\.?\b/g, "pe"], [/\bi\.?t\.?\b(?= )/g, "it"]];
  for (const [a, b] of R) s = s.replace(a, b);
  return s.replace(/\s+/g, " ").trim();
}
const icEsit = (a, b) => icNorm(a) === icNorm(b);
function icLev(a, b) {
  const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
/* Genel teşhis: yazım hatası, sıra, eksik kelime, ya da doğrusu */
function icGenelTeshis(beklenen, y) {
  const b = icNorm(beklenen).split(" "), w = icNorm(y).split(" ");
  const dogru = `<b>${icE(beklenen)}</b>`;
  if (b.length === w.length) {
    const fark = b.map((x, i) => [x, w[i]]).filter(([x, z]) => x !== z);
    if (fark.length === 1) {
      const [x, z] = fark[0], i = b.indexOf(x), sonra = b[i + 1] || "";
      const ikili = (p, q) => (x === p && z === q) || (x === q && z === p);
      if (ikili("a", "an")) return { tur: "aan", m: `<b>${icE(sonra)}</b> ${x === "an" ? "ünlü sesle başlıyor → <b>an</b>" : "ünsüz sesle başlıyor → <b>a</b>"}. Doğrusu: ${dogru}` };
      if (["am", "is", "are"].includes(x) && ["am", "is", "are"].includes(z)) return { tur: "be", m: `Burada <b>${x}</b> gelir (I → am · tek kişi/şey → is · birden çok → are). Doğrusu: ${dogru}` };
      if (ikili("his", "her")) return { tur: "his", m: `<b>his</b> = onun (erkek) · <b>her</b> = onun (kız). Doğrusu: ${dogru}` };
      if (ikili("has", "have")) return { tur: "has", m: `he / she / it → <b>has</b> · I / you / we / they → <b>have</b>. Doğrusu: ${dogru}` };
      if (ikili("do", "does")) return { tur: "do", m: `he / she / it → <b>does</b> · I / you / we / they → <b>do</b>. Doğrusu: ${dogru}` };
      if (["this", "that", "these", "those"].includes(x) && ["this", "that", "these", "those"].includes(z)) return { tur: "bu", m: `Yakın tek → this · uzak tek → that · yakın çok → these · uzak çok → those. Doğrusu: ${dogru}` };
    }
    if (fark.length && fark.length <= 2 && fark.every(([x, z]) => icLev(x, z) <= 2 && x.length > 2))
      return { tur: "yazim", m: `Neredeyse! Yazım: ${fark.map(([x, z]) => `<s>${icE(z)}</s> → <b>${icE(x)}</b>`).join(", ")}` };
    if (b.slice().sort().join(" ") === w.slice().sort().join(" ")) return { tur: "sira", m: `Kelimeler doğru ama sırası yanlış. Doğrusu: ${dogru}` };
  }
  const eksik = b.filter(x => !w.includes(x)), fazla = w.filter(x => !b.includes(x));
  if (eksik.length && eksik.length <= 2 && !fazla.length) return { tur: "eksik", m: `Eksik kelime: <b>${icE(eksik.join(", "))}</b>. Doğrusu: ${dogru}` };
  if (/^(yes|no)\b/.test(icNorm(y)) && !/^(yes|no)\b/.test(icNorm(beklenen))) return { tur: "bicim", m: `Burada Yes/No değil, tam cümle isteniyor: ${dogru}` };
  if (w.length <= 2 && b.length > 3) return { tur: "kisa", m: `Cümlenin tamamını yaz: ${dogru}` };
  return { tur: "diger", m: `Doğrusu: ${dogru}` };
}
function icBicimUyarisi(y, beklenen) {
  const n = String(y).trim(), u = [];
  if (n && n[0] !== n[0].toLocaleUpperCase("en")) u.push("cümleye büyük harfle başla");
  const soru = /\?\s*$/.test(beklenen || "");
  if (n && !/[.!?]$/.test(n)) u.push(soru ? "sonuna soru işareti koy" : "sonuna nokta koy");
  else if (soru && !/\?$/.test(n)) u.push("soru cümlesinin sonuna ? koy");
  return u;
}
function icDenetle(p, y, konu) {
  if (!String(y).trim()) return { tur: "bos" };
  let r = null;
  if (p.d) r = p.d(y);
  else if (p.b.some(x => icEsit(x, y))) r = { tur: "dogru" };
  else if (p.b.every(x => /^(yes|no)\b/i.test(x)) && !/^\s*(yes|no)\b/i.test(y)) r = { tur: "kisa", m: `Bu soruya <b>kısa cevap</b> verilir (Yes, … / No, …): <b>${icE(p.b[0])}</b>` };
  else r = (konu.teshis && konu.teshis(p, y)) || icGenelTeshis(p.b[0], y);
  if (r.tur === "dogru" && !p.tek) r.uyari = icBicimUyarisi(y, p.cevap || (p.b && p.b[0]));
  if (r.tur === "dogru" && icP().ekUyari) { const u = icP().ekUyari(y, p.cevap || (p.b && p.b[0]) || ""); if (u.length) r.uyari = (r.uyari || []).concat(u); }
  return r;
}
/* be / have / do teşhisleri (konular arasında ortak) */
function icBeTeshis(p, y) {
  const k = p.k; if (!k) return null;
  if (p.tek && /^(am|is|are)$/.test(icGenisle(y)) && /^(am|is|are)$/.test(icGenisle(p.b[0]))) return { tur: "be", m: `<b>${icE(k.ad)}</b> → <b>${p.b[0]}</b>. (I → am · tek kişi/şey → is · birden çok → are)` };
  const w = " " + icGenisle(y) + " ", b = " " + icGenisle(p.b[0]) + " ";
  const be = s => (s.match(/ (am|is|are) /) || [])[1];
  if (be(b) && be(w) && be(b) !== be(w)) return { tur: "be", m: `Özne <b>${icE(k.ad)}</b> → <b>${be(b)}</b>. (I → am · he/she/it → is · we/you/they → are)` };
  if (/ am not /.test(b) && / amn/.test(" " + String(y).toLowerCase())) return { tur: "be", m: "<b>amn't</b> diye bir kısaltma yok: <b>I'm not</b>." };
  if (/^(yes|no) /.test(b.trim()) && / (i|he|she|it|we|you|they) (am|is|are)$/.test(b.trim()) && /'(m|s|re)\s*\.?$/.test(String(y).trim()))
    return { tur: "kisa", m: "Olumlu kısa cevapta kısaltma yapılmaz: <b>Yes, I am.</b> / <b>Yes, she is.</b>" };
  if (/ do | does | don| doesn/.test(w) && !/ do | does /.test(b)) return { tur: "do", m: "Bu cümlede fiil yok, <b>am / is / are</b> kullanılır." };
  return null;
}
function icHaveTeshis(p, y) {
  const k = p.k; if (!k) return null;
  const w = " " + icGenisle(y) + " ", b = " " + icGenisle(p.b[0]) + " ";
  if (/ has /.test(b) && / have /.test(w) && !/ has /.test(w)) return { tur: "fiil", m: `<b>${icE(k.ad)}</b> = ${k.z} → <b>has</b> (he / she / it ile has).` };
  if (/ have /.test(b) && / has /.test(w)) return { tur: "fiil", m: `<b>${icE(k.ad)}</b> → <b>have</b> (I / you / we / they ile have).` };
  if (/ do | does /.test(w)) return { tur: "do", m: "have got'ta do/does kullanılmaz: olumsuzu <b>hasn't / haven't got</b>, sorusu <b>Has / Have … got?</b>" };
  if (/^(yes|no) .* got$/.test(w.trim())) return { tur: "kisa", m: "Kısa cevapta <b>got</b> yazılmaz: <b>Yes, she has.</b> / <b>No, I haven't.</b>" };
  if (/ got /.test(b) && !/ got /.test(w) && !/^(yes|no)/.test(b.trim())) return { tur: "got", m: `<b>got</b>'u unuttun: <b>${icE(p.b[0])}</b>` };
  return null;
}
function icDoTeshis(p, y) {
  const w = " " + icGenisle(y) + " ", b = " " + icGenisle(p.b[0]) + " ";
  const ucuncu = /^(he|she|it|[A-Z])/.test(p.k ? p.k.z || "" : "") || (p.k && /^(he|she|it)$/.test(p.k.z));
  if (/ does not \w+s /.test(w) && !/ does not \w+s /.test(b)) return { tur: "s", m: "<b>doesn't</b> varsa fiil <b>-s almaz</b>: doesn't <b>play</b> (doesn't plays ✘)." };
  if (/^does \w+ \w+s /.test(w.trim() + " ") && !/^does \w+ \w+s /.test(b.trim() + " ")) return { tur: "s", m: "<b>Does</b> ile sorulan soruda fiil -s almaz: Does she <b>play</b>…?" };
  if (/ does not /.test(b) && / do not /.test(w)) return { tur: "do", m: `${p.k ? `<b>${icE(p.k.ad)}</b> = ${p.k.z}` : "he / she / it"} → <b>doesn't</b>.` };
  if (/ do not /.test(b) && / does not /.test(w)) return { tur: "do", m: "I / you / we / they → <b>don't</b>." };
  if (/^does /.test(b.trim()) && /^do /.test(w.trim())) return { tur: "do", m: `${p.k ? `<b>${icE(p.k.ad)}</b> = ${p.k.z}` : "he / she / it"} → <b>Does</b> …?` };
  if (/^do /.test(b.trim()) && /^does /.test(w.trim())) return { tur: "do", m: "I / you / we / they → <b>Do</b> …?" };
  if (/ (is|are|am) not /.test(w) && / do(es)? not /.test(b)) return { tur: "be", m: "Fiil cümlesinde <b>isn't / aren't</b> değil <b>don't / doesn't</b> kullanılır." };
  if (/^(is|are|am) /.test(w.trim()) && /^(do|does) /.test(b.trim())) return { tur: "be", m: "Cümlede fiil var, soru <b>Do / Does</b> ile kurulur." };
  if (/ does not | do not /.test(b) && !/ not /.test(w)) return { tur: "olumsuz", m: `Olumsuz yapmayı unuttun: <b>${icE(p.b[0])}</b>` };
  return null;
}

/* ================= Yönergeler: soru İngilizce, önce ne istendiği anlaşılır ================= */
const IC_SOZ = { read: "oku", the: "(belirli)", text: "metin", and: "ve", complete: "tamamla", sentences: "cümleler", sentence: "cümle", with: "ile", or: "ya da",
  write: "yaz", answer: "cevapla", answers: "cevaplar", questions: "sorular", question: "soru", make: "yap", negative: "olumsuz", look: "bak", at: "-e", "look at": "bak",
  pictures: "resimler", picture: "resim", table: "tablo", names: "adlar", name: "ad", of: "-in", under: "altına", school: "okul", clubs: "kulüpler", club: "kulüp",
  places: "yerler", reorder: "yeniden sırala", words: "kelimeler", correct: "düzelt", mistakes: "hatalar", rewrite: "yeniden yaz", use: "kullan", short: "kısa",
  "short answers": "kısa cevaplar", about: "hakkında", you: "sen", yourself: "kendin", ordinal: "sıra", numbers: "sayılar", plural: "çoğul", for: "için",
  timetable: "ders programı", "according to": "-e göre", below: "aşağıdaki", who: "kim", is: "-dir", talking: "konuşuyor", information: "bilgi",
  rules: "kurallar", signs: "işaretler", must: "-meli", "mustn't": "-memeli", this: "bu", that: "şu", these: "bunlar", those: "şunlar", cards: "kartlar",
  card: "kart", each: "her bir", person: "kişi", fill: "doldur", "fill in": "doldur", blanks: "boşluklar", true: "doğru", false: "yanlış", race: "yarış",
  results: "sonuçlar", two: "iki", one: "bir", classroom: "sınıf", topic: "konu", what: "ne", "has got": "var (o)", "hasn't got": "yok (o)", "my": "benim",
  am: "-im", are: "-sin/-iz", a: "bir", an: "bir", "an": "bir", in: "içinde", them: "onları", text: "metin" };
const IC_YON = {
  be_metin: ["Read and [complete] the text with am, is or are.", "Metni am, is ya da are ile tamamla."],
  be_olumsuz: ["Make the sentences [negative].", "Cümleleri olumsuz yap."],
  be_kisa: ["Read the text and write [short answers].", "Metni oku, sorulara kısa cevap ver (Yes, … / No, …)."],
  soru_yap: ["[Make] [questions].", "Verilen kelimelerle soru cümlesi kur."],
  sirala: ["[Reorder] the words and write the sentence.", "Kelimeleri doğru sıraya koy, cümleyi yaz."],
  iyelik: ["[Complete] the sentences with my, your, his, her, its, our or their.", "Boşluklara my, your, his, her, its, our ya da their yaz."],
  ozne: ["[Rewrite] the sentences. Use he, she, it, we or they.", "Cümleleri yeniden yaz; adın yerine he, she, it, we ya da they kullan."],
  bilgi: ["Look at the [information] and write sentences.", "Bilgilere bak ve cümleler yaz."],
  tablo_yaz: ["[Look at] the [table] and [write] sentences.", "Tabloya bak ve cümleler yaz."],
  ulke_tablo: ["[Complete] the [table].", "Tabloyu tamamla."],
  kart: ["Look at the [cards] and [answer] the questions.", "Kartlara bak ve soruları cevapla."],
  hata: ["[Correct] the [mistakes].", "Cümlelerdeki hataları düzelt, doğrusunu yaz."],
  sen: ["[Answer] the questions [about] you.", "Soruları kendine göre cevapla."],
  kim: ["Read the sentences below and write the correct [names] in the blanks.", "Cümleleri oku, boşluklara doğru kişinin adını yaz."],
  konu: ["Read the sentences. What is each person [talking] [about]?", "Cümleleri oku: her kişi hangi konudan bahsediyor, onu yaz."],
  aan_yaz: ["Write [a] or [an].", "Boşluğa a ya da an yaz."],
  resim_yaz: ["[Look] and write.", "Resme bak ve cümleyi yaz."],
  kulup_resim: ["Look at the [pictures] and write the names of the school [clubs].", "Resimlere bak, okul kulüplerinin adlarını yaz."],
  yer_resim: ["Write the names of the [places] under the pictures.", "Resimlerdeki okul yerlerinin adlarını yaz."],
  kulup_kim: ["Read the sentences and write the [club] for each person.", "Cümleleri oku, her kişinin kulübünü yaz."],
  hg_metin: ["Read the text and [complete] the sentences with [has got] or [hasn't got].", "Metni oku, cümleleri has got ya da hasn't got ile tamamla."],
  oku_cevapla: ["Read the text and [answer] the questions.", "Metni oku ve soruları cevapla."],
  must_metin: ["Read the text and complete the sentences with [must] or [mustn't].", "Metni oku, cümleleri must ya da mustn't ile tamamla."],
  must_isaret: ["Look at the [signs] and write [rules] with must or mustn't.", "İşaretlere bak, must ya da mustn't ile kural yaz."],
  must_kendi: ["Write two [classroom] rules: one with must, one with mustn't.", "Biri must, biri mustn't olan iki sınıf kuralı yaz."],
  this_bosluk: ["Look and complete with [this], [that], [these] or [those].", "Resme bak, boşluğa this, that, these ya da those yaz."],
  cogul: ["Make the sentences [plural].", "Cümleleri çoğul yap."],
  program: ["[Complete] the [timetable] according to the text below.", "Metne göre ders programındaki boşlukları doldur."],
  sira_yaz: ["Write the [ordinal] [numbers].", "Sıra sayılarını yazıyla yaz (first, second…)."],
  yaris: ["Look at the [race] results and answer the questions.", "Yarış sonuçlarına bak ve soruları cevapla."],
  sp_olumsuz: ["Make the sentences [negative].", "Cümleleri olumsuz yap."],
  sp_dogrula: ["Read the text. [Correct] the [false] sentences.", "Metni oku; yanlış cümleleri düzeltip doğrusunu yaz."],
  cevaptan_soru: ["Write the [questions] for the answers.", "Cevaplara uygun soruları yaz."],
  profil: ["Read the text and [complete] the [table].", "Metni oku ve tabloyu doldur."],
};
const IC_SASIRTMA = ["Cümleyi Türkçeye çevir.", "Doğru resmi seç.", "Soruya uzun bir cevap yaz.", "Cümleleri olumlu yap.", "Kelimeleri sözlükte bul."];
function icKelimeHtml(en) {
  const SOZ = icP().soz;
  return en.replace(/\[([^\]]+)\]|(look at|according to|short answers|fill in|has got|hasn't got|auf Deutsch|[A-Za-zÄÖÜäöüß'-]+)/gi, (m, koseli, w) => {
    const s = koseli || w, k = s.toLowerCase(), tr = SOZ[k] || SOZ[k.split(" ")[0]] || "";
    return `<span class="ic-kel${koseli ? " ic-anahtar" : ""}" data-tr="${icE(tr)}" data-k="${icE(k)}">${icE(s)}</span>`;
  });
}
function icAnlasilan() { try { return JSON.parse(localStorage.getItem("ic-anla") || "{}"); } catch (_) { return {}; } }
function icAnlasilanYaz(o) { try { localStorage.setItem("ic-anla", JSON.stringify(o)); } catch (_) { /* önemsiz */ } }
/* Yönerge kapısı: doğru anlamı seçmeden cevap kutuları açılmaz. İki kez üst üste ilk seferde anlarsa seyrekleşir. */
function icYonergeKur(yon, kap, acildi) {
  const YON = icP().yon, [en, tr] = YON[yon];
  kap.querySelector(".ic-yonerge").innerHTML = icKelimeHtml(en) + `<span class="ic-anlam">👆 Bilmediğin kelimeye dokun</span>`;
  const anlam = kap.querySelector(".ic-anlam");
  kap.querySelectorAll(".ic-kel").forEach(k => k.onclick = () => { anlam.textContent = k.textContent + (k.dataset.tr ? " = " + k.dataset.tr : " (adı / sözcük)"); });
  const an = icAnlasilan(), kutu = kap.querySelector(".ic-anla");
  if ((an[yon] || 0) >= 2 && Math.random() < .7) { kutu.innerHTML = `<span class="ic-ipucu">✓ Bu yönergeyi biliyorsun: <i>${icE(tr)}</i></span>`; return acildi(); }
  const diger = Object.entries(YON).filter(([k, v]) => k !== yon && v[1] !== tr).map(([, v]) => v[1]).concat(IC_SASIRTMA);
  const sec = [tr]; while (sec.length < 3) { const d = icR(diger); if (!sec.includes(d)) sec.push(d); }
  let ilk = true;
  kutu.innerHTML = `<b>🤔 Önce anla: bu soru senden ne istiyor?</b><div class="ic-secenekler">${icKaristir(sec).map(x => `<button class="ic-secenek">${icE(x)}</button>`).join("")}</div><div class="ic-ipucu ic-anla-geri"></div>`;
  kutu.querySelectorAll(".ic-secenek").forEach(b => b.onclick = () => {
    if (b.textContent === tr) {
      b.classList.add("dogru"); sesCal("tik");
      const a = icAnlasilan(); a[yon] = ilk ? (a[yon] || 0) + 1 : 0; icAnlasilanYaz(a);
      kutu.querySelectorAll(".ic-secenek").forEach(x => x.disabled = true);
      kutu.querySelector(".ic-anla-geri").textContent = "Doğru. Şimdi cevabını yaz ✍️";
      acildi();
    } else {
      ilk = false; b.classList.add("yanlis"); b.disabled = true;
      const anah = [...kap.querySelectorAll(".ic-kel.ic-anahtar")];
      anah.forEach(x => x.classList.add("ic-vurgu"));
      const ilkA = anah[0];
      kutu.querySelector(".ic-anla-geri").innerHTML = ilkA ? `Sarı kelimelere bak: ${anah.map(x => `<b>${icE(x.textContent)}</b> = ${icE(x.dataset.tr || "?")}`).join(" · ")}. Bir daha seç.` : "Yönergeyi bir daha oku.";
    }
  });
}

/* ================= Konular ================= */
const icMetinKutu = h => `<div class="ic-metin">${h}</div>`;
const icRenk = (s, c) => `<span class="ic-${c}">${s}</span>`;
/* parça: {s: soru html, b: [kabul edilen cevaplar], cevap?, d?: özel denetim, k?: özne bilgisi, tek?: tek kelime (biçim uyarısı yok), ipucu} */

const IC_KONULAR = [];
function icKonu(o, liste) { (liste || IC_KONULAR).push(o); return o; }

/* ---------- 1. to be ---------- */
const IC_BE_TAMLAYICI = ["from Spain", "in the art club", "happy", "at home", "eleven years old", "in the library",
  "from Japan", "in the garden", "tired", "in 5C", "at school", "from Germany", "hungry", "in the chess club", "from Brazil", "in the canteen"];
const IC_BE_TEKIL = ["a doctor", "a student", "my best friend", "my cousin", "a good singer"], IC_BE_COGUL = ["teachers", "students", "good friends", "my cousins"];
function icTamla(o) {   // özneye uyan tamlayıcı (He is teachers ✘)
  const z = (o.z || "").toLowerCase();
  const ek = ["he", "she", "i"].includes(z) ? IC_BE_TEKIL : ["we", "they"].includes(z) ? IC_BE_COGUL : [];
  return icR(IC_BE_TAMLAYICI.concat(ek, ek));
}
function icOzne() {
  const t = icR(["ad", "ad", "I", "you", "we", "they", "ikili", "he", "she"]);
  if (t === "ad") { const k = icKisi(); return { ad: k.ad, z: k.z, be: "is", tekil: 1 }; }
  if (t === "ikili") { const [a, b] = icIkiKisi(); return { ad: a.ad + " and " + b.ad, z: "they", be: "are", tekil: 0 }; }
  return { ad: icB(t === "I" ? "I" : t), z: t.toLowerCase(), be: t === "I" ? "am" : ["he", "she", "it"].includes(t) ? "is" : "are", tekil: ["he", "she", "it"].includes(t) ? 1 : 0 };
}
const icBeOlumsuz = be => be === "am" ? "am not" : be === "is" ? "isn't" : "aren't";
const icOzneKucuk = o => o.ad === "I" ? "I" : /^(You|We|They|He|She|It)$/.test(o.ad) ? o.ad.toLowerCase() : o.ad;
icKonu({
  kod: "be", ad: "to be: am / is / are", simge: "🧍", kaynak: "Defter",
  kural: `<b>I</b> → <b>am</b> · <b>he / she / it</b> (tek kişi ya da şey) → <b>is</b> · <b>we / you / they</b> (birden çok) → <b>are</b><br>
    Olumsuz: I'm <b>not</b> · he <b>isn't</b> · they <b>aren't</b><br>Soru: <b>Is</b> she…? <b>Are</b> you…? · Kısa cevap: Yes, she <b>is</b>. / No, she <b>isn't</b>.`,
  kesfet() {
    const o = [icOzne(), { ad: "I", z: "i", be: "am" }, icOzne(), icOzne()].filter((x, i, a) => a.findIndex(y => y.ad === x.ad) === i).slice(0, 4);
    return {
      anahtar: "be-k-" + o.map(x => x.ad).join(),
      ornekler: o.map(x => `${icRenk(x.ad, "oz")} ${icRenk(x.be, x.be === "is" ? "ek" : "fi")} ${icTamla(x)}.`),
      soru: "Tek bir kişi ya da şeyden sonra (Elif, my dad, the cat, he, she, it) hangisi geliyor?",
      secenekler: ["is", "am", "are"], dogru: "is",
      ipucu: "Kırmızı kelimelere bak: hangi öznelerden sonra geliyorlar?",
    };
  },
  turler: {
    metin() {
      const ben = icKisi(), arkadas = icKisi(), u = icR(IC_ULKE), ogr = icR(IC_SIFAT);
      const cumleler = [
        [`Hi! My name `, "is", ` ${ben.ad}.`], [`I `, "am", ` eleven years old.`], [`My best friend `, "is", ` ${arkadas.ad}.`],
        [`We `, "are", ` in the same class.`], [`Our English teacher `, "is", ` very ${ogr}.`], [`My parents `, "are", ` ${icR(["teachers", "doctors", "at work now"])}.`],
        [`${arkadas.Z} `, "is", ` from ${u[0]}.`], [`I `, "am", ` in the ${icR(IC_KULUP)[0]} club.`], [`My cats `, "are", ` very funny.`], [`It `, "is", ` a sunny day today.`]];
      const sec = [cumleler[0], ...icSec(cumleler.slice(1), 4)];
      let i = 0;
      const metin = sec.map(c => `${c[0]}<b>(${++i}) ____</b>${c[2]}`).join(" ");
      return { yon: "be_metin", anahtar: "be-m-" + sec.map(c => c.join("")).join(), govde: icMetinKutu(metin),
        parcalar: sec.map((c, j) => { const ozne = c[0].replace(/^Hi! /, "").trim(); return { s: `(${j + 1}) ${icE(ozne)} ____`, b: [c[1]], tek: 1, k: { ad: ozne }, ipucu: `${ozne} → ${c[1] === "am" ? "I → am" : c[1] === "is" ? "tek kişi/şey → is" : "birden çok → are"}` }; }) };
    },
    olumsuz() {
      const ps = [0, 1].map(() => { const o = icOzne(); const t = icTamla(o); return { o, t }; });
      return { yon: "be_olumsuz", anahtar: "be-o-" + ps.map(p => p.o.ad + p.t).join(), govde: "",
        parcalar: ps.map(({ o, t }) => ({ s: `${o.ad} ${o.be} ${t}.`, b: [`${o.ad} ${icBeOlumsuz(o.be)} ${t}.`], k: o, ipucu: `${o.be} → ${icBeOlumsuz(o.be)}` })) };
    },
    kisa() {
      const k = icKisi(), [u, u2] = icSec(IC_ULKE, 2), yas = icR([10, 11, 12, 13]), [kl, kl2] = icSec(IC_KULUP, 2);
      const metin = `This is ${k.ad}. ${k.Z} is ${IC_SAYI[yas]} years old. ${k.Z} is from ${u[0]}. ${k.Z} isn't in the ${kl2[0]} club. ${k.Z} is in the ${kl[0]} club.`;
      const s = icSec([
        [`Is ${k.ad} ${IC_SAYI[yas]} years old?`, `Yes, ${k.z} is.`], [`Is ${k.ad} ${IC_SAYI[yas === 12 ? 11 : 12]} years old?`, `No, ${k.z} isn't.`],
        [`Is ${k.ad} from ${u2[0]}?`, `No, ${k.z} isn't.`], [`Is ${k.ad} from ${u[0]}?`, `Yes, ${k.z} is.`],
        [`Is ${k.ad} in the ${kl2[0]} club?`, `No, ${k.z} isn't.`], [`Is ${k.ad} in the ${kl[0]} club?`, `Yes, ${k.z} is.`]], 3);
      return { yon: "be_kisa", anahtar: "be-k-" + metin + s.map(x => x[0]).join(), govde: icMetinKutu(metin),
        parcalar: s.map(([q, a]) => ({ s: q, b: [a, a.replace("isn't", "is not")], k: { ad: k.ad, z: k.z }, ipucu: `Yes, ${k.z} is. / No, ${k.z} isn't.` })) };
    },
    soru() {
      const ps = [0, 1].map(() => { const o = icOzne(); const t = icTamla(o); return { o, t }; });
      return { yon: "soru_yap", anahtar: "be-s-" + ps.map(p => p.o.ad + p.t).join(), govde: "",
        parcalar: ps.map(({ o, t }) => { const q = `${icB(o.be)} ${o.ad === "I" ? "I" : icOzneKucuk(o)} ${t}?`;
          return { s: `${icOzneKucuk(o)} / ${t} ?`, b: [q], k: o, ipucu: `${icB(o.be)} + ${icOzneKucuk(o)} + …?` }; }) };
    },
    sirala() {
      const o = icOzne(), t = icTamla(o), tip = icR(["olumlu", "olumsuz", "soru"]);
      const be = tip === "olumsuz" ? icBeOlumsuz(o.be) : o.be;
      const cumle = tip === "soru" ? `${icB(o.be)} ${icOzneKucuk(o)} ${t}?` : `${o.ad} ${be} ${t}.`;
      const kelime = tip === "soru" ? [icB(o.be), icOzneKucuk(o), ...t.split(" ")] : [o.ad, be, ...t.split(" ")];
      return { yon: "sirala", anahtar: "be-r-" + cumle, govde: `<div class="ic-kelimeler">${icKaristir(kelime).map(x => `<span>${icE(x)}</span>`).join("")}</div>`,
        parcalar: [{ s: "", b: [cumle], k: o, ipucu: tip === "soru" ? "Soru am/is/are ile başlar." : "Özne + am/is/are + …" }] };
    },
  },
  adim: { 2: ["metin", "olumsuz", "kisa"], 3: ["metin", "olumsuz", "kisa", "soru", "sirala"] },
  teshis: icBeTeshis,
});

/* ---------- 2. Subject pronouns & possessive adjectives ---------- */
const IC_IYELIK = { I: "my", you: "your", he: "his", she: "her", it: "its", we: "our", they: "their" };
icKonu({
  kod: "zamir", ad: "Subject pronouns & possessives (I – my)", simge: "🙋", kaynak: "Defter",
  kural: `<b>I → my</b> · <b>you → your</b> · <b>he → his</b> · <b>she → her</b> · <b>it → its</b> · <b>we → our</b> · <b>they → their</b><br>
    Özne zamiri cümlenin başında işi yapanın yerine geçer (<b>She</b> is my sister). İyelik sıfatı ismin önüne gelir (<b>her</b> bag).<br>
    Erkek → <b>his</b>, kız → <b>her</b>, hayvan / eşya → <b>its</b>. Dikkat: <b>its</b> (onun) ≠ <b>it's</b> (it is).`,
  kesfet() {
    const [a, b] = icIkiKisi();
    const satir = [[a.ad, a.z, a.iy, icR(["bag", "bike", "pencil case", "jacket"])], [b.ad, b.z, b.iy, icR(["hair", "cat", "school", "book"])], ["The dog", "it", "its", "tail"], ["My friends", "they", "their", "school"]];
    return {
      anahtar: "z-k-" + a.ad + b.ad,
      ornekler: satir.map(([ad, z, iy, n]) => `${ad} → ${icRenk(icB(z), "oz")} … · ${icRenk(icB(iy), "ek")} ${n} is ${icR(["big", "new", "nice", "blue"])}.`),
      soru: `${a.kiz ? b.ad : a.ad} bir erkek. "Onun çantası" derken hangisini kullanırız?`, secenekler: ["his bag", "her bag", "its bag"], dogru: "his bag",
      ipucu: "Örneklerde erkek isimlerinin karşısındaki kırmızı kelimeye bak.",
    };
  },
  turler: {
    iyelik() {
      const sablon = [
        () => { const k = icKisi(); return [`This is ${k.ad}. ____ ${icR(["bag", "bike", "jacket", "pencil case"])} is ${icR(["red", "blue", "new", "big"])}.`, k.Iy, k.ad, k.z]; },
        () => { const k = icKisi(); return [`${k.ad} is my cousin. ____ ${icR(["hair", "eyes"])} ${"is"} ${icR(["long", "short", "dark"])}.`.replace(/eyes is/, "eyes are"), k.Iy, k.ad, k.z]; },
        () => [`The cat is in ____ ${icR(["bed", "basket", "box"])}.`, "its", "the cat", "it"],
        () => [`We love ____ ${icR(["school", "teacher", "classroom"])}.`, "our", "we", "we"],
        () => [`My parents have got a car. ____ car is ${icR(["red", "white", "old"])}.`, "Their", "my parents", "they"],
        () => { const k = icKisi(); return [`I'm ${k.ad}. ____ name is ${k.ad}.`, "My", "I", "I"]; },
        () => [`Hi ${icKisi().ad}! Is this ____ ${icR(["book", "ruler", "umbrella"])}?`, "your", "you", "you"],
        () => { const [a, b] = icIkiKisi(); return [`${a.ad} and ${b.ad} are twins. ____ ${icR(["mother", "father"])} is a ${icR(["teacher", "doctor", "farmer"])}.`, "Their", `${a.ad} and ${b.ad}`, "they"]; },
        () => [`The bird is in ____ nest.`, "its", "the bird", "it"],
        () => { const k = icKisi(); return [`My ${k.kiz ? "sister" : "brother"} has got a ${icR(["dog", "cat", "parrot"])}. ____ ${icR(["dog", "cat", "parrot"])} is very cute.`, k.Iy, `my ${k.kiz ? "sister" : "brother"}`, k.z]; }];
      const s = icSec(sablon, 3).map(f => f());
      return { yon: "iyelik", anahtar: "z-i-" + s.map(x => x[0]).join(), govde: "",
        parcalar: s.map(([c, d, kim, z]) => ({ s: c, b: [d], tek: 1, k: { ad: kim, z }, ipucu: `${kim} → ${z} → ${IC_IYELIK[z] || IC_IYELIK[z.toLowerCase()]}` })) };
    },
    ozne() {
      const sablon = [
        () => { const k = icKisi(); const t = icR(["is my friend", "is in the garden", "plays chess", "is from İzmir", "likes Art"]); return [`${k.ad} ${t}.`, `${k.Z} ${t}.`, k]; },
        () => { const [a, b] = icIkiKisi(); const t = icR(["are in the music club", "are at school", "play basketball"]); return [`${a.ad} and ${b.ad} ${t}.`, `They ${t}.`, { ad: `${a.ad} and ${b.ad}`, z: "they" }]; },
        () => { const t = icR(["play chess", "are in 5C", "like English"]); return [`My brother and I ${t}.`, `We ${t}.`, { ad: "My brother and I", z: "we" }]; },
        () => { const n = icR(["The book", "The ruler", "The bag"]); return [`${n} is on the desk.`, `It is on the desk.`, { ad: n, z: "it" }]; },
        () => { const r = icR(["My mum", "My dad"]); return [`${r} is a ${icR(["teacher", "doctor"])}.`, null, { ad: r, z: r === "My mum" ? "she" : "he" }]; }];
      const s = icSec(sablon, 2).map(f => { const [c, d, k] = f(); return [c, d || c.replace(k.ad, icB(k.z)), k]; });
      return { yon: "ozne", anahtar: "z-o-" + s.map(x => x[0]).join(), govde: "",
        parcalar: s.map(([c, d, k]) => ({ s: c, b: [d], k, ipucu: `${k.ad} → ${k.z}` })) };
    },
    bilgi() {
      const k = icKisi(), renk = icR(["blue", "red", "green", "yellow", "purple"]), ev = icR(["cat", "dog", "parrot", "rabbit"]), ders = icR(IC_DERS)[0];
      return { yon: "bilgi", anahtar: "z-b-" + k.ad + renk + ev + ders,
        govde: `<table class="ic-tablo"><tr><th>Name</th><td>${k.ad} ${k.kiz ? "👧" : "👦"}</td></tr><tr><th>Favourite colour</th><td>${renk}</td></tr><tr><th>Pet</th><td>${ev}</td></tr><tr><th>Favourite subject</th><td>${ders}</td></tr></table>`,
        parcalar: [
          { s: "Name", b: [`${k.Iy} name is ${k.ad}.`], k, ipucu: `${k.Iy} name is …` },
          { s: "Favourite colour", b: [`${k.Iy} favourite colour is ${renk}.`], k, ipucu: `${k.Iy} favourite colour is …` },
          { s: "Pet", b: [`${k.Iy} pet is a ${ev}.`, `${k.Z} has got a ${ev}.`], k, ipucu: `${k.Iy} pet is a … / ${k.Z} has got a …` },
          { s: "Favourite subject", b: [`${k.Iy} favourite subject is ${ders}.`, `${k.Iy} favourite school subject is ${ders}.`], k, ipucu: `${k.Iy} favourite subject is …` }] };
    },
  },
  adim: { 2: ["iyelik", "ozne"], 3: ["iyelik", "ozne", "bilgi"] },
  teshis(p, y) {
    const w = icGenisle(y), b = icGenisle(p.b[0]);
    if (p.k && /^(his|her)\b/.test(b) && /^(his|her)\b/.test(w) && b.split(" ")[0] !== w.split(" ")[0])
      return { tur: "his", m: `${icE(p.k.ad)} ${p.k.z === "she" ? "kız → <b>her</b>" : "erkek → <b>his</b>"}.` };
    if (/^(he|she) name/.test(w)) return { tur: "zamir", m: `"Onun adı" → <b>${p.k && p.k.z === "she" ? "Her" : "His"} name</b> (he/she name ✘).` };
    if (p.tek && IC_IYELIK[p.k && p.k.z] && w !== b) {
      if (w === "it's" || w === "it is") return { tur: "its", m: "Sahiplik için <b>its</b> (it's = it is)." };
      return { tur: "iyelik", m: `${icE(p.k.ad)} → <b>${p.k.z}</b> → <b>${IC_IYELIK[p.k.z]}</b>.` };
    }
    return null;
  },
});

/* ---------- 3. Tablodan cümle (kâğıt 7) ---------- */
function icTabloSatirlari(k, satirlar) {
  const yas = icR([10, 11, 12, 13]), u = icR(IC_ULKE), ders = icR(IC_DERS)[0], kl = icR(IC_KULUP)[0];
  const T = {
    name: ["Name", k.ad, [`${k.Iy} name is ${k.ad}.`], `${k.Iy} name is …`],
    age: ["Age", String(yas), [`${k.Z} is ${IC_SAYI[yas]} years old.`, `${k.Z} is ${yas} years old.`, `${k.Z} is ${IC_SAYI[yas]}.`, `${k.Z} is ${yas}.`], `${k.Z} is … years old.`],
    country: ["Country", u[0].replace(/^the /, "the "), [`${k.Z} is from ${u[0]}.`, ...(IC_ULKE_EK[u[0]] || []).map(x => `${k.Z} is from ${x}.`)], `${k.Z} is from …`],
    subject: ["Favourite School Subject", ders, [`${k.Iy} favourite school subject is ${ders}.`, `${k.Iy} favourite subject is ${ders}.`], `${k.Iy} favourite school subject is …`],
    club: ["Favourite School Club", icB(kl), [`${k.Iy} favourite school club is ${kl}.`, `${k.Iy} favourite club is ${kl}.`, `${k.Iy} favourite school club is the ${kl} club.`,
      `${k.Iy} favourite club is the ${kl} club.`, `${k.Z} is in the ${kl} club.`, `${k.Z} is a member of the ${kl} club.`], `${k.Iy} favourite school club is …`],
  };
  return satirlar.map(s => T[s]);
}
icKonu({
  kod: "tablo", ad: "Tablodan cümle yazma (Name, Age, Country…)", simge: "📋", kaynak: "Kâğıt 7. soru",
  kural: `Kız → <b>She</b> / <b>Her</b> · Erkek → <b>He</b> / <b>His</b><br>
    Name → <b>Her name is</b> Sarah. · Age → <b>She is</b> twelve <b>years old</b>. · Country → <b>She is from</b> England.<br>
    Favourite subject → <b>Her favourite school subject is</b> English. · Favourite club → <b>Her favourite school club is</b> music. / She is in the music club.`,
  kesfet() {
    const k = icKisi("k"), s = icTabloSatirlari(k, ["name", "age", "country"]);
    return {
      anahtar: "t-k-" + k.ad + s.map(x => x[1]).join(),
      ornekler: [`<table class="ic-tablo">${s.map(x => `<tr><th>${x[0]}</th><td>${icE(x[1])}</td></tr>`).join("")}</table>`,
        ...s.map(x => x[2][0].replace(/^(Her|She)/, m => icRenk(m, "oz")))],
      soru: `${k.ad} bir kız. Tablodaki "Name" satırı için hangi cümleyi yazarsın?`,
      secenekler: [`Her name is ${k.ad}.`, `His name is ${k.ad}.`, `She name is ${k.ad}.`], dogru: `Her name is ${k.ad}.`,
      ipucu: "Mavi kelimelere bak: kız için hangi kelimeler kullanılmış?",
    };
  },
  turler: {
    tablo3() { const k = icKisi(); const s = icTabloSatirlari(k, ["name", "country", "club"]); return icTabloSoru(k, s, "t3"); },
    tablo5() { const k = icKisi(); const s = icTabloSatirlari(k, ["name", "age", "country", "subject", "club"]); return icTabloSoru(k, s, "t5"); },
  },
  adim: { 2: ["tablo3"], 3: ["tablo5"] },
  teshis(p, y) {
    const w = icGenisle(y);
    if (p.k && (/^(his|her) /.test(w) || /^(he|she) /.test(w))) {
      const kiz = p.k.z === "she";
      if ((kiz && /^(his|he) /.test(w)) || (!kiz && /^(her|she) /.test(w))) return { tur: "his", m: `${icE(p.k.ad)} ${kiz ? "kız → <b>She / Her</b>" : "erkek → <b>He / His</b>"}.` };
    }
    if (/^(he|she) name/.test(w)) return { tur: "zamir", m: `"Onun adı" → <b>${p.k.Iy} name is…</b>` };
    if (/^(he|she) (is )?\d+$|^(he|she) (is )?[a-z]+ years$/.test(w)) return { tur: "eksik", m: `Yaşı şöyle yaz: <b>${icE(p.b[0])}</b>` };
    if (/^(he|she) (is )?(from )?/.test(w) && p.s === "Country" && !/ from /.test(" " + w + " ")) return { tur: "from", m: `Ülke için <b>from</b> gerekir: <b>${icE(p.b[0])}</b>` };
    return null;
  },
});
function icTabloSoru(k, s, tip) {
  return { yon: "tablo_yaz", anahtar: "t-" + tip + "-" + k.ad + s.map(x => x[1]).join(),
    govde: `<table class="ic-tablo">${s.map(x => `<tr><th>${x[0]}</th><td>${icE(x[1])}${x[0] === "Name" ? (k.kiz ? " 👧" : " 👦") : ""}</td></tr>`).join("")}</table>`,
    parcalar: s.map((x, i) => ({ s: `${i + 1}. (${x[0]})`, b: x[2], k, ipucu: x[3] })) };
}

/* ---------- 4. Countries and nationalities ---------- */
icKonu({
  kod: "ulke", ad: "Countries and nationalities", simge: "🌍", kaynak: "Defter",
  kural: `<b>from</b> + ülke: I'm from <b>Japan</b>. · <b>am/is/are</b> + milliyet: She is <b>Japanese</b>.<br>
    <b>-an/-ian:</b> American, Canadian, Australian, Brazilian, Mexican, Italian, Indian, Russian, Egyptian · <b>-ish:</b> English, Spanish, Swedish, Turkish ·
    <b>-ese:</b> Japanese, Chinese · <b>Farklı:</b> French, German, Greek, South Korean, Saudi<br>Ülke ve milliyet <b>büyük harfle</b> yazılır.`,
  kesfet() {
    const u = icSec(IC_ULKE, 3);
    return {
      anahtar: "u-k-" + u.map(x => x[0]).join(),
      ornekler: u.map(x => `${x[5]} is from ${icRenk(x[0], "oz")}. ${x[6] === "k" ? "She" : "He"} is ${icRenk(x[1], "ek")}. ${x[3]}`),
      soru: "\"from\" kelimesinden sonra ne geliyor?", secenekler: ["Ülkenin adı (Japan)", "Milliyet (Japanese)", "Şehrin adı (Tokyo)"], dogru: "Ülkenin adı (Japan)",
      ipucu: "Mavi kelimeler from'dan sonra, kırmızılar is'ten sonra.",
    };
  },
  turler: {
    tablo() {
      const u = icSec(IC_ULKE, 4);
      return { yon: "ulke_tablo", anahtar: "u-t-" + u.map(x => x[0]).join(),
        govde: `<table class="ic-tablo"><tr><th>Country</th><th>Nationality</th></tr>${u.map((x, i) => i % 2 ? `<tr><td>____ (${i + 1})</td><td>${x[1]}</td></tr>` : `<tr><td>${x[3]} ${x[0]}</td><td>____ (${i + 1})</td></tr>`).join("")}</table>`,
        parcalar: u.map((x, i) => ({ s: `(${i + 1}) ${i % 2 ? x[1] + " → Country?" : x[0] + " → Nationality?"}`, b: i % 2 ? [x[0], ...(IC_ULKE_EK[x[0]] || [])] : [x[1]], tek: 1, ipucu: i % 2 ? `${x[2]}` : `${x[0]} → -an / -ish / -ese …?` })) };
    },
    kart() {
      const x = icR(IC_ULKE).slice();
      if (Math.random() < .6) { const k = icKisi(); x[5] = k.ad; x[6] = k.kiz ? "k" : "e"; }
      const Z = x[6] === "k" ? "She" : "He", iy = x[6] === "k" ? "her" : "his";
      return { yon: "kart", anahtar: "u-c-" + x[0] + x[5],
        govde: `<div class="ic-kart-kisi"><span>${x[3]}</span><b>${x[5]}</b><small>${x[4]}</small></div>`,
        parcalar: [
          { s: `Where is ${x[5]} from?`, b: [`${Z} is from ${x[0]}.`, ...(IC_ULKE_EK[x[0]] || []).map(e => `${Z} is from ${e}.`)], k: { ad: x[5], z: Z.toLowerCase() }, ipucu: `${Z} is from …` },
          { s: `What is ${iy} nationality?`, b: [`${Z} is ${x[1]}.`], k: { ad: x[5], z: Z.toLowerCase() }, ipucu: `${Z} is …` },
          { s: `Where does ${Z.toLowerCase()} live?`, b: [`${Z} lives in ${x[4]}.`], k: { ad: x[5], z: Z.toLowerCase() }, ipucu: `${Z} lives in …` }] };
    },
    hata() {
      const s = icSec([
        () => { const x = icR(IC_ULKE.filter(u => u[0] !== u[1])); const k = icKisi(); return [`${k.Z} is from ${x[1]}.`, [`${k.Z} is from ${x[0]}.`, `${k.Z} is ${x[1]}.`]]; },
        () => { const x = icR(IC_ULKE.filter(u => u[0] !== u[1])); const k = icKisi(); return [`${k.Z} is ${x[0]}.`, [`${k.Z} is ${x[1]}.`, `${k.Z} is from ${x[0]}.`]]; },
        () => { const x = icR(IC_ULKE.filter(u => u[0] !== u[1])); return [`I'm from ${x[0].toLowerCase()}.`, [`I'm from ${x[0]}.`]]; },
        () => { const x = icR(IC_ULKE); const k = icKisi(); return [`${k.Z} from ${x[0]}.`, [`${k.Z} is from ${x[0]}.`]]; }], 2).map(f => f());
      return { yon: "hata", anahtar: "u-h-" + s.map(x => x[0]).join(), govde: "",
        parcalar: s.map(([c, b]) => ({ s: c, b, d: y => {
          if (b.some(x => icEsit(x, y))) {
            const u = IC_ULKE.find(x => icGenisle(y).includes(icGenisle(x[0])));
            if (u && !y.includes(u[0].replace(/^the /, ""))) return { tur: "buyuk", m: "Ülke adını <b>büyük harfle</b> yaz." };
            return { tur: "dogru" };
          }
          if (icEsit(y, c)) return { tur: "ayni", m: "Cümleyi aynen yazdın; hatayı bulup düzelt." };
          return icGenelTeshis(b[0], y);
        }, cevap: b[0], ipucu: "from + ülke · is + milliyet" })) };
    },
    sen() {
      return { yon: "sen", anahtar: "u-s-" + Math.random(), govde: "",
        parcalar: [
          { s: "Where are you from?", cevap: "I'm from Türkiye.", d: y => /^i am from türkiye$/.test(icGenisle(y)) ? { tur: "dogru" } : /türkiye/.test(icGenisle(y)) && !/from/.test(icGenisle(y)) ? { tur: "from", m: "Ülke için <b>from</b>: <b>I'm from Türkiye.</b>" } : /turkish/.test(icGenisle(y)) ? { tur: "ulke", m: "Burada ülke soruluyor: <b>I'm from Türkiye.</b>" } : { tur: "diger", m: "Şöyle yaz: <b>I'm from Türkiye.</b>" }, ipucu: "I'm from …" },
          { s: "What is your nationality?", cevap: "I'm Turkish.", d: y => /^i am turkish$/.test(icGenisle(y)) ? { tur: "dogru" } : /türkiye/.test(icGenisle(y)) ? { tur: "milliyet", m: "Milliyet soruluyor: <b>I'm Turkish.</b>" } : { tur: "diger", m: "Şöyle yaz: <b>I'm Turkish.</b>" }, ipucu: "I'm …" },
          { s: "Where do you live?", cevap: "I live in Ankara.", d: y => /^i live in [a-zçğıöşüİ ]+$/.test(icGenisle(y)) ? { tur: "dogru" } : /^i am live/.test(icGenisle(y)) ? { tur: "be", m: "live bir fiil; <b>am</b> gerekmez: <b>I live in …</b>" } : { tur: "diger", m: "Şöyle yaz: <b>I live in</b> (şehrin adı)." }, ipucu: "I live in …" }] };
    },
  },
  adim: { 2: ["tablo", "kart"], 3: ["tablo", "kart", "hata", "sen"] },
  teshis(p, y) {
    const w = icGenisle(y), b = icGenisle(p.b[0]);
    const mil = IC_ULKE.find(u => w.includes(u[1].toLowerCase())), ulk = IC_ULKE.find(u => w.includes(u[0].toLowerCase()));
    if (/ from /.test(" " + b + " ") && mil && new RegExp(`from ${mil[1].toLowerCase()}\\b`).test(w) && !ulk) return { tur: "ulke", m: `from'dan sonra <b>ülke</b> gelir: from <b>${icE(mil[0])}</b>` };
    if (p.tek && IC_ULKE.some(u => u[0].toLowerCase() === w) && IC_ULKE.some(u => u[1].toLowerCase() === b)) return { tur: "mil", m: `Milliyet soruluyor: <b>${icE(p.b[0])}</b>` };
    return null;
  },
});

/* ---------- 5. Kim neden bahsediyor? (kâğıt 1) ---------- */
const IC_KONU_AD = { yer: ["the places at school", "places"], kulup: ["the school clubs", "clubs"], kural: ["the rules at school", "rules"],
  kisi: ["the people at school", "people"], ulke: ["countries", "countries"], gun: ["national days", "national days"] };
function icKonusma(t, ad) {
  if (t === "yer") { const y = icSec(IC_YER.filter(x => x[0] !== "classroom"), 3); return `Hi! I'm ${ad}. There is a big ${y[0][0]}, ${icAn(y[1][0])} ${y[1][0]} and ${icAn(y[2][0])} ${y[2][0]} in my school.`; }
  if (t === "kulup") { const k = icR(IC_KULUP); return `Hi! I'm ${ad}. I am in the ${k[0]} club because I love ${k[2]} with my friends.`; }
  if (t === "kural") { const m = icR(IC_KURAL.filter(x => x[0])), n = icR(IC_KURAL.filter(x => !x[0])); return `Hi! I'm ${ad}. We must ${m[1].replace("your", "our")} and we mustn't ${n[1].replace("your", "our")}.`; }
  if (t === "kisi") { const r = icR(IC_ROL), s = icSec(IC_SIFAT, 2), kiz = Math.random() < .5; return `Hi! I'm ${ad}. My favourite person is our ${r}, ${kiz ? "Ms" : "Mr"} ${icR(IC_SOYAD)}. ${kiz ? "She" : "He"} is ${s[0]} and ${s[1]}.`; }
  if (t === "ulke") { const u = icR(IC_ULKE.filter(x => x[0] !== "Türkiye")); return `Hi! I'm ${ad}. I'm from ${u[0]}. I live in ${u[4]} with my family.`; }
  const g = icR([["29 October", "Republic Day"], ["23 April", "National Sovereignty and Children's Day"], ["19 May", "Youth and Sports Day"], ["30 August", "Victory Day"]]);
  return `Hi! I'm ${ad}. On ${g[0]}, we celebrate ${g[1]}. We wave our flags.`;
}
function icKimSoru(n) {
  const adlar = icSec([...IC_KIZ, ...IC_ERKEK], n), konular = icSec(Object.keys(IC_KONU_AD), n);
  const satir = konular.map((t, i) => [adlar[i], t, icKonusma(t, adlar[i])]);
  const soru = icKaristir(satir);
  return { yon: "kim", anahtar: "k-" + satir.map(x => x[2]).join(),
    govde: icMetinKutu(satir.map(x => icE(x[2])).join("<br>")),
    parcalar: soru.map(([ad, t]) => ({ s: `____ is talking about ${IC_KONU_AD[t][0]}.`, b: [ad], tek: 1, ipucu: icIpucuKonu(t),
      d: y => icEsit(y, ad) ? { tur: "dogru" } : satir.some(x => icEsit(x[0], y)) ? { tur: "kim", m: `${icE(y.trim())} başka bir konudan bahsediyor. ${icIpucuKonu(t)}` } : icGenelTeshis(ad, y), cevap: ad })) };
}
const icIpucuKonu = t => ({ yer: "Okuldaki yerler: library, canteen, gym, lab… geçen cümleyi ara.", kulup: "<b>club</b> kelimesini ara.", kural: "<b>must / mustn't</b> geçen cümleyi ara.",
  kisi: "teacher, headmaster, kind, helpful geçen cümleyi ara.", ulke: "<b>I'm from …</b> geçen cümleyi ara.", gun: "celebrate, flag, Republic Day geçen cümleyi ara." })[t];
icKonu({
  kod: "kim", ad: "Kim neden bahsediyor? (okuldaki yerler, kulüpler, kurallar…)", simge: "👀", kaynak: "Kâğıt 1. soru",
  kural: `Her kelimeyi anlaman gerekmez; <b>konuyu ele veren kelimeyi</b> ara:<br>
    <b>Places</b>: library, canteen, gym, science lab · <b>Clubs</b>: club, member · <b>Rules</b>: must, mustn't<br>
    <b>People</b>: teacher, headmaster, kind, helpful · <b>Countries</b>: I'm from…, I live in… · <b>National days</b>: celebrate, flag, Republic Day`,
  kesfet() {
    const ad = icR([...IC_KIZ, ...IC_ERKEK]), t = icR(["kulup", "kural", "ulke", "yer"]), c = icKonusma(t, ad);
    const anahtar = { kulup: /(\w+ club)/, kural: /(must)/, ulke: /(I'm from \w+)/, yer: /(big \w+)/ }[t];
    return {
      anahtar: "kim-k-" + c,
      ornekler: [icE(c).replace(anahtar, m => icRenk(m, "ek"))],
      soru: `${ad} neden bahsediyor?`, secenekler: [t, ...icSec(["kulup", "kural", "ulke", "yer", "kisi"].filter(x => x !== t), 2)].map(x => IC_KONU_AD[x][0]),
      dogru: IC_KONU_AD[t][0], ipucu: "Kırmızı kelimeye bak: konuyu o ele veriyor.",
    };
  },
  turler: {
    kim3() { return icKimSoru(3); },
    kim5() { return icKimSoru(5); },
    konu() {
      const adlar = icSec([...IC_KIZ, ...IC_ERKEK], 3), konular = icSec(Object.keys(IC_KONU_AD), 3);
      const satir = konular.map((t, i) => [adlar[i], t, icKonusma(t, adlar[i])]);
      return { yon: "konu", anahtar: "kk-" + satir.map(x => x[2]).join(),
        govde: icMetinKutu(satir.map(x => icE(x[2])).join("<br>")) + `<p class="ic-ipucu">Yazabileceğin konular: places · clubs · rules · people · countries · national days</p>`,
        parcalar: satir.map(([ad, t]) => ({ s: `${ad} is talking about ____.`, b: [IC_KONU_AD[t][0], IC_KONU_AD[t][1], "school " + IC_KONU_AD[t][1], IC_KONU_AD[t][1] + " at school"], tek: 1, ipucu: icIpucuKonu(t), cevap: IC_KONU_AD[t][1] })) };
    },
  },
  adim: { 2: ["kim3", "konu"], 3: ["kim5", "konu"] },
});

/* ---------- 6. a / an ---------- */
const IC_SIFAT_AAN = ["big", "small", "old", "new", "red", "orange", "ugly", "interesting", "expensive", "beautiful", "funny", "empty"];
icKonu({
  kod: "aan", ad: "a / an", simge: "🍎", kaynak: "Defter",
  kural: `<b>a / an</b> = bir; yalnız <b>tekil</b> isimlerin önüne gelir (çoğulda yok).<br><b>an</b>: a, e, i, o, u <b>sesiyle</b> başlayan kelime (an apple, an egg, an umbrella, <b>an hour</b>)<br>
    <b>a</b>: ünsüz sesle başlayan kelime (a pen, a dog, <b>a uniform</b> — "yu" sesi)<br>Sıfat varsa sıfata bak: an apple → <b>a red</b> apple · a car → <b>an old</b> car`,
  kesfet() {
    const n = icSec(IC_NESNE_RESIM, 6);
    return {
      anahtar: "a-k-" + n.map(x => x[0]).join(),
      ornekler: [n.map(([w, e]) => `${e} ${icRenk(icAn(w), icAn(w) === "an" ? "ek" : "fi")} ${icRenk(w[0], "oz")}${w.slice(1)}`).join(" &nbsp;·&nbsp; ")],
      soru: "\"an\" hangi kelimelerin önüne geliyor?", secenekler: ["a, e, i, o, u sesiyle başlayan kelimelerin", "Uzun kelimelerin", "Çoğul kelimelerin"],
      dogru: "a, e, i, o, u sesiyle başlayan kelimelerin", ipucu: "Mavi harflere bak: an'dan sonra hangi harfler var?",
    };
  },
  turler: {
    yaz() {
      const ekstra = [["uniform", "👔"], ["hour", "⏰"], ["university", "🎓"], ["egg", "🥚"], ["ear", "👂"]];
      const n = icSec(IC_NESNE_RESIM.concat(ekstra), 5).map(([w, e]) => Math.random() < .3 ? [icR(IC_SIFAT_AAN) + " " + w, e] : [w, e]);
      return { yon: "aan_yaz", anahtar: "a-y-" + n.map(x => x[0]).join(), govde: "",
        parcalar: n.map(([w, e]) => ({ s: `____ ${w} ${e}`, b: [icAn(w)], tek: 1, ipucu: `"${w.split(" ")[0]}" hangi sesle başlıyor?`, w })) };
    },
    resim() {
      const n = icSec(IC_NESNE_RESIM, 3).map(([w, e]) => { const s = Math.random() < .5 ? icR(IC_SIFAT_AAN) : ""; return [s ? s + " " + w : w, e, s]; });
      return { yon: "resim_yaz", anahtar: "a-r-" + n.map(x => x[0]).join(), govde: "",
        parcalar: n.map(([w, e, s]) => ({ s: `<span class="ic-buyuk-emoji">${e}</span> ${s ? `(${s})` : ""}`, b: [`It is ${icAn(w)} ${w}.`, `This is ${icAn(w)} ${w}.`, `${icAn(w)} ${w}.`], cevap: `It's ${icAn(w)} ${w}.`, ipucu: `It's a/an ${s ? s + " " : ""}…`, w })) };
    },
    hata() {
      const n = icSec(IC_NESNE_RESIM, 2).map(([w]) => { const s = Math.random() < .4 ? icR(IC_SIFAT_AAN) + " " : ""; const dogru = icAn(s + w); return [s + w, dogru]; });
      const kal = icR(["I have got", "There is", "This is", "She has got"]);
      return { yon: "hata", anahtar: "a-h-" + n.map(x => x[0]).join(), govde: "",
        parcalar: n.map(([w, d]) => { const yanlis = d === "a" ? "an" : "a"; const c = `${kal} ${yanlis} ${w}.`, b = `${kal} ${d} ${w}.`;
          return { s: c, b: [b], w, ipucu: `"${w.split(" ")[0]}" hangi sesle başlıyor?`, d: y => icEsit(y, b) ? { tur: "dogru" } : icEsit(y, c) ? { tur: "ayni", m: "Cümleyi aynen yazdın; a mı an mı, bir daha bak." } : icGenelTeshis(b, y) }; }) };
    },
  },
  adim: { 2: ["yaz", "resim"], 3: ["yaz", "resim", "hata"] },
  teshis(p, y) {
    const w = icGenisle(y).split(" ");
    const art = w.find(x => x === "a" || x === "an");
    if (p.w && art && art !== icAn(p.w)) {
      const ilk = p.w.split(" ")[0], ozel = /^(uni|use|hour)/.test(ilk);
      return { tur: "aan", m: ozel ? `<b>${icE(ilk)}</b>: ${/^hour/.test(ilk) ? "h okunmaz, ünlü sesle başlar → <b>an</b>" : "\"yu\" sesiyle başlar → <b>a</b>"}.` :
        `<b>${icE(ilk)}</b> ${/^[aeiou]/.test(ilk) ? "ünlü sesle başlıyor → <b>an</b>" : "ünsüz sesle başlıyor → <b>a</b>"}.` };
    }
    return null;
  },
});

/* ---------- 7. Kulüp ve yer adları (kâğıt 4, 8, 10) ---------- */
icKonu({
  kod: "adlar", ad: "Okul kulüpleri ve okuldaki yerlerin adları", simge: "🏫", kaynak: "Kâğıt 4, 8, 10. sorular",
  kural: `Kulüp adı: <b>… club</b> (chess club, music club, art club, sports club, drama club, science club, technology club…)<br>
    Yerler: library, canteen, science lab, gym, music room, art room, computer lab, garden, playground, conference hall<br>
    İpucu cümleler: "loves <b>playing chess</b>" → chess club · "<b>We read books here.</b>" → library`,
  kesfet() {
    const k = icSec(IC_KULUP, 3);
    return {
      anahtar: "ad-k-" + k.map(x => x[0]).join(),
      ornekler: k.map(x => `${x[1]} ${icKisi().ad} loves ${icRenk(x[2], "ek")}. → ${icRenk("the " + x[0] + " club", "oz")}`),
      soru: `"Tom loves ${k[0][2]}." Tom hangi kulüpte?`, secenekler: icKaristir([k[0][0] + " club", k[1][0] + " club", k[2][0] + " club"]), dogru: k[0][0] + " club",
      ipucu: "Kırmızı kelimelere bak: kişi neyi seviyor?",
    };
  },
  turler: {
    kulupResim() {
      const k = icSec(IC_KULUP, 4);
      return { yon: "kulup_resim", anahtar: "ad-kr-" + k.map(x => x[0]).join(), govde: "",
        parcalar: k.map((x, i) => ({ s: `${i + 1}. <span class="ic-buyuk-emoji">${x[1]}</span>`, b: [x[0] + " club", "the " + x[0] + " club"], cevap: x[0] + " club", tek: 1, ipucu: `… club (${x[2]})`,
          d: y => icEsit(y, x[0] + " club") || icEsit(y, "the " + x[0] + " club") ? { tur: "dogru" } : icEsit(y, x[0]) ? { tur: "club", m: `Sonuna <b>club</b> ekle: <b>${x[0]} club</b>` } : icGenelTeshis(x[0] + " club", y) })) };
    },
    yerResim() {
      const y = icSec(IC_YER, 4);
      return { yon: "yer_resim", anahtar: "ad-yr-" + y.map(x => x[0]).join(), govde: "",
        parcalar: y.map((x, i) => ({ s: `${i + 1}. <span class="ic-buyuk-emoji">${x[1]}</span> <small>(${x[2]})</small>`, b: [x[0], "the " + x[0], "a " + x[0]], cevap: x[0], tek: 1, ipucu: x[2] })) };
    },
    kim() {
      const k = icSec(IC_KULUP, 3), adlar = icSec([...IC_KIZ, ...IC_ERKEK], 3);
      return { yon: "kulup_kim", anahtar: "ad-kk-" + k.map(x => x[0]).join() + adlar.join(),
        govde: icMetinKutu(k.map((x, i) => `${adlar[i]} loves ${x[2]}.`).join("<br>")),
        parcalar: k.map((x, i) => ({ s: `${adlar[i]}: ${["He", "She"][IC_KIZ.includes(adlar[i]) ? 1 : 0]} is a member of the ____.`, b: [x[0] + " club", "the " + x[0] + " club"], cevap: x[0] + " club", tek: 1, ipucu: `${x[2]} → … club`,
          d: yy => icEsit(yy, x[0] + " club") || icEsit(yy, "the " + x[0] + " club") ? { tur: "dogru" } : icEsit(yy, x[0]) ? { tur: "club", m: `Sonuna <b>club</b> ekle: <b>${x[0]} club</b>` } : icGenelTeshis(x[0] + " club", yy) })) };
    },
  },
  adim: { 2: ["kulupResim", "kim"], 3: ["kulupResim", "yerResim", "kim"] },
});

/* ---------- 8. have got / has got ---------- */
const icHas = k => k.t ? "has" : "have", icHasnt = k => k.t ? "hasn't" : "haven't";
function icSahip() {
  const t = icR(["ad", "ad", "ad", "I", "we", "they", "ikili", "aile"]);
  if (t === "ad") { const k = icKisi(); return { ad: k.ad, z: k.z, t: 1 }; }
  if (t === "aile") { const r = icR([["My sister", "she"], ["My dad", "he"], ["My mum", "she"], ["My brother", "he"]]); return { ad: r[0], z: r[1], t: 1 }; }
  if (t === "ikili") { const [a, b] = icIkiKisi(); return { ad: `${a.ad} and ${b.ad}`, z: "they", t: 0 }; }
  return { ad: icB(t), z: t, t: 0 };
}
const icSoruOzne = k => /^(My|Our|The) /.test(k.ad) ? k.ad.replace(/^\w+/, m => m.toLowerCase()) : /^(We|They|You)$/.test(k.ad) ? k.ad.toLowerCase() : k.ad;
function icAileMetni() {
  const ben = icKisi(), yakin = icR([["brother", "he"], ["sister", "she"], ["cousin", "she"], ["dad", "he"], ["mum", "she"]]);
  const es = icSec(IC_NESNE, 3), pet = icR(IC_EVCIL), petVar = Math.random() < .5;
  const metin = `Hi! I'm ${ben.ad}. I'm eleven years old. I have got ${es[0]}. I ${petVar ? "have" : "haven't"} got ${pet}. My ${yakin[0]} has got ${es[1]}, but ${yakin[1]} hasn't got ${es[2]}.`;
  return { ben, yakin: { ad: `${ben.ad}'s ${yakin[0]}`, z: yakin[1], Z: icB(yakin[1]), t: 1 }, benK: { ad: ben.ad, z: ben.z, t: 1 }, es, pet, petVar, metin };
}
icKonu({
  kod: "havegot", ad: "have got / has got", simge: "🎁", kaynak: "Defter",
  kural: `<b>he / she / it</b> (tek) → <b>has got</b> · <b>I / you / we / they</b> → <b>have got</b><br>Olumsuz: <b>hasn't got / haven't got</b><br>
    Soru: <b>Has</b> she <b>got</b> a cat? → Yes, she <b>has</b>. / No, she <b>hasn't</b>. (kısa cevapta got yok)`,
  kesfet() {
    const o = []; const z = new Set();
    while (o.length < 4) { const k = icSahip(); if (z.has(k.t + (k.z === "they" ? "t" : k.z))) continue; z.add(k.t + (k.z === "they" ? "t" : k.z)); o.push([k, icR(IC_NESNE)]); }
    return {
      anahtar: "hg-k-" + o.map(x => x[0].ad + x[1]).join(),
      ornekler: o.map(([k, e]) => `${icRenk(k.ad, "oz")} ${icRenk(icHas(k), k.t ? "ek" : "fi")} got ${e}.`),
      soru: "Tek bir kişiyle (Elif, my dad, he, she) hangisi geliyor?", secenekler: ["has got", "have got", "is got"], dogru: "has got",
      ipucu: "Kırmızı kelimeler hangi öznelerden sonra geliyor?",
    };
  },
  turler: {
    metin() {
      const m = icAileMetni();
      const g = [[m.benK, m.es[0], 1], [m.benK, m.pet, m.petVar], [m.yakin, m.es[1], 1], [m.yakin, m.es[2], 0]];
      return { yon: "hg_metin", anahtar: "hg-m-" + m.metin, govde: icMetinKutu(icE(m.metin)),
        parcalar: g.map(([k, e, v], i) => ({ s: `${i + 1}. ${k.ad} ____ ${e}.`, b: [`${k.ad} ${v ? "has got" : "hasn't got"} ${e}.`], k, ipucu: `${k.ad} = ${k.z} → has got / hasn't got` })) };
    },
    sirala() {
      const k = icSahip(), e = icR(IC_NESNE), olm = Math.random() < .35, f = olm ? icHasnt(k) : icHas(k), c = `${k.ad} ${f} got ${e}.`;
      return { yon: "sirala", anahtar: "hg-r-" + c, govde: `<div class="ic-kelimeler">${icKaristir([k.ad, f, "got", ...e.split(" ")]).map(x => `<span>${icE(x)}</span>`).join("")}</div>`,
        parcalar: [{ s: "", b: [c], k, ipucu: "Özne + has/have + got + …" }] };
    },
    oku() {
      const m = icAileMetni();
      return { yon: "oku_cevapla", anahtar: "hg-o-" + m.metin, govde: icMetinKutu(icE(m.metin)),
        parcalar: [
          { s: `Has ${m.ben.ad} got ${m.pet}?`, b: [`${m.petVar ? "Yes" : "No"}, ${m.ben.z} ${m.petVar ? "has" : "hasn't"}.`], k: m.benK, ipucu: `Yes, ${m.ben.z} has. / No, ${m.ben.z} hasn't.` },
          { s: `Has ${m.yakin.ad} got ${m.es[2]}?`, b: [`No, ${m.yakin.z} hasn't.`], k: m.yakin, ipucu: `No, ${m.yakin.z} hasn't.` },
          { s: `What has ${m.yakin.ad} got?`, b: [`${m.yakin.Z} has got ${m.es[1]}.`, `${m.yakin.ad} has got ${m.es[1]}.`], k: m.yakin, ipucu: `${m.yakin.Z} has got …` }] };
    },
    tablo() {
      const [a, b] = icIkiKisi(), es = icSec(IC_NESNE, 2);
      const t = [[Math.random() < .5, Math.random() < .5], [Math.random() < .5, Math.random() < .5]];
      if (t.flat().every(Boolean)) t[0][1] = false; if (!t.flat().some(Boolean)) t[1][0] = true;
      return { yon: "tablo_yaz", anahtar: "hg-t-" + a.ad + b.ad + es.join() + t.flat().join(),
        govde: `<table class="ic-tablo"><tr><th></th>${es.map(e => `<th>${e.replace(/^an? /, "")}</th>`).join("")}</tr>${[a, b].map((k, i) => `<tr><th>${k.ad}</th>${t[i].map(v => `<td>${v ? "✔" : "✘"}</td>`).join("")}</tr>`).join("")}</table><p class="ic-ipucu">✔ var · ✘ yok</p>`,
        parcalar: [a, b].flatMap((k, i) => es.map((e, j) => ({ s: `${k.ad} – ${e.replace(/^an? /, "")}`, b: [`${k.ad} ${t[i][j] ? "has got" : "hasn't got"} ${e}.`, `${k.Z} ${t[i][j] ? "has got" : "hasn't got"} ${e}.`], k: { ad: k.ad, z: k.z, t: 1 }, ipucu: `${k.ad} ${t[i][j] ? "has got" : "hasn't got"} …` }))) };
    },
    sen() {
      const s = [icR(IC_EVCIL), icR(IC_AILE), icR(IC_NESNE)];
      const d = y => { const w = icGenisle(y);
        if (/^(yes i have|no i have not)( got .*)?$/.test(w)) return /^(yes|no) i (have|have not) got$/.test(w) ? { tur: "kisa", m: "Kısa cevapta <b>got</b> yok: <b>Yes, I have.</b> / <b>No, I haven't.</b>" } : { tur: "dogru" };
        if (/\bhas\b/.test(w)) return { tur: "fiil", m: "Kendin için <b>I have / I haven't</b> yazılır." };
        if (/^(yes|no) i (do|do not)/.test(w)) return { tur: "do", m: "Have you got…? → <b>Yes, I have.</b> / <b>No, I haven't.</b>" };
        if (/^yes i have not|^no i have\b(?! not)/.test(w)) return { tur: "celiski", m: "<b>Yes</b> ile <b>have</b>, <b>No</b> ile <b>haven't</b> birlikte gelir." };
        return { tur: "diger", m: "Şöyle başla: <b>Yes, I have.</b> ya da <b>No, I haven't.</b>" }; };
      return { yon: "sen", anahtar: "hg-s-" + s.join(), govde: "", parcalar: s.map(e => ({ s: `Have you got ${e}?`, d, cevap: "Yes, I have. / No, I haven't.", ipucu: "Yes, I have. / No, I haven't." })) };
    },
  },
  adim: { 2: ["metin", "sirala"], 3: ["metin", "sirala", "oku", "tablo", "sen"] },
  teshis: icHaveTeshis,
});

/* ---------- 9. must / mustn't (kâğıt 5) ---------- */
icKonu({
  kod: "must", ad: "must / mustn't (okul kuralları)", simge: "🚦", kaynak: "Kâğıt 5. soru",
  kural: `<b>must</b> = -meli, -malı (yapılması gereken) · <b>mustn't</b> = -memeli, -mamalı (yasak)<br>
    Öğretmen "<b>Do</b> this" diyorsa → <b>must</b> · "<b>Don't</b> …", "It is <b>dangerous</b> …", "not allowed" diyorsa → <b>mustn't</b><br>must'tan sonra fiil yalın: must <b>listen</b> (must listens ✘)`,
  kesfet() {
    const k = [icR(IC_KURAL.filter(x => x[0])), icR(IC_KURAL.filter(x => !x[0])), icR(IC_KURAL.filter(x => !x[0] && /^Don't/.test(x[2])))];
    return {
      anahtar: "mu-k-" + k.map(x => x[1]).join(),
      ornekler: k.map(x => `"${icE(x[2]).replace(/^(Don't|Put|It is dangerous|Phones are not allowed)/, m => icRenk(m, "ek"))}" → You ${icRenk(x[0] ? "must" : "mustn't", x[0] ? "fi" : "ek")} ${x[1]}.`),
      soru: "Öğretmen \"Don't …\" diyorsa kural hangisiyle yazılır?", secenekler: ["mustn't", "must", "can"], dogru: "mustn't",
      ipucu: "Kırmızı kelimelerle başlayan sözlere bak.",
    };
  },
  turler: {
    metin() {
      const k = icSec(IC_KURAL, 5); if (!k.some(x => x[0])) k[0] = icR(IC_KURAL.filter(x => x[0])); if (k.every(x => x[0])) k[1] = icR(IC_KURAL.filter(x => !x[0]));
      const ad = icKisi(), ogr = icR(["Mrs Brown", "Mr Kaya", "Ms Demir", "Mr Smith"]);
      const metin = `Hi! My name is ${ad.ad}. Today is my first day at school. Our teacher is talking about the classroom rules.<br><b>${ogr}:</b> ${icKaristir(k).map(x => icE(x[2])).join(" ")}`;
      return { yon: "must_metin", anahtar: "mu-m-" + k.map(x => x[1]).join(), govde: icMetinKutu(metin),
        parcalar: k.map((x, i) => ({ s: `${i + 1}. You ____ ${x[1]}.`, b: [x[0] ? "must" : "mustn't"], tek: 1, ipucu: `Öğretmen ne diyor: "${x[2]}"` })) };
    },
    isaret() {
      const k = icSec(IC_KURAL, 3);
      return { yon: "must_isaret", anahtar: "mu-i-" + k.map(x => x[1]).join(), govde: "",
        parcalar: k.map((x, i) => { const fiil = x[1].split(" ")[0];
          return { s: `${i + 1}. <span class="ic-isaret ${x[0] ? "evet" : "hayir"}">${x[0] ? "✅" : "🚫"}</span> ${x[1].replace("your", "…")}`, cevap: `You ${x[0] ? "must" : "mustn't"} ${x[1]}.`,
            d: y => { const w = icGenisle(y);
              if (!/^(you|we|students) must/.test(w)) return { tur: "kalip", m: `Şöyle başla: <b>You ${x[0] ? "must" : "mustn't"} …</b>` };
              const olm = /must not/.test(w);
              if (olm === !!x[0]) return { tur: "must", m: x[0] ? "Yeşil işaret = yapılmalı → <b>must</b>" : "Kırmızı işaret = yasak → <b>mustn't</b>" };
              if (!w.includes(fiil)) return { tur: "fiil", m: `Kuralı yaz: <b>You ${x[0] ? "must" : "mustn't"} ${x[1]}.</b>` };
              if (new RegExp(`must (not )?${fiil}s\\b`).test(w)) return { tur: "s", m: "must'tan sonra fiil yalın gelir (-s yok)." };
              return { tur: "dogru" }; }, ipucu: `You ${x[0] ? "must" : "mustn't"} …` }; }) };
    },
    kendi() {
      const d1 = y => { const w = icGenisle(y); return /^(you|we|students) must (?!not)\w+/.test(w) ? { tur: "dogru" } : /must not/.test(w) ? { tur: "must", m: "Burada <b>must</b> (olumlu) kural istiyor." } : { tur: "kalip", m: "Şöyle başla: <b>You must …</b>" }; };
      const d2 = y => { const w = icGenisle(y); return /^(you|we|students) must not \w+/.test(w) ? { tur: "dogru" } : /must/.test(w) ? { tur: "must", m: "Burada <b>mustn't</b> (yasak) kuralı istiyor." } : { tur: "kalip", m: "Şöyle başla: <b>You mustn't …</b>" }; };
      return { yon: "must_kendi", anahtar: "mu-ke-" + Math.random(), govde: "",
        parcalar: [{ s: "1. (must)", d: d1, cevap: "You must listen to the teacher.", ipucu: "You must …" }, { s: "2. (mustn't)", d: d2, cevap: "You mustn't run in the classroom.", ipucu: "You mustn't …" }] };
    },
  },
  adim: { 2: ["metin"], 3: ["metin", "isaret", "kendi"] },
  teshis(p, y) {
    const w = icGenisle(y), b = icGenisle(p.b[0]);
    if (p.tek && /must/.test(w) && w !== b) return { tur: "must", m: b === "must" ? "Bu yapılması gereken bir şey → <b>must</b>" : "Bu yasak (Don't / dangerous) → <b>mustn't</b>" };
    return null;
  },
});

/* ---------- 10. this / that / these / those ---------- */
function icSahne(n, e, yakin, cok) {
  const nesne = cok ? `${e}${e}` : e;
  return yakin ? `<span class="ic-sahne">🧒🫴${nesne}</span>` : `<span class="ic-sahne">🧒👉 · · · · · ${nesne}</span>`;
}
const icBuSu = (yakin, cok) => yakin ? (cok ? "These" : "This") : (cok ? "Those" : "That");
icKonu({
  kod: "this", ad: "this / that / these / those (yakın – uzak)", simge: "👉", kaynak: "Defter",
  kural: `Yakın + tek → <b>this</b> (bu) · Uzak + tek → <b>that</b> (şu)<br>Yakın + çok → <b>these</b> (bunlar) · Uzak + çok → <b>those</b> (şunlar)<br>
    this / that → <b>is</b> · these / those → <b>are</b> ve isim çoğul: These <b>are</b> book<b>s</b>.`,
  kesfet() {
    const n = icSec(IC_NESNE_RESIM.filter(x => !/ /.test(x[0])), 4), d = [[1, 0], [0, 0], [1, 1], [0, 1]];
    return {
      anahtar: "th-k-" + n.map(x => x[0]).join(),
      ornekler: n.map(([w, e], i) => `${icSahne(w, e, d[i][0], d[i][1])} ${icRenk(icBuSu(d[i][0], d[i][1]), d[i][0] ? "fi" : "ek")} ${d[i][1] ? "are" : "is"} ${d[i][1] ? icCogul(w) : icAn(w) + " " + w}.`),
      soru: "UZAKTAKİ TEK bir şey için hangisi?", secenekler: ["that", "this", "those"], dogru: "that", ipucu: "Çocuğun elindekiler yakın, ötede olanlar uzak.",
    };
  },
  turler: {
    bosluk() {
      const n = icSec(IC_NESNE_RESIM.filter(x => !/ /.test(x[0])), 4), d = icKaristir([[1, 0], [0, 0], [1, 1], [0, 1]]);
      return { yon: "this_bosluk", anahtar: "th-b-" + n.map(x => x[0]).join() + d.flat().join(), govde: "",
        parcalar: n.map(([w, e], i) => ({ s: `${icSahne(w, e, d[i][0], d[i][1])} ____ ${d[i][1] ? "are" : "is"} ${d[i][1] ? "my " + icCogul(w) : "my " + w}.`, b: [icBuSu(d[i][0], d[i][1])], tek: 1, dd: d[i], ipucu: `${d[i][0] ? "yakın" : "uzak"} + ${d[i][1] ? "çok" : "tek"}` })) };
    },
    yaz() {
      const n = icSec(IC_NESNE_RESIM.filter(x => !/ /.test(x[0])), 3), d = icSec([[1, 0], [0, 0], [1, 1], [0, 1]], 3);
      return { yon: "resim_yaz", anahtar: "th-y-" + n.map(x => x[0]).join() + d.flat().join(), govde: "",
        parcalar: n.map(([w, e], i) => { const [yk, cok] = d[i], bs = icBuSu(yk, cok), c = cok ? `${bs} are ${icCogul(w)}.` : `${bs} is ${icAn(w)} ${w}.`;
          return { s: `${icSahne(w, e, yk, cok)} <small>(${w})</small>`, b: [c, cok ? `${bs} are my ${icCogul(w)}.` : `${bs} is my ${w}.`], dd: d[i], ipucu: `${yk ? "yakın" : "uzak"} + ${cok ? "çok → … are …s" : "tek → … is a/an …"}` }; }) };
    },
    cogul() {
      const n = icSec(IC_NESNE_RESIM.filter(x => !/ /.test(x[0])), 2), y = [Math.random() < .5, Math.random() < .5];
      return { yon: "cogul", anahtar: "th-c-" + n.map(x => x[0]).join() + y.join(), govde: "",
        parcalar: n.map(([w], i) => ({ s: `${y[i] ? "This" : "That"} is ${icAn(w)} ${w}.`, b: [`${y[i] ? "These" : "Those"} are ${icCogul(w)}.`], ipucu: `${y[i] ? "this → these" : "that → those"} · is → are · ${w} → ${icCogul(w)}` })) };
    },
  },
  adim: { 2: ["bosluk"], 3: ["bosluk", "yaz", "cogul"] },
  teshis(p, y) {
    const w = icGenisle(y).split(" "), b = icGenisle(p.b[0]).split(" ");
    const kel = ["this", "that", "these", "those"];
    if (kel.includes(w[0]) && kel.includes(b[0]) && w[0] !== b[0] && p.dd) return { tur: "bu", m: `${p.dd[0] ? "Yakın" : "Uzak"} ve ${p.dd[1] ? "birden çok" : "tek"} → <b>${b[0]}</b>.` };
    if (kel.includes(w[0]) && w[1] && b[1] && w[1] !== b[1] && /^(is|are)$/.test(w[1])) return { tur: "isare", m: `${b[0]} → <b>${b[1]}</b>. (this/that is · these/those are)` };
    if (b[1] === "are" && w[1] === "are" && w.length === b.length && w[w.length - 1] + "s" === b[b.length - 1]) return { tur: "cogul", m: `Çoğulda isim de çoğul olur: <b>${icE(b[b.length - 1])}</b>` };
    return null;
  },
});

/* ---------- 11. Ders programı (kâğıt 2) ---------- */
function icProgram(bosSayi) {
  const ad = icKisi(), dersler = icKaristir(IC_DERS), bas = icR([["half past eight", "8.30"], ["eight o'clock", "8.00"], ["quarter past eight", "8.15"]]),
    bit = icR([["three o'clock", "3.00"], ["half past three", "3.30"], ["four o'clock", "4.00"]]);
  const prog = IC_GUN.map((g, i) => [g, dersler[(i * 2) % dersler.length], dersler[(i * 2 + 1) % dersler.length]]);
  const favori = icR(IC_GUN);
  const bos = icSec(IC_GUN, bosSayi).map(g => [g, Math.random() < .5 ? 1 : 2]);
  const cumle = prog.map(([g, d1, d2]) => {
    const b = bos.find(x => x[0] === g);
    if (!b) return Math.random() < .5 ? `On ${g}, I have ${d1[0]} and ${d2[0]}.` : "";
    const ip = b[1] === 1 ? d1 : d2, diger = b[1] === 1 ? d2 : d1;
    return icR([`On ${g}, ${ip[1]} and I have ${diger[0]}.`, `On ${g}, I have ${diger[0]}, and ${ip[1]}.`, `${g} is great because ${ip[1]}.`]);
  }).filter(Boolean);
  const metin = `Hello! I'm ${ad.ad}. This is my weekly timetable. We start our classes at ${bas[0]} and finish at ${bit[0]}. ${cumle.join(" ")} ${favori} is my favourite day!`;
  return { ad, prog, bos, bas, bit, favori, metin };
}
icKonu({
  kod: "program", ad: "Metne göre ders programı doldurma", simge: "🗓️", kaynak: "Kâğıt 2. soru",
  kural: `Ders adı yazmıyorsa <b>ne yaptıklarına</b> bak:<br>solve problems → <b>Maths</b> · draw pictures → <b>Art</b> · speak English → <b>English</b> · sing songs → <b>Music</b><br>
    play basketball → <b>PE</b> · do experiments → <b>Science</b> · read stories → <b>Turkish</b> · learn about history → <b>Social Studies</b> · use computers → <b>IT</b> · act in plays → <b>Drama</b><br>
    Saat: <b>half past eight</b> = 8.30 · <b>quarter past</b> = …15 · <b>o'clock</b> = tam`,
  kesfet() {
    const d = icSec(IC_DERS, 3);
    return {
      anahtar: "p-k-" + d.map(x => x[0]).join(),
      ornekler: d.map(x => `"On ${icR(IC_GUN)}, ${icRenk(x[1], "ek")}." → ${icRenk(x[0], "oz")}`),
      soru: `"On Monday, ${d[0][1]}." Pazartesi hangi ders var?`, secenekler: icKaristir([d[0][0], d[1][0], d[2][0]]), dogru: d[0][0],
      ipucu: "Kırmızı kelimeler o derste ne yapıldığını söylüyor.",
    };
  },
  turler: {
    program3() { return icProgramSoru(3); },
    program5() { return icProgramSoru(5); },
    saat() {
      const p = icProgram(2);
      return { yon: "oku_cevapla", anahtar: "p-s-" + p.metin, govde: icMetinKutu(icE(p.metin)),
        parcalar: [
          { s: "What time do they start their classes?", b: [`They start at ${p.bas[0]}.`, `At ${p.bas[0]}.`, `They start their classes at ${p.bas[0]}.`, `They start at ${p.bas[1]}.`, `At ${p.bas[1]}.`], cevap: `They start at ${p.bas[0]}.`, ipucu: "We start our classes at …" },
          { s: "What time do they finish?", b: [`They finish at ${p.bit[0]}.`, `At ${p.bit[0]}.`, `They finish at ${p.bit[1]}.`, `At ${p.bit[1]}.`], cevap: `They finish at ${p.bit[0]}.`, ipucu: "… and finish at …" },
          { s: `What is ${p.ad.ad}'s favourite day?`, b: [`${p.ad.Iy} favourite day is ${p.favori}.`, `${p.favori} is ${p.ad.iy} favourite day.`, `${p.favori}.`, `It is ${p.favori}.`], cevap: `${p.ad.Iy} favourite day is ${p.favori}.`, ipucu: "… is my favourite day!" }] };
    },
  },
  adim: { 2: ["program3"], 3: ["program5", "saat"] },
});
function icProgramSoru(n) {
  const p = icProgram(n);
  let no = 0; const yerler = [];
  const satir = p.prog.map(([g, d1, d2]) => { const b = p.bos.find(x => x[0] === g);
    const h = i => { if (b && b[1] === i) { yerler.push([g, i === 1 ? d1 : d2]); return `<td class="ic-bos">(${++no}) ____</td>`; } return `<td>${(i === 1 ? d1 : d2)[0]}</td>`; };
    return `<tr><th>${g}</th>${h(1)}${h(2)}</tr>`; }).join("");
  return { yon: "program", anahtar: "p-" + n + "-" + p.metin, govde: icMetinKutu(icE(p.metin)) + `<table class="ic-tablo"><tr><th colspan="3">${icE(p.ad.ad)}'s Timetable</th></tr>${satir}</table>`,
    parcalar: yerler.map(([g, d], i) => ({ s: `(${i + 1}) ${g}`, b: [d[0], ...(d[0] === "PE" ? ["Physical Education"] : d[0] === "IT" ? ["Information Technology"] : d[0] === "Maths" ? ["Math", "Mathematics"] : [])], tek: 1, cevap: d[0], ipucu: `${g} cümlesinde ne yapıyorlar? (${d[1]})`,
      d: y => icEsit(y, d[0]) || (d[0] === "PE" && icEsit(y, "Physical Education")) || (d[0] === "IT" && icEsit(y, "Information Technology")) || (d[0] === "Maths" && /^math(s|ematics)?$/i.test(y.trim())) ? { tur: "dogru" } :
        IC_DERS.some(x => icEsit(x[0], y)) ? { tur: "ders", m: `Metinde ${g} için ne diyor? "<b>${icE(d[1])}</b>" → <b>${d[0]}</b>` } : icGenelTeshis(d[0], y) })) };
}

/* ---------- 12. Ordinal numbers ---------- */
icKonu({
  kod: "sira", ad: "Ordinal numbers (first, second, third…)", simge: "🥇", kaynak: "Defter",
  kural: `1st <b>first</b> · 2nd <b>second</b> · 3rd <b>third</b> · sonra çoğu <b>-th</b>: fourth, sixth, seventh, tenth<br>
    Dikkat: <b>fifth</b> (five), <b>eighth</b>, <b>ninth</b> (nine), <b>twelfth</b> (twelve), <b>twentieth</b>, twenty-<b>first</b>, <b>thirtieth</b><br>
    Tarih: My birthday is <b>on the fifth of May</b>. · Yarış: Ali is <b>third</b>. · Kat: on the <b>second</b> floor`,
  kesfet() {
    const s = icSec([4, 6, 7, 10, 11, 13, 14, 16], 3);
    return {
      anahtar: "s-k-" + s.join(),
      ornekler: [`1st ${icRenk("first", "ek")} · 2nd ${icRenk("second", "ek")} · 3rd ${icRenk("third", "ek")}`, s.map(n => `${icSiraKisa(n)} ${icRenk(icSira(n), "fi")}`).join(" · ")],
      soru: "Hangileri kurala uymayan (düzensiz) sıra sayılarıdır?", secenekler: ["first, second, third", "fourth, sixth, seventh", "tenth, eleventh, thirteenth"], dogru: "first, second, third",
      ipucu: "Kırmızılar -th ile bitiyor mu?",
    };
  },
  turler: {
    yaz() {
      const n = icSec([1, 2, 3, 5, 8, 9, 12, 20, 21, 22, 23, 29, 30, 31, 4, 6, 15], 4);
      return { yon: "sira_yaz", anahtar: "s-y-" + n.join(), govde: "",
        parcalar: n.map(x => ({ s: `${icSiraKisa(x)} →`, b: [icSira(x), icSira(x).replace("-", " ")], tek: 1, cevap: icSira(x), ipucu: x > 20 ? `twenty-/thirty- + ${IC_SIRA_1[x % 10] || "…"}` : x <= 3 ? "1st, 2nd, 3rd düzensiz" : "… + th" })) };
    },
    dogum() {
      const k = icKisi(), g = icR([1, 2, 3, 5, 8, 9, 12, 14, 15, 20, 21, 22, 23, 25, 29, 30]), ay = icR(IC_AY), s = icSira(g);
      const kabul = [`It is on the ${s} of ${ay}.`, `${k.Iy} birthday is on the ${s} of ${ay}.`, `It is on ${ay} the ${s}.`, `${k.Iy} birthday is on ${ay} the ${s}.`, `On the ${s} of ${ay}.`];
      return { yon: "kart", anahtar: "s-d-" + k.ad + g + ay, govde: `<div class="ic-kart-kisi"><span>🎂</span><b>${k.ad}</b><small>${g} ${ay}</small></div>`,
        parcalar: [{ s: `When is ${k.ad}'s birthday?`, b: kabul.flatMap(x => [x, x.replace(s, s.replace("-", " "))]), cevap: kabul[0], ipucu: `It's on the … of ${ay}. (${g} → ${icSiraKisa(g)})`,
          d: y => { if (kabul.some(x => icEsit(x, y) || icEsit(x.replace(s, s.replace("-", " ")), y))) return { tur: "dogru" };
            const w = icGenisle(y); if (new RegExp(`\\b${g}(st|nd|rd|th)?\\b`).test(w)) return { tur: "rakam", m: `Sıra sayısını yazıyla yaz: <b>${s}</b>` };
            if (!/ on /.test(" " + w + " ")) return { tur: "on", m: `Tarihten önce <b>on</b>: <b>${icE(kabul[0])}</b>` };
            return icGenelTeshis(kabul[0], y); } }] };
    },
    yaris() {
      const adlar = icSec([...IC_KIZ, ...IC_ERKEK], 5), madalya = ["🥇", "🥈", "🥉", "4", "5"];
      const q = icSec([1, 2, 3, 4, 5], 2);
      return { yon: "yaris", anahtar: "s-r-" + adlar.join() + q.join(), govde: `<div class="ic-yaris">🏁 ${adlar.map((a, i) => `<span>${madalya[i]} ${a}</span>`).join("")}</div>`,
        parcalar: [
          { s: `Who is ${icSira(q[0])}?`, b: [`${adlar[q[0] - 1]} is ${icSira(q[0])}.`, `${adlar[q[0] - 1]} is the ${icSira(q[0])}.`, `${adlar[q[0] - 1]}.`], cevap: `${adlar[q[0] - 1]} is ${icSira(q[0])}.`, ipucu: `… is ${icSira(q[0])}.` },
          { s: `What is ${adlar[q[1] - 1]}'s place?`, b: [`${IC_KIZ.includes(adlar[q[1] - 1]) ? "She" : "He"} is ${icSira(q[1])}.`, `${adlar[q[1] - 1]} is ${icSira(q[1])}.`, `${icB(icSira(q[1]))}.`, `${IC_KIZ.includes(adlar[q[1] - 1]) ? "She" : "He"} is the ${icSira(q[1])}.`],
            cevap: `${IC_KIZ.includes(adlar[q[1] - 1]) ? "She" : "He"} is ${icSira(q[1])}.`, ipucu: `${IC_KIZ.includes(adlar[q[1] - 1]) ? "She" : "He"} is …` }] };
    },
  },
  adim: { 2: ["yaz", "yaris"], 3: ["yaz", "dogum", "yaris"] },
  teshis(p, y) {
    const w = icGenisle(y);
    if (/\b(one|two|three|five|eight|nine|twelve|twenty)\b/.test(w) && /(first|second|third|fifth|eighth|ninth|twelfth|twentieth)/.test(icGenisle(p.b[0]))) return { tur: "sayi", m: `Sıra sayısı gerekiyor: <b>${icE(p.cevap || p.b[0])}</b>` };
    if (/(oneth|twoth|threeth|fiveth|nineth|twelveth|eightth|twentyth)/.test(w)) return { tur: "duzensiz", m: `Düzensiz sıra sayısı: <b>${icE(p.cevap || p.b[0])}</b>` };
    return null;
  },
});

/* ---------- 13. Simple present: olumsuz ---------- */
function icFiilCumle(ozne) {
  const [f, nes] = icR(IC_FIIL), o = icR(nes);
  const k = ozne || icSahip();
  return { k, f, o, olumlu: `${k.ad} ${k.t ? icS(f) : f} ${o}.`, olumsuz: `${k.ad} ${k.t ? "doesn't" : "don't"} ${f} ${o}.`, soru: `${k.t ? "Does" : "Do"} ${icSoruOzne(k)} ${f} ${o}?` };
}
icKonu({
  kod: "spolumsuz", ad: "Simple present: olumsuz (don't / doesn't)", simge: "🙅", kaynak: "Defter",
  kural: `<b>I / you / we / they</b> → <b>don't</b> + fiil · <b>he / she / it</b> → <b>doesn't</b> + fiil<br>
    -s, <b>doesn't</b>'a geçer; fiil yalın kalır: He play<b>s</b> → He <b>doesn't play</b> (doesn't plays ✘)<br>
    Fiil yoksa be: He <b>isn't</b> tall. · Fiil varsa do: He <b>doesn't</b> play.`,
  kesfet() {
    const c = [icFiilCumle(Object.assign(icKisi(), { t: 1 })), icFiilCumle({ ad: "They", z: "they", t: 0 })];
    return {
      anahtar: "spo-k-" + c.map(x => x.olumlu).join(),
      ornekler: c.map(x => `${icE(x.olumlu).replace(new RegExp(`\\b(${x.k.t ? icS(x.f).split(" ")[0] : x.f.split(" ")[0]})\\b`), m => icRenk(m, "ek"))} → ${icE(x.olumsuz).replace(/(doesn't|don't)/, m => icRenk(m, "oz"))}`),
      soru: "\"doesn't\"tan sonra fiil nasıl yazılıyor?", secenekler: ["Yalın (play) — -s almaz", "-s alır (plays)", "-ing alır (playing)"], dogru: "Yalın (play) — -s almaz",
      ipucu: "Olumluda -s vardı; olumsuzda fiile bak.",
    };
  },
  turler: {
    olumsuz() {
      const c = [icFiilCumle(), icFiilCumle()];
      return { yon: "sp_olumsuz", anahtar: "spo-o-" + c.map(x => x.olumlu).join(), govde: "",
        parcalar: c.map(x => ({ s: x.olumlu, b: [x.olumsuz], k: x.k, ipucu: `${x.k.ad} → ${x.k.t ? "doesn't" : "don't"} + yalın fiil` })) };
    },
    tablo() {
      const k = icKisi(), f = icSec(IC_FIIL, 2).map(([v, n]) => [v, icR(n)]), v = [true, false];
      return { yon: "tablo_yaz", anahtar: "spo-t-" + k.ad + f.flat().join(),
        govde: `<table class="ic-tablo"><tr><th>${k.ad}</th><th></th></tr>${f.map(([vv, n], i) => `<tr><td>${vv} ${n}</td><td>${v[i] ? "✔" : "✘"}</td></tr>`).join("")}</table><p class="ic-ipucu">✔ yapar · ✘ yapmaz</p>`,
        parcalar: f.map(([vv, n], i) => ({ s: `${vv} ${n} ${v[i] ? "✔" : "✘"}`, b: [`${k.ad} ${v[i] ? icS(vv) : "doesn't " + vv} ${n}.`, `${k.Z} ${v[i] ? icS(vv) : "doesn't " + vv} ${n}.`], k: { ad: k.ad, z: k.z, t: 1 }, ipucu: v[i] ? `${k.ad} ${icS(vv)} …` : `${k.ad} doesn't ${vv} …` })) };
    },
    dogrula() {
      const k = icKisi(), [a, b] = icSec(IC_FIIL.filter(f => f[1].length >= 2), 2), a1 = icSec(a[1], 2), b1 = icR(b[1]);
      const metin = `This is ${k.ad}. ${k.Z} ${icS(a[0])} ${a1[0]} every day. ${k.Z} ${icS(b[0])} ${b1} at the weekend.`;
      const yanlis = `${k.ad} ${icS(a[0])} ${a1[1]}.`, dogru = `${k.ad} doesn't ${a[0]} ${a1[1]}.`;
      return { yon: "sp_dogrula", anahtar: "spo-d-" + metin + a1[1], govde: icMetinKutu(icE(metin)),
        parcalar: [{ s: `✘ ${yanlis}`, b: [dogru], k: { ad: k.ad, z: k.z, t: 1 }, cevap: `${dogru} ${k.Z} ${icS(a[0])} ${a1[0]}.`, ipucu: `${k.ad} doesn't ${a[0]} …`,
          d: y => { const w = icGenisle(y), dd = icGenisle(dogru), dz = icGenisle(`${k.Z} doesn't ${a[0]} ${a1[1]}`);
            if (w.startsWith(dd) || w.startsWith(dz)) return { tur: "dogru" };
            return icDoTeshis({ b: [dogru], k: { ad: k.ad, z: k.z } }, y) || icGenelTeshis(dogru, y); } }] };
    },
  },
  adim: { 2: ["olumsuz", "tablo"], 3: ["olumsuz", "tablo", "dogrula"] },
  teshis: icDoTeshis,
});

/* ---------- 14. Simple present: sorular ---------- */
icKonu({
  kod: "spsoru", ad: "Simple present: sorular (Do / Does)", simge: "❓", kaynak: "Defter",
  kural: `<b>Do</b> + I / you / we / they + fiil? · <b>Does</b> + he / she / it + fiil?<br>Does varsa fiil -s almaz: <b>Does</b> she <b>play</b>…?<br>
    Kısa cevap: Yes, I <b>do</b>. / No, she <b>doesn't</b>. · Soru kelimesiyle: <b>What time do</b> you get up? <b>Where does</b> he live?`,
  kesfet() {
    const c = [icFiilCumle(Object.assign(icKisi(), { t: 1 })), icFiilCumle({ ad: "You", z: "you", t: 0 })];
    return {
      anahtar: "sps-k-" + c.map(x => x.soru).join(),
      ornekler: c.map(x => `${icE(x.olumlu)} → ${icE(x.soru).replace(/^(Does|Do)/, m => icRenk(m, "oz"))}`),
      soru: "Cümlede fiil varsa (play, like, go…) soru neyle başlar?", secenekler: ["Do / Does", "Is / Are", "Has / Have"], dogru: "Do / Does",
      ipucu: "Mavi kelimelere bak.",
    };
  },
  turler: {
    soru() {
      const ozne = () => { const k = icSahip(); return k.ad === "I" ? { ad: "You", z: "you", t: 0 } : k; };
      const c = [icFiilCumle(ozne()), icFiilCumle(ozne())];
      return { yon: "soru_yap", anahtar: "sps-s-" + c.map(x => x.soru).join(), govde: "",
        parcalar: c.map(x => ({ s: `${icSoruOzne(x.k)} / ${x.f} ${x.o} ?`, b: [x.soru], k: x.k, ipucu: `${x.k.t ? "Does" : "Do"} + ${icSoruOzne(x.k)} + ${x.f} …?` })) };
    },
    oku() {
      const k = icKisi(), kalk = icR(["seven", "half past six", "eight"]), git = icR(["half past eight", "eight o'clock", "quarter past eight"]), [f, n] = icR(IC_FIIL.filter(x => !["get up", "go", "live"].includes(x[0]))), ne = icR(n);
      const yer = icR(["Ankara", "İzmir", "Bursa", "Antalya"]);
      const metin = `This is ${k.ad}. ${k.Z} lives in ${yer}. ${k.Z} gets up at ${kalk} every morning. ${k.Z} goes to school at ${git}. After school, ${k.z} ${icS(f)} ${ne}.`;
      const yanlisSaat = kalk === "seven" ? "eight" : "seven";
      const q = icKaristir([
        { s: `Does ${k.ad} get up at ${yanlisSaat}?`, b: [`No, ${k.z} doesn't.`], k: { ad: k.ad, z: k.z } },
        { s: `Does ${k.ad} live in ${yer}?`, b: [`Yes, ${k.z} does.`], k: { ad: k.ad, z: k.z } },
        { s: `What time does ${k.z} go to school?`, b: [`${k.Z} goes to school at ${git}.`, `At ${git}.`], cevap: `${k.Z} goes to school at ${git}.`, k: { ad: k.ad, z: k.z } },
        { s: `What does ${k.z} do after school?`, b: [`${k.Z} ${icS(f)} ${ne}.`, `${k.Z} ${icS(f)} ${ne} after school.`], cevap: `${k.Z} ${icS(f)} ${ne}.`, k: { ad: k.ad, z: k.z } }]).slice(0, 3);
      q.forEach(x => x.ipucu = /^Does/.test(x.s) ? `Yes, ${k.z} does. / No, ${k.z} doesn't.` : `${k.Z} + fiil-s …`);
      return { yon: "oku_cevapla", anahtar: "sps-o-" + metin, govde: icMetinKutu(icE(metin)), parcalar: q };
    },
    cevaptan() {
      const k = icKisi(), sablon = icSec([
        () => { const s = icR(["seven", "eight", "half past seven"]); return [`I get up at ${s} o'clock.`.replace("half past seven o'clock", "half past seven"), ["What time do you get up?"]]; },
        () => [`${k.Z} lives in ${icR(["İzmir", "London", "Rome"])}.`, [`Where does ${k.z} live?`]],
        () => { const d = icR(IC_DERS)[0]; return [`Yes, I do. I like ${d}.`, [`Do you like ${d}?`]]; },
        () => { const [f, n] = icR(IC_FIIL.filter(x => ["play", "watch", "read"].includes(x[0]))); const o = icR(n); return [`No, ${k.z} doesn't. ${k.Z} doesn't ${f} ${o}.`, [`Does ${k.z} ${f} ${o}?`, `Does ${k.ad} ${f} ${o}?`]]; },
        () => [`We go to school at ${icR(["eight", "half past eight"])}.`.replace("eight.", "eight o'clock."), ["What time do you go to school?"]],
        () => { const [f, n] = icR(IC_FIIL.filter(x => ["play", "watch", "eat", "drink"].includes(x[0]))); const o = icR(n); return [`I ${f} ${o} after school.`, ["What do you do after school?"]]; }], 2).map(f => f());
      return { yon: "cevaptan_soru", anahtar: "sps-c-" + sablon.map(x => x[0]).join(), govde: "",
        parcalar: sablon.map(([c, b]) => ({ s: `____? — ${c}`, b, k: { ad: k.ad, z: k.z }, ipucu: /^(Yes|No)/.test(c) ? "Do / Does + kişi + fiil …?" : "Soru kelimesi + do / does + kişi + fiil?" })) };
    },
  },
  adim: { 2: ["soru", "oku"], 3: ["soru", "oku", "cevaptan"] },
  teshis(p, y) {
    const w = icGenisle(y), b = icGenisle(p.b[0]);
    if (/^(yes|no) /.test(b) && /^(yes|no) /.test(w)) {
      if (/ (is|are|am)( not)?$/.test(w)) return { tur: "be", m: `Soru Do/Does ile soruldu: <b>${icE(p.b[0])}</b>` };
      if (/ does( not)?$/.test(b) && / do( not)?$/.test(w)) return { tur: "do", m: `${icE(p.k.ad)} = ${p.k.z} → <b>does / doesn't</b>.` };
      if (w.split(" ")[0] !== b.split(" ")[0]) return { tur: "metin", m: `Metne bir daha bak: <b>${icE(p.b[0])}</b>` };
    }
    return icDoTeshis(p, y);
  },
});

/* ---------- 15. Metni oku, tabloyu doldur (kâğıt 3 ve 9) ---------- */
icKonu({
  kod: "profil", ad: "Metni oku, tabloyu doldur", simge: "🔎", kaynak: "Kâğıt 3 ve 9. sorular",
  kural: `Tablodaki her satır için metinde o bilgiyi veren cümleyi bul:<br><b>Name</b> → My name is… / I'm… · <b>Age</b> → I am … years old · <b>Country</b> → I am from…<br>
    <b>Favourite club</b> → My favourite school club is… · <b>People</b> → teacher, headmaster · <b>Places</b> → library, lab · <b>Rules</b> → must, mustn't · <b>Clubs</b> → … club`,
  kesfet() {
    const k = icKisi(), yas = icR([10, 11, 12]);
    return {
      anahtar: "pr-k-" + k.ad + yas,
      ornekler: [`Hello! My name is ${k.ad}. ${icRenk(`I am ${IC_SAYI[yas]} years old.`, "ek")} I am from ${icR(IC_ULKE)[0]}.`],
      soru: "Tablodaki \"Age\" satırını doldurmak için metinde hangi cümleyi ararsın?", secenekler: ["I am … years old.", "My name is …", "I am from …"], dogru: "I am … years old.",
      ipucu: "Age = yaş. Kırmızı cümleye bak.",
    };
  },
  turler: {
    profil() {
      const k = icKisi(), yas = icR([10, 11, 12, 13]), u = icR(IC_ULKE), kl = icR(IC_KULUP), okul = icR(["Green Valley", "Sunny Hill", "Blue Lake", "Oak Tree"]);
      const metin = `Hello! My name is ${k.ad}. I am ${IC_SAYI[yas]} years old. I am from ${u[0]}. I go to ${okul} Lower Secondary School. My favourite school club is ${kl[0]}.`;
      return { yon: "profil", anahtar: "pr-p-" + metin, govde: icMetinKutu(icE(metin)),
        parcalar: [
          { s: "Name", b: [k.ad], tek: 1, ipucu: "My name is …" },
          { s: "Age", b: [String(yas), IC_SAYI[yas], `${yas} years old`, `${IC_SAYI[yas]} years old`], tek: 1, cevap: String(yas), ipucu: "I am … years old." },
          { s: "Country", b: [u[0], ...(IC_ULKE_EK[u[0]] || [])], tek: 1, ipucu: "I am from …" },
          { s: "Favourite Club", b: [kl[0], kl[0] + " club", "the " + kl[0] + " club"], tek: 1, cevap: kl[0], ipucu: "My favourite school club is …" }] };
    },
    okul() {
      const rol = icR(IC_ROL), soy = icR(IC_SOYAD), kiz = Math.random() < .5, unvan = `${kiz ? "Ms" : "Mr"} ${soy}`;
      const [y1, y2] = icSec(IC_YER.filter(x => !["classroom", "garden"].includes(x[0])), 2), kural = icR(IC_KURAL.filter(x => x[0])), [k1, k2] = icSec(IC_KULUP, 2);
      const metin = `Welcome to our school! ${unvan} is our ${rol}, and ${kiz ? "she" : "he"} is very ${icR(IC_SIFAT)}. Our school is big. It has ${icAn(y1[0])} ${y1[0]} and ${icAn(y2[0])} ${y2[0]}. We must ${kural[1].replace("your", "our")}. After lessons, students can join different school clubs. Some students join the ${k1[0]} club, while others join the ${k2[0]} club.`;
      const icerir = (y, ler) => { const w = icGenisle(y); const eksik = ler.filter(x => !w.includes(icGenisle(x))); return eksik.length ? { tur: "eksik", m: `Eksik: <b>${icE(eksik.join(", "))}</b>` } : { tur: "dogru" }; };
      return { yon: "profil", anahtar: "pr-o-" + metin, govde: icMetinKutu(icE(metin)),
        parcalar: [
          { s: "People at school", d: y => icerir(y, [unvan.split(" ")[1]]), cevap: `${unvan} (${rol})`, tek: 1, ipucu: "teacher / headmaster geçen cümle" },
          { s: "Places at school", d: y => icerir(y, [y1[0], y2[0]]), cevap: `${y1[0]}, ${y2[0]}`, tek: 1, ipucu: "It has a … and a …" },
          { s: "Rules at school", d: y => icerir(y, [kural[1].split(" ")[0]]).tur === "dogru" && /must/.test(icGenisle(y)) ? { tur: "dogru" } : { tur: "eksik", m: `Kuralı yaz: <b>We must ${icE(kural[1].replace("your", "our"))}.</b>` }, cevap: `We must ${kural[1].replace("your", "our")}.`, tek: 1, ipucu: "must geçen cümle" },
          { s: "School clubs", d: y => icerir(y, [k1[0], k2[0]]), cevap: `${k1[0]} club, ${k2[0]} club`, tek: 1, ipucu: "… club" }] };
    },
  },
  adim: { 2: ["profil"], 3: ["profil", "okul"] },
});

/* ---------- 16. Soruları cevapla (kâğıt 6) ---------- */
const IC_SEN_SORU = [
  ["What is your favourite school subject?", "My favourite school subject is Science.", /^my favourite (school )?subject is [a-z ]+$/, w => IC_DERS.some(d => icGenisle(d[0]) === w.trim() || w.trim() === "maths") ? "Tam cümle yaz: <b>My favourite school subject is …</b>" : null],
  ["Which school club are you in?", "I'm in the chess club.", /^i am in the [a-z ]+ club$|^i am a member of the [a-z ]+ club$/, w => /club$/.test(w) && !/^i am/.test(w) ? "Tam cümle yaz: <b>I'm in the … club.</b>" : /^i am in [a-z ]+ club$/.test(w) ? "<b>the</b>'yi unutma: I'm in <b>the</b> … club." : null],
  ["Who is your best friend?", "My best friend is Can.", /^my best friend is [a-zçğıöşü ]+$/, w => w.split(" ").length === 1 ? "Tam cümle yaz: <b>My best friend is …</b>" : null],
  ["What is your name?", "My name is Arın.", /^my name is [a-zçğıöşü ]+$|^i am [a-zçğıöşü]+$/, w => w.split(" ").length === 1 ? "Tam cümle yaz: <b>My name is …</b>" : null],
  ["How old are you?", "I'm eleven years old.", /^i am (ten|eleven|twelve|10|11|12)( years old)?$/, w => /^(10|11|12|ten|eleven|twelve)$/.test(w) ? "Tam cümle yaz: <b>I'm eleven years old.</b>" : /^i (10|11|12|ten|eleven|twelve)/.test(w) ? "<b>am</b>'i unuttun: I <b>am</b> eleven years old." : null],
  ["Where are you from?", "I'm from Türkiye.", /^i am from türkiye$/, w => /türkiye/.test(w) ? "Şöyle yaz: <b>I'm from Türkiye.</b>" : null],
  ["What is your favourite day?", "My favourite day is Friday.", /^my favourite day is (monday|tuesday|wednesday|thursday|friday|saturday|sunday)$|^(monday|tuesday|wednesday|thursday|friday|saturday|sunday) is my favourite day$/, w => /day$/.test(w) && w.split(" ").length === 1 ? "Tam cümle yaz: <b>My favourite day is …</b>" : null],
  ["What do you do after school?", "I play football after school.", /^i [a-z]+ .+$/, w => /^i am [a-z]+ing/.test(w) ? "Her gün yaptığın şey: <b>I play …</b> (am + -ing değil)." : null],
  ["What time do you get up?", "I get up at seven o'clock.", /^i get up at .+$/, w => /^at /.test(w) ? "Tam cümle yaz: <b>I get up at …</b>" : null]];
icKonu({
  kod: "sen", ad: "Soruları kendine göre cevaplama", simge: "💬", kaynak: "Kâğıt 6. soru",
  kural: `Cevabı <b>sorudaki kelimelerle</b> kur, tam cümle yaz:<br>What is <b>your favourite school subject</b>? → <b>My favourite school subject is</b> Science.<br>
    Which school club <b>are you</b> in? → <b>I'm in the</b> chess <b>club</b>. · Who is <b>your best friend</b>? → <b>My best friend is</b> Can.<br>your → <b>my</b> · are you → <b>I am</b> · Büyük harf, nokta!`,
  kesfet() {
    const q = icSec(IC_SEN_SORU, 2);
    return {
      anahtar: "sn-k-" + q.map(x => x[0]).join(),
      ornekler: q.map(x => `${icE(x[0]).replace(/\b(your|you)\b/g, m => icRenk(m, "oz"))} → ${icE(x[1]).replace(/^(My|I'm|I)\b/, m => icRenk(m, "ek"))}`),
      soru: "Soruda \"your\" varsa cevapta yerine ne yazarsın?", secenekler: ["my", "your", "his"], dogru: "my", ipucu: "Mavi kelimeler cevapta neye dönüşmüş?",
    };
  },
  turler: {
    sen() {
      const q = icSec(IC_SEN_SORU, 3);
      return { yon: "sen", anahtar: "sn-" + q.map(x => x[0]).join() + Math.random(), govde: "",
        parcalar: q.map(([s, c, re, tf]) => ({ s, cevap: c, ipucu: c.replace(/(Science|chess|Can|Arın|eleven|Friday|football|seven o'clock)/, "…"),
          d: y => { const w = icGenisle(y); if (re.test(w)) return { tur: "dogru" }; const m = tf(w); return { tur: "kalip", m: m || `Örnek: <b>${icE(c)}</b>` }; } })) };
    },
  },
  adim: { 2: ["sen"], 3: ["sen"] },
});

/* Konu sırası: kâğıttaki soru tipleri ile defterdeki konular iç içe (sınava 5 gün: önemli olan erken) */
const IC_SIRA = ["be", "zamir", "tablo", "ulke", "kim", "aan", "adlar", "havegot", "must", "this", "program", "sira", "spolumsuz", "spsoru", "profil", "sen"];
const icKonuBul = kod => icP().konular.find(k => k.kod === kod);

/* ================= İlerleme (kayıtlardan) ve yönlendirme ================= */
let IC_GECMIS_DIS = null;
function icGecmis() { const P = icP(); const g = IC_GECMIS_DIS || (muf.ders === P.oyun && muf.gecmis) || (typeof hz !== "undefined" && hz.gecmis[P.ders]); return (g && g.sorular) || {}; }
function icAnahtar(kod, adim) { return `ic:${kod}:${adim}`; }
function icDurum(kod) {
  const g = icGecmis(), s = a => g[icAnahtar(kod, a)] || { d: 0, y: 0, son: [] };
  const sonN = (x, n) => x.son.length >= n && x.son.slice(-n).every(v => v[0]);
  const s1 = s(1), s2 = s(2), s3 = s(3), s4 = s(4);
  let adim = 1;
  if (s1.d - s1.y >= 1) adim = 2;
  if (adim === 2 && (sonN(s2, 3) || sonN(s3, 2) || sonN(s4, 2))) adim = 3;
  if (adim === 3 && (sonN(s3, 4) || sonN(s4, 2))) adim = 4;
  const usta = adim === 4 && sonN(s4, 3);
  return { adim, usta, s2, s3, s4 };
}
function icOran(g, ders) {   // yazılı kartındaki çubuk için (Arın'a sayı gösterilmez)
  IC_GECMIS_DIS = g || null; const eski = IC.p; IC.p = IC_PROFIL[ders || "ingilizce"];
  try {
  return icP().sira.reduce((t, k) => { const d = icDurum(k); return t + (d.usta ? 4 : d.adim - 1); }, 0) / (icP().sira.length * 4);
  } finally { IC_GECMIS_DIS = null; IC.p = eski; }
}
function icSonraki() {
  IC.sayac++;
  const durum = icP().sira.map(k => [k, icDurum(k)]);
  const aktif = durum.find(([, d]) => d.adim < 4);
  const havuz = durum.filter(([, d]) => d.adim === 4);
  const zayif = havuz.filter(([, d]) => !d.usta);
  const sonYanlis = havuz.filter(([, d]) => d.s4.son.length && !d.s4.son[d.s4.son.length - 1][0]);
  let sec = null;
  // Karışık tekrar: her 3. soruda (ya da yeni konu kalmadıysa) tekrar havuzundan; son cevabı yanlış olan öne
  if (havuz.length && (!aktif || IC.sayac % 3 === 0)) {
    const aday = (sonYanlis.length ? sonYanlis : zayif.length ? zayif : havuz).filter(([k]) => k + ":4" !== IC.son);
    if (aday.length) sec = [icR(aday)[0], 4];
  }
  if (!sec && aktif) {
    const [k, d] = aktif;
    let adim = d.adim;
    // Kendin yaz'da üst üste iki yanlış → bir soru ipuçlu adıma geri dön
    if (adim === 3 && d.s3.son.length >= 2 && d.s3.son.slice(-2).every(v => !v[0]) && !IC.geri[k]) { adim = 2; IC.geri[k] = true; } else if (adim === 3) IC.geri[k] = false;
    sec = [k, adim];
  }
  if (!sec) sec = [icR(havuz)[0], 4];
  IC.son = sec[0] + ":" + sec[1];
  return sec;
}

/* ================= Ekranlar ================= */
function icKayit(konu, adim, dogru, soruMetni, cevap, tur) {
  const ctx = { gecmis: muf.gecmis, etiket: { konu: konu.ad, etkinlik: IC_ADIM[adim] } };
  oyunCevapKaydet({ id: icP().oyun, ders: icP().ders }, { beceri: "y1.ic." + konu.kod, beceri_adi: konu.ad, konu: konu.ad, etkinlik: IC_ADIM[adim],
    soru: icAnahtar(konu.kod, adim), cevap: String(cevap).slice(0, 300), dogru, bicim: tur, yazi: String(soruMetni).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 600) }, ctx);
}
function icCerceve(konu, adim, ic) {
  muf.ekran = "ing"; muf.unite = null;
  mufBaslik([DERSLER[icP().oyun].ad, konu.ad]);
  oyunIlerleme(0, 0);
  $("#oyun-alan").innerHTML = `<div class="ic">
    <div class="ic-ust"><span class="ic-konu">${konu.simge} ${icE(konu.ad)}</span>
      <span class="ic-adimlar">${[1, 2, 3, 4].map(a => `<span class="${a === adim ? "aktif" : a < adim ? "gecti" : ""}">${a < adim ? "✓" : a}. ${IC_ADIM[a]}</span>`).join("")}</span></div>
    ${ic}</div>`;
}
function icCalis() {
  if (IC.prova) return icProvaSonraki();
  const [kod, adim] = icSonraki(), konu = icKonuBul(kod);
  if (adim === 1) icKesfetEkrani(konu); else icSoruEkrani(konu, adim);
}
function icKesfetEkrani(konu) {
  const k = icUret(() => konu.kesfet());
  icGorulduSay(k.anahtar);
  icCerceve(konu, 1, `
    <h3 class="ic-baslik">1 · Keşfet <small>Örneklere dikkatle bak. Kuralı sen bulacaksın.</small></h3>
    <div class="ic-kart">${k.ornekler.map(o => `<div class="ic-ornek">${o}</div>`).join("")}</div>
    <div class="ic-kart"><b>${icE(k.soru)}</b>
      <div class="ic-secenekler">${icKaristir(k.secenekler).map(s => `<button class="ic-secenek" data-s="${icE(s)}">${icE(s)}</button>`).join("")}</div>
      <div class="ic-geri" id="ic-geri"></div></div>`);
  let ilk = true;
  $$("#oyun-alan .ic-secenek").forEach(b => b.onclick = () => {
    const g = $("#ic-geri");
    if (b.dataset.s === k.dogru) {
      b.classList.add("dogru"); $$("#oyun-alan .ic-secenek").forEach(x => x.disabled = true);
      icKayit(konu, 1, true, k.soru, b.dataset.s, ilk ? "kesfet" : "kesfet-ipucu");   // kural kartını görünce Keşfet tamam; ilk denemede bulup bulmadığı veliye
      g.className = "ic-geri dogru";
      g.innerHTML = `<b>${ilk ? "Buldun! 🧠" : "Doğru 🧠"}</b><div class="ic-kural">${konu.kural}</div><div class="ic-dugmeler"><button class="dugme ana" id="ic-devam">Devam ▶</button></div>`;
      $("#ic-devam").onclick = () => { sesCal("tik"); icCalis(); };
    } else {
      ilk = false; b.classList.add("yanlis"); b.disabled = true;
      g.className = "ic-geri yanlis"; g.innerHTML = `<b>Bir daha bak 🔍</b>${icE(k.ipucu)}`;
    }
  });
}
function icSoruEkrani(konu, adim, provaBilgi) {
  const turAd = provaBilgi ? provaBilgi.tur : icR(konu.adim[Math.min(adim, 3)] || konu.adim[3]);
  const s = icUret(() => konu.turler[turAd]());
  IC.sonSoru = s;
  const ipucuVar = adim === 2 && !provaBilgi, kuralVar = adim <= 3 && !provaBilgi;
  const baslik = provaBilgi ? `📝 Yazılı provası · ${provaBilgi.no}. soru <small>${icE(konu.ad)}</small>` :
    `${adim} · ${IC_ADIM[adim]} <small>${adim === 2 ? "Yazarak cevapla. Takılırsan ipucuna bak." : adim === 3 ? "Yazılıdaki gibi, ipucusuz." : "Karışık tekrar: sınavda da konular karışık gelir."}</small>`;
  const ic = `
    <h3 class="ic-baslik">${baslik}</h3>
    <div class="ic-kart" id="ic-soru">
      <div class="ic-yonerge"></div>
      ${s.govde ? `<div class="ic-govde">${s.govde}</div>` : ""}
      <div class="ic-anla"></div>
      <div class="ic-girisler kilitli" id="ic-giris">
        ${s.parcalar.map((p, i) => `<div class="ic-parca">${p.s ? `<div class="ic-parca-soru">${p.s}</div>` : ""}
          <input type="text" data-i="${i}" autocomplete="off" spellcheck="false" placeholder="${p.tek ? "Cevabını yaz…" : "Cümlenin tamamını yaz…"}">
          <div class="ic-geri" data-g="${i}"></div></div>`).join("")}
        ${icP().ozelHarf ? `<div class="ic-ozel-harf">${icP().ozelHarf.map(h => `<button type="button" class="dugme" data-harf="${h}">${h}</button>`).join("")}<span class="ic-ipucu">Almanca harfler (tıkla, imlecin olduğu yere yazılır)</span></div>` : ""}
        <div class="ic-dugmeler"><button class="dugme ana" id="ic-kontrol">Kontrol et</button>
          ${ipucuVar ? `<button class="dugme" id="ic-ipucu">💡 İpucu</button>` : ""}${kuralVar ? `<button class="dugme" id="ic-kural">📖 Kural</button>` : ""}</div>
        <div class="ic-geri" id="ic-sonuc"></div>
      </div></div>`;
  if (provaBilgi) { muf.ekran = "ing"; muf.unite = null; mufBaslik([DERSLER[icP().oyun].ad, "Yazılı provası"]); oyunIlerleme(provaBilgi.no - 1, provaBilgi.toplam); $("#oyun-alan").innerHTML = `<div class="ic">${ic}</div>`; }
  else icCerceve(konu, adim, ic);
  icGorulduSay(s.anahtar);
  const girdiler = $$("#ic-giris input");
  let sonOdak = null; girdiler.forEach(g => g.addEventListener("focus", () => sonOdak = g));
  $$("#ic-giris [data-harf]").forEach(b => { b.onmousedown = e => e.preventDefault(); b.onclick = () => { const g = sonOdak || girdiler[0]; if (g.readOnly) return;
    const a = g.selectionStart ?? g.value.length, z = g.selectionEnd ?? a; g.value = g.value.slice(0, a) + b.dataset.harf + g.value.slice(z); g.focus(); g.setSelectionRange(a + 1, a + 1); }; });
  icYonergeKur(s.yon, $("#ic-soru"), () => { $("#ic-giris").classList.remove("kilitli"); girdiler[0].focus(); });
  if ($("#ic-ipucu")) $("#ic-ipucu").onclick = () => s.parcalar.forEach((p, i) => { const g = $(`[data-g="${i}"]`); if (g.classList.contains("dogru")) return; g.className = "ic-geri uyari"; g.innerHTML = `<b>💡</b> ${icE(p.ipucu || "")}`; });
  if ($("#ic-kural")) $("#ic-kural").onclick = () => { const g = $("#ic-sonuc"); g.className = "ic-geri bilgi"; g.innerHTML = `<div class="ic-kural">${konu.kural}</div>`; };
  const onceki = icDurum(konu.kod);
  let bitti = false;
  const kontrol = () => {
    if (bitti) { sesCal("tik"); return icCalis(); }
    let hepsi = true;
    const sonuc = s.parcalar.map((p, i) => icDenetle(p, girdiler[i].value, konu));
    if (sonuc.some(r => r.tur === "bos")) { const i = sonuc.findIndex(r => r.tur === "bos"); girdiler[i].focus(); $("#ic-sonuc").className = "ic-geri uyari"; $("#ic-sonuc").textContent = "Bütün boşlukları doldur."; return; }
    sonuc.forEach((r, i) => {
      const g = $(`[data-g="${i}"]`), p = s.parcalar[i];
      if (r.tur === "dogru") { g.className = "ic-geri dogru"; g.innerHTML = `<b>Doğru ✅</b>${r.uyari && r.uyari.length ? ` <span class="ic-ipucu">Yazılıda puan kaybetme: ${r.uyari.join(", ")}.</span>` : ""}`; girdiler[i].classList.add("dogru"); }
      else { hepsi = false; g.className = "ic-geri yanlis"; g.innerHTML = `<b>Neden olmadı?</b> ${r.m || ""}${!/Doğrusu|<b>/.test(r.m || "") ? ` Doğrusu: <b>${icE(p.cevap || (p.b && p.b[0]) || "")}</b>` : ""}`; girdiler[i].classList.add("yanlis"); }
      girdiler[i].readOnly = true;
    });
    const yazi = $("#ic-soru").innerText.slice(0, 600);
    icKayit(konu, provaBilgi ? 4 : adim, hepsi, yazi, girdiler.map(x => x.value).join(" | "), turAd);
    if (provaBilgi) IC.prova.sonuc.push([konu, hepsi]);
    const sonraki = icDurum(konu.kod), g = $("#ic-sonuc");
    if (hepsi) { g.className = "ic-geri dogru"; g.innerHTML = icR(["Harika! 🎉", "Çok iyi! 👏", "Süper! ⭐", "Tam yazılıdaki gibi! 💪"]); }
    else { g.className = "ic-geri yanlis"; g.innerHTML = "Yanlışlarına bak. Bu tür bir soru birazdan <b>başka bir metin ve cümleyle</b> yine gelecek."; }
    if (!provaBilgi && sonraki.adim > onceki.adim) g.innerHTML += `<div class="ic-gecis">🎉 <b>${icE(konu.ad)}</b>: "${IC_ADIM[onceki.adim]}" tamam! ${sonraki.adim === 3 ? "Şimdi ipucusuz, kendin yazacaksın." : sonraki.adim === 4 ? "Bu konu artık karışık tekrarlarda gelecek." : ""}</div>`;
    if (!provaBilgi && sonraki.usta && !onceki.usta) g.innerHTML += `<div class="ic-gecis">🌟 <b>${icE(konu.ad)}</b> konusunu sağlamlaştırdın.</div>`;
    bitti = true; $("#ic-kontrol").textContent = "Sonraki ▶";
    if ($("#ic-ipucu")) $("#ic-ipucu").remove();
  };
  $("#ic-kontrol").onclick = kontrol;
  girdiler.forEach((inp, i) => inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); if (!bitti && girdiler[i + 1] && !girdiler[i + 1].value) girdiler[i + 1].focus(); else kontrol(); } });
}

/* ---------- Ana ekran: tek düğme, Arın seçmez ---------- */
function icAnaEkran(d) {
  IC.prova = null; IC.p = IC_PROFIL[d.yazili.ders] || IC_PROFIL.ingilizce;
  muf.ekran = "ing"; muf.unite = null;
  mufBaslik([d.ad]);
  oyunIlerleme(0, 0);
  const y = d.yazili, g = kalanGun(y.tarih);
  const [kod, adim] = (() => { const s = IC.sayac, so = IC.son; const r = icSonraki(); IC.sayac = s; IC.son = so; return r; })();
  const konu = icKonuBul(kod);
  $("#oyun-alan").innerHTML = `<div class="ic">
    <div class="muf-ust yazili-ust"><h3>${y.simge} ${icE(y.ad)} ${icE(y.yazili)}</h3>
      <p>${y.tarih ? `<b>${tarihGoster(y.tarih)}</b> · ${kalanYazi(g)}` : ""}</p></div>
    <div class="ic-basla">
      <button class="dugme ana ic-buyuk" id="ic-basla">▶ Çalışmaya ${icP().sira.some(k => icDurum(k).adim > 1) ? "devam et" : "başla"}</button>
      <p>Sıradaki: <b>${konu.simge} ${icE(konu.ad)}</b> · ${IC_ADIM[adim]}</p>
      <p class="ic-ipucu">Hangi konuya, nasıl çalışacağını ben seçerim. Sen yalnız soruları oku, anla ve yaz.</p>
      <button class="dugme" id="ic-prova">📝 Yazılı provası (kâğıttaki gibi, karışık)</button>
    </div>
    <h4 class="yazili-ara">Yazılının tamamı</h4>
    <div class="ic-kapsam">${icP().sira.map(k => { const kn = icKonuBul(k), du = icDurum(k);
      return `<div class="ic-kapsam-satir${k === kod ? " siradaki" : ""}"><span>${kn.simge}</span><b>${icE(kn.ad)}</b><small>${icE(kn.kaynak)}</small>
        <span class="ic-noktalar">${[1, 2, 3, 4].map(a => `<i class="${a < du.adim || du.usta ? "dolu" : a === du.adim ? "simdi" : ""}"></i>`).join("")}</span></div>`; }).join("")}</div>
  </div>`;
  $("#ic-basla").onclick = () => { sesCal("tik"); icCalis(); };
  $("#ic-prova").onclick = () => { sesCal("tik"); icProvaBaslat(); };
}

/* ---------- Yazılı provası: kâğıttaki sıra + defterdeki konulardan 4 soru; not yok ---------- */
const IC_PROVA_KAGIT = [["kim", "kim5"], ["program", "program5"], ["profil", "profil"], ["adlar", "kulupResim"], ["must", "metin"], ["sen", "sen"], ["tablo", "tablo5"], ["adlar", "kim"], ["profil", "okul"], ["adlar", "yerResim"]];
const IC_PROVA_DEFTER = ["be", "zamir", "ulke", "aan", "havegot", "this", "sira", "spolumsuz", "spsoru"];
function icProvaBaslat(ders) {
  if (ders) IC.p = IC_PROFIL[ders];
  const P = icP(), defter = icSec(P.provaDefter || [], P.provaDefterSayi || 4).map(k => [k, icR(icKonuBul(k).adim[3])]);
  IC.prova = { liste: P.provaKagit.concat(defter), i: 0, sonuc: [] };
  icProvaSonraki();
}
function icProvaSonraki() {
  const p = IC.prova;
  if (p.i >= p.liste.length) return icProvaSonu();
  const [kod, tur] = p.liste[p.i++];
  icSoruEkrani(icKonuBul(kod), 4, { tur, no: p.i, toplam: p.liste.length });
}
function icProvaSonu() {
  const p = IC.prova; IC.prova = null;
  const yanlis = p.sonuc.filter(x => !x[1]).map(x => x[0]).filter((k, i, a) => a.indexOf(k) === i);
  muf.ekran = "ing"; mufBaslik([DERSLER[icP().oyun].ad, "Yazılı provası"]); oyunIlerleme(0, 0);
  $("#oyun-alan").innerHTML = `<div class="ic"><div class="ic-kart ic-prova-sonu">
    <h3>📝 Prova bitti!</h3>
    ${yanlis.length ? `<p>Bu konularda tekrar yapacağız; çalışmaya devam edince önüne gelecekler:</p><ul>${yanlis.map(k => `<li>${k.simge} ${icE(k.ad)}</li>`).join("")}</ul>` : "<p>Bütün soruları doğru yaptın. 🌟</p>"}
    <div class="ic-dugmeler"><button class="dugme ana" id="ic-devam">▶ Çalışmaya devam</button><button class="dugme" id="ic-ana">☰ Yazılıya dön</button></div></div></div>`;
  $("#ic-devam").onclick = () => icCalis();
  $("#ic-ana").onclick = () => icAnaEkran(DERSLER[icP().oyun]);
}

IC_PROFIL.ingilizce = { ders: "ingilizce", oyun: "y1-ingilizce", konular: IC_KONULAR, sira: IC_SIRA, yon: IC_YON, soz: IC_SOZ, genisle: icGenisle,
  provaKagit: IC_PROVA_KAGIT, provaDefter: IC_PROVA_DEFTER, provaDefterSayi: 4 };

/* ÖğretmeniM — tam (kesirli) aritmetik: hesap makinesi ve cevap kontrolünün ortak çekirdeği.
   Sayılar BigInt pay/payda olarak tutulur; 0,1 + 0,2 tam olarak 0,3 çıkar, 2/3 kesir olarak kalır. */
"use strict";

const Kesir = (() => {
  const mutlak = x => (x < 0n ? -x : x);
  const ebob = (a, b) => { a = mutlak(a); b = mutlak(b); while (b) [a, b] = [b, a % b]; return a || 1n; };
  function yap(pay, payda = 1n) {
    if (payda === 0n) throw new Error("Sıfıra bölme yapılamaz");
    if (payda < 0n) { pay = -pay; payda = -payda; }
    const g = ebob(pay, payda);
    return { pay: pay / g, payda: payda / g };
  }
  // "12", "3,25", "3.25" → kesir
  function ondaliktan(metin) {
    const [tam, kesirli = ""] = metin.replace(",", ".").split(".");
    const basamak = 10n ** BigInt(kesirli.length);
    return yap(BigInt(tam || "0") * basamak + BigInt(kesirli || "0"), basamak);
  }
  const topla = (a, b) => yap(a.pay * b.payda + b.pay * a.payda, a.payda * b.payda);
  const cikar = (a, b) => yap(a.pay * b.payda - b.pay * a.payda, a.payda * b.payda);
  const carp = (a, b) => yap(a.pay * b.pay, a.payda * b.payda);
  const bol = (a, b) => { if (b.pay === 0n) throw new Error("Sıfıra bölme yapılamaz"); return yap(a.pay * b.payda, a.payda * b.pay); };
  const esit = (a, b) => a.pay === b.pay && a.payda === b.payda;
  const sayi = a => Number(a.pay) / Number(a.payda);
  const tamMi = a => a.payda === 1n;
  // Payda yalnız 2 ve 5'ten oluşuyorsa ondalık gösterim tam biter
  function sonluMu(a) { let d = a.payda; while (d % 2n === 0n) d /= 2n; while (d % 5n === 0n) d /= 5n; return d === 1n; }
  // Ekranda gösterim: tam ya da sonlu ondalıksa tam değer, değilse 10 basamağa yuvarlanmış
  function yaz(a, enFazla = 10) {
    const isaret = a.pay < 0n ? "-" : "";
    const p = mutlak(a.pay);
    const tam = p / a.payda;
    let kalan = p % a.payda;
    if (kalan === 0n) return isaret + tam.toString();
    let basamaklar = "";
    for (let i = 0; i < enFazla && kalan; i++) { kalan *= 10n; basamaklar += (kalan / a.payda).toString(); kalan %= a.payda; }
    if (kalan) {           // yuvarla
      const s = Number("0." + basamaklar + (kalan * 10n / a.payda).toString());
      const yuv = (Number(tam) + s).toFixed(enFazla).replace(/0+$/, "").replace(/\.$/, "");
      return isaret + yuv.replace(".", ",");
    }
    return isaret + tam.toString() + "," + basamaklar;
  }
  return { yap, ondaliktan, topla, cikar, carp, bol, esit, sayi, tamMi, sonluMu, yaz };
})();

/* ---------- İşlem çözümleyici ----------
   Desteklenen: + − × x * ÷ : /  parantez, ondalık (virgül ya da nokta), %  (yüzde: 20% = 20/100),
   "150'nin %20'si" kalıbı, işaretli sayılar. */
function islemiHazirla(metin) {
  let s = String(metin).trim();
  // "150'nin %20'si" / "150 nin % 20 si" → (150)×(20/100)
  const yuzdeKalip = s.match(/^(\d+(?:[.,]\d+)?)\s*'?\s*[a-zçğıöşü]*\s*%\s*(\d+(?:[.,]\d+)?)\s*'?\s*[a-zçğıöşü]*\s*$/i);
  if (yuzdeKalip) return `(${yuzdeKalip[1]})×(${yuzdeKalip[2]}%)`;
  // "%20" ön ek → 20%
  s = s.replace(/%\s*(\d+(?:[.,]\d+)?)/g, "$1%");
  return s;
}

function islemCoz(metin) {
  const s = islemiHazirla(metin);
  if (!s) throw new Error("İşlemi yaz");
  const jetonlar = [];
  for (let i = 0; i < s.length;) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    const sayi = s.slice(i).match(/^\d+(?:[.,]\d+)?/);
    if (sayi) { jetonlar.push({ t: "sayi", v: Kesir.ondaliktan(sayi[0]) }); i += sayi[0].length; continue; }
    if ("+-−–".includes(c)) { jetonlar.push({ t: "op", v: c === "+" ? "+" : "-" }); i++; continue; }
    if ("×x*·X".includes(c)) { jetonlar.push({ t: "op", v: "*" }); i++; continue; }
    if ("÷:/".includes(c)) { jetonlar.push({ t: "op", v: "/" }); i++; continue; }
    if (c === "%") { jetonlar.push({ t: "yuzde" }); i++; continue; }
    if (c === "(" || c === ")") { jetonlar.push({ t: c }); i++; continue; }
    throw new Error(`"${c}" işaretini anlayamadım`);
  }
  let k = 0;
  const bak = () => jetonlar[k];
  function ifade() {
    let sol = terim();
    while (bak() && bak().t === "op" && (bak().v === "+" || bak().v === "-")) {
      const op = jetonlar[k++].v, sag = terim();
      sol = op === "+" ? Kesir.topla(sol, sag) : Kesir.cikar(sol, sag);
    }
    return sol;
  }
  function terim() {
    let sol = carpan();
    for (;;) {
      const j = bak();
      if (j && j.t === "op" && (j.v === "*" || j.v === "/")) {
        k++;
        const sag = carpan();
        sol = j.v === "*" ? Kesir.carp(sol, sag) : Kesir.bol(sol, sag);
      } else if (j && (j.t === "(" || j.t === "sayi")) {
        sol = Kesir.carp(sol, carpan());      // 2(3+4) gibi gizli çarpma
      } else return sol;
    }
  }
  function carpan() {
    const j = jetonlar[k++];
    if (!j) throw new Error("İşlem yarım kalmış");
    let deger;
    if (j.t === "op" && j.v === "-") deger = Kesir.carp(Kesir.yap(-1n), carpan());
    else if (j.t === "op" && j.v === "+") deger = carpan();
    else if (j.t === "sayi") deger = j.v;
    else if (j.t === "(") {
      deger = ifade();
      if (!bak() || bak().t !== ")") throw new Error("Parantez kapanmamış");
      k++;
    } else throw new Error("İşlem sırası hatalı");
    while (bak() && bak().t === "yuzde") { k++; deger = Kesir.bol(deger, Kesir.yap(100n)); }
    return deger;
  }
  const sonuc = ifade();
  if (k < jetonlar.length) throw new Error(jetonlar[k].t === ")" ? "Fazladan parantez var" : "İşlem sırası hatalı");
  return sonuc;
}

/* ---------- Öğrencinin cevabını okuma ----------
   "85", "3,25", "5/6", "1 2/3" (tam sayılı kesir), "-4" */
function cevapCoz(metin) {
  const s = String(metin).trim().replace(/\s+/g, " ");
  if (!s) throw new Error("Cevabını yaz");
  const karma = s.match(/^(-?)(\d+) (\d+)\s*\/\s*(\d+)$/);
  if (karma) {
    const tam = Kesir.yap(BigInt(karma[2]));
    const k = Kesir.bol(Kesir.yap(BigInt(karma[3])), Kesir.yap(BigInt(karma[4])));
    const d = Kesir.topla(tam, k);
    return { deger: karma[1] ? Kesir.carp(d, Kesir.yap(-1n)) : d, bicim: "kesir", ham: s };
  }
  const kesir = s.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (kesir) return { deger: Kesir.bol(Kesir.yap(BigInt(kesir[1])), Kesir.yap(BigInt(kesir[2]))), bicim: "kesir", ham: s,
                      sadeMi: Kesir.yap(BigInt(kesir[1]), BigInt(kesir[2])).payda === BigInt(kesir[2]) };
  const ondalik = s.match(/^-?\d+(?:[.,](\d+))?$/);
  if (ondalik) {
    const eksi = s.startsWith("-");
    const d = Kesir.ondaliktan(s.replace("-", ""));
    return { deger: eksi ? Kesir.carp(d, Kesir.yap(-1n)) : d, bicim: "ondalik", basamak: (ondalik[1] || "").length, ham: s };
  }
  throw new Error("Cevabı sayı (örn. 12 ya da 3,5) ya da kesir (örn. 5/6) olarak yaz");
}

// Tamsayı bölme mi? (kalanlı bölme kutusunu göstermek için)
function kalanliBolmeMi(metin) {
  const m = String(metin).trim().match(/^(\d+)\s*[:÷/]\s*(\d+)$/);
  if (!m || BigInt(m[2]) === 0n) return null;
  const a = BigInt(m[1]), b = BigInt(m[2]);
  return a % b === 0n ? null : { bolum: a / b, kalan: a % b };
}

/* Cevabı kontrol eder; doğru cevabı ASLA döndürmez, yalnız sonucu ve ipucu cümlesini verir. */
function cevapKontrol(islemMetni, cevapMetni, kalanMetni = "") {
  const dogru = islemCoz(islemMetni);
  const kb = kalanliBolmeMi(islemMetni);
  if (kb && String(kalanMetni).trim() !== "") {
    const kalan = String(kalanMetni).trim();
    if (!/^\d+$/.test(kalan)) throw new Error("Kalanı tam sayı olarak yaz");
    const bolum = String(cevapMetni).trim();
    if (!/^\d+$/.test(bolum)) throw new Error("Kalanlı bölmede bölümü tam sayı olarak yaz");
    return { dogru: BigInt(bolum) === kb.bolum && BigInt(kalan) === kb.kalan };
  }
  const c = cevapCoz(cevapMetni);
  if (Kesir.esit(c.deger, dogru)) {
    const not = c.bicim === "kesir" && c.sadeMi === false ? "Cevabın doğru. İstersen kesri sadeleştirmeyi de dene." : "";
    return { dogru: true, not };
  }
  // Sonsuz ondalık (örn. 2/3 ≈ 0,67): en az 2 basamakla doğru yuvarlanmışsa kabul et
  if (c.bicim === "ondalik" && !Kesir.sonluMu(dogru) && c.basamak >= 2) {
    const kat = 10 ** c.basamak;
    if (Math.round(Kesir.sayi(dogru) * kat) === Math.round(Kesir.sayi(c.deger) * kat)) {
      return { dogru: true, not: "Yuvarlanmış cevabın doğru. Kesir olarak da yazmayı deneyebilirsin." };
    }
  }
  return { dogru: false };
}

if (typeof module !== "undefined") module.exports = { Kesir, islemCoz, cevapCoz, cevapKontrol, kalanliBolmeMi };

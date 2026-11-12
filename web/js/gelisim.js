/* ÖğretmeniM — Veli Gelişim ekranı (0.11)
   Mini oyunlar ve Cevap Kontrol kayıtlarından: desteklenmesi gereken beceriler, güçlü yanlar, ders ders beceri tablosu.
   gelisimHtml() saf bir işlevdir; Veli Paneli'ne de aynen kopyalanır (panel_kaynak.html içinde GELISIM_ORTAK bölümü). */
"use strict";

/* GELISIM_ORTAK_BAS */
const GELISIM_OYUN_ONERI = [
  ["mat.carpim", "Çarpım Kahramanı"], ["ck.", "Cevap Kontrol"],
  ["tr.noktalama", "Noktalama Avcısı"], ["tr.ses", "Ses Olayları Laboratuvarı"],
  ["fen.atik", "Geri Dönüşüm Ayıklama"], ["fen.hal", "Hâl Değişimi"],
  ["sos.medeniyet", "Medeniyetler Pazarı"],
  ["ing.kelime", "Word Match"], ["ing.yazim", "Spelling Bee"],
  ["din.esma", "Güzel İsimler"], ["din.kuran", "Kur'an'ı Tanıyorum"], ["din.cami", "Camiyi Tanıyalım"],
];
function gelisimOneri(kod) {
  const o = GELISIM_OYUN_ONERI.find(([on]) => String(kod).startsWith(on));
  return o ? o[1] : "";
}
function gelisimRenk(oran) {
  return oran == null ? "#64748B" : oran >= 85 ? "#22C55E" : oran >= 70 ? "#84CC16" : oran >= 50 ? "#F59E0B" : "#EF4444";
}
function gelisimCubuk(oran) {
  return `<span class="gl-cubuk" title="%${oran ?? "-"}"><i style="width:${oran || 0}%;background:${gelisimRenk(oran)}"></i></span>`;
}
function gelisimHtml(g, kacis) {
  const e = kacis;
  if (!g || !g.toplam) {
    return `<div class="gl-bos">Henüz kayıt yok. Öğrenci mini oyunları ya da Cevap Kontrol'ü kullandıkça burada hangi konularda
      desteğe ihtiyacı olduğu, hangi konularda güçlü olduğu görünecek.</div>`;
  }
  const gunler = Object.entries(g.gunler || {});
  const enCok = Math.max(1, ...gunler.map(([, v]) => v.deneme));
  const son7 = gunler.slice(-7).reduce((t, [, v]) => ({ d: t.d + v.deneme, dk: t.dk + (v.dakika || 0) }), { d: 0, dk: 0 });
  const tarihK = z => { const [y, a, gn] = z.split("-"); return `${+gn}.${+a}`; };
  const oneri = x => x.etkinlik || gelisimOneri(x.kod || "");
  const satir = x => `<li><span class="gl-ders">${e(x.ders)}</span><b>${e(x.beceri)}</b>
      <span class="gl-oran" style="color:${gelisimRenk(x.oran)}">%${x.oran}</span><small>${x.deneme} deneme</small>
      ${x.konu ? `<small class="gl-konu">Ünite ${e(x.konu)}</small>` : ""}
      ${oneri(x) ? `<em>→ Önerilen: ${e(oneri(x))}</em>` : ""}</li>`;
  const soruYazi = q => String(q).includes("|") ? String(q).slice(String(q).lastIndexOf("|") + 1) : String(q);
  let h = `<div class="gl-ozet">
      <div class="gl-kutu"><b>${son7.d}</b><span>soru (son 7 gün)</span></div>
      <div class="gl-kutu"><b>${son7.dk}</b><span>dakika (son 7 gün)</span></div>
      <div class="gl-gunler" title="Son 14 gün, günlük soru sayısı">${gunler.map(([z, v]) =>
        `<span class="gl-gun" title="${tarihK(z)}: ${v.deneme} soru, %${Math.round(100 * v.dogru / v.deneme)} doğru"><i style="height:${Math.max(6, Math.round(100 * v.deneme / enCok))}%"></i><small>${tarihK(z)}</small></span>`).join("")}</div>
    </div>
    <div class="gl-iki">
      <div class="gl-liste destek"><h4>🧭 Desteklenmesi gereken beceriler</h4>
        ${g.destek && g.destek.length ? `<ul>${g.destek.map(satir).join("")}</ul>`
          : `<p class="gl-not">Şu an belirgin bir eksik yok. (Ölçüt: son 30 günde en az ${g.esik.deneme} deneme ve %${g.esik.oran}'in altında doğruluk.)</p>`}
      </div>
      <div class="gl-liste guclu"><h4>💪 Güçlü yanları</h4>
        ${g.guclu && g.guclu.length ? `<ul>${g.guclu.map(satir).join("")}</ul>` : `<p class="gl-not">Yeterli kayıt birikince burada görünecek.</p>`}
      </div>
    </div>`;
  const SIRA = ["matematik", "turkce", "sosyal", "ingilizce", "almanca", "fen", "din", "bilisim"];
  const dersler = Object.entries(g.dersler).sort((a, b) => ((SIRA.indexOf(a[0]) + 1) || 99) - ((SIRA.indexOf(b[0]) + 1) || 99));
  h += dersler.map(([kod, d]) => `<details class="gl-ders-kutu"${dersler.length === 1 ? " open" : ""}>
      <summary><b>${e(d.ad)}</b> ${gelisimCubuk(d.oran)} <span class="gl-oran" style="color:${gelisimRenk(d.oran)}">%${d.oran}</span>
        <small>${d.deneme} soru · ${d.beceriler.length} beceri</small></summary>
      <table class="gl-tablo"><thead><tr><th>Beceri</th><th>Konu</th><th>Son 30 gün</th><th>Deneme</th><th>Eğilim</th></tr></thead><tbody>
        ${d.beceriler.map(b => `<tr><td>${e(b.ad)}</td><td>${e(b.konu || "")}</td>
          <td>${gelisimCubuk(b.oran30)} <span style="color:${gelisimRenk(b.oran30)}">${b.oran30 == null ? "—" : "%" + b.oran30}</span></td>
          <td>${b.d30}<small> / ${b.deneme}</small></td>
          <td>${{ yukari: "⬆️ gelişiyor", asagi: "⬇️ düşüşte", sabit: "➡️ sabit" }[b.egilim] || ""}</td></tr>`).join("")}
      </tbody></table>
      ${d.sorular.length ? `<div class="gl-sorular"><h5>En çok karıştırılan sorular</h5><ul>${d.sorular.map(s =>
        `<li><b>${e(soruYazi(s.soru))}</b> <small>${e(s.beceri)}</small> — ${s.yanlis} kez yanlış${s.cevaplar.length ? `; verdiği cevaplar: ${s.cevaplar.map(c => `<code>${e(c)}</code>`).join(", ")}` : ""}</li>`).join("")}</ul></div>` : ""}
    </details>`).join("");
  return h;
}
/* 0.24: Yazılılara hazırlık (veli). yz = motor yazili_ozeti(). "Hazır" = konudaki soruların en son cevabı doğru olanların oranı. */
function yaziliHazirlikHtml(yz, kacis) {
  const e = kacis;
  if (!yz || !yz.yazililar || !yz.yazililar.length) return "";
  const gunYazi = k => k == null ? "tarih belli değil" : k < 0 ? "yapıldı" : k === 0 ? "bugün" : k === 1 ? "yarın" : `${k} gün kaldı`;
  const tarihY = z => { if (!z) return ""; const [y, a, g] = z.split("-"); return `${+g}.${+a}.${y}`; };
  const yuzde = v => v == null ? "—" : `%${v}`;
  return `<div class="gl-yz"><h4 class="gl-yz-baslik">📝 Yazılılara hazırlık <small>Hazır = konudaki soruların son cevabı doğru olanlar · açık uçlu = yazdığı cevapta işaretlediği anahtar noktalar</small></h4>
    <div class="gl-yz-kartlar">${yz.yazililar.map(y => `<div class="gl-yz-kart">
      <b>${e(y.simge || "")} ${e(y.ad)}</b><small>${y.tarih ? `${tarihY(y.tarih)} · ` : ""}${gunYazi(y.kalan)}</small>
      <span>${gelisimCubuk(y.hazir)} <span class="gl-oran" style="color:${gelisimRenk(y.hazir)}">%${y.hazir}</span> hazır</span>
      <small>${y.deneme ? `${y.deneme} cevap` : "Henüz çalışmadı"}</small></div>`).join("")}</div>
    ${yz.yazililar.filter(y => y.deneme).map(y => `<details class="gl-ders-kutu">
      <summary><b>${e(y.simge || "")} ${e(y.ad)} ${e(y.yazili || "")}</b> ${gelisimCubuk(y.hazir)} <span class="gl-oran" style="color:${gelisimRenk(y.hazir)}">%${y.hazir}</span>
        <small>${e(y.bicim || "")}</small></summary>
      <table class="gl-tablo"><thead><tr><th>Öğrenme çıktısı</th><th>Yazılıda</th><th>Hazır</th><th>Doğruluk (30 gün)</th><th>Açık uçlu</th><th>Çalıştığı gün</th></tr></thead><tbody>
        ${y.ciktilar.map(c => `<tr><td><b>${e(c.kod)}</b> ${e(c.ad)}</td><td>${c.soru} soru</td>
          <td>${gelisimCubuk(c.hazir)} <span style="color:${gelisimRenk(c.deneme ? c.hazir : null)}">%${c.hazir}</span></td>
          <td>${yuzde(c.oran30)}<small> · ${c.deneme} cevap</small></td>
          <td>${c.acik.deneme ? `${yuzde(c.acik.ort)}<small> · ${c.acik.deneme} cevap</small>` : "—"}</td><td>${c.gun || "—"}</td></tr>
          ${c.acik.eksik.length || c.yanlis.length || c.acik.son.length ? `<tr class="gl-yz-ayrinti"><td colspan="6">
            ${c.acik.eksik.length ? `<div><b>Yazarken atladığı noktalar:</b> ${c.acik.eksik.map(x => `${e(x.metin)}${x.sayi > 1 ? ` <small>(${x.sayi} kez)</small>` : ""}`).join(" · ")}</div>` : ""}
            ${c.yanlis.length ? `<div><b>Yanlış yaptığı sorular:</b> ${c.yanlis.map(x => `${e(x.soru)}${x.sayi > 1 ? ` <small>(${x.sayi} kez)</small>` : ""}`).join(" · ")}</div>` : ""}
            ${c.acik.son.length ? `<div class="gl-yz-cevaplar"><b>Son yazdığı cevaplar:</b>${c.acik.son.map(x => `<blockquote><small>${e(x.soru)} — ${e(x.puan)} nokta</small>${x.yazi ? e(x.yazi) : "<i>(Bilmiyorum dedi)</i>"}</blockquote>`).join("")}</div>` : ""}
          </td></tr>` : ""}`).join("")}
      </tbody></table></details>`).join("")}</div>`;
}
/* 0.25: Kelime Defterim (veli). kz = motor kelime_ozeti(). Kutu 4–5 = öğrendi (art arda doğru cevaplar). */
function kelimeDefteriHtml(kz, kacis) {
  const e = kacis;
  if (!kz || !kz.defterler || !kz.defterler.length) return "";
  const MOD = { anlam: "anlamını bulma", kelime: "kelimeyi bulma", esles: "eşleştirme", yazim: "yazma", artikel: "artikel" };
  const durum = x => x.kutu >= 4 ? `<span style="color:#22C55E">✓ öğrendi</span>` : x.deneme ? `<span style="color:#F59E0B">çalışıyor</span>` : `<span class="gl-soluk">yeni</span>`;
  return `<div class="gl-yz"><h4 class="gl-yz-baslik">📚 Kelime Defterim <small>Öğrendi = son cevaplarının art arda en az 4'ü doğru · yanlışta kelime başa döner</small></h4>
    <div class="gl-yz-kartlar">${kz.defterler.map(d => `<div class="gl-yz-kart">
      <b>${e(d.simge || "")} ${e(d.ad)}</b><small>${d.kelime} kelime</small>
      <span>${gelisimCubuk(d.kelime ? Math.round(100 * d.ogrendi / d.kelime) : 0)} <b>${d.ogrendi}</b> öğrendi</span>
      <small>${d.calisiyor} çalışıyor · ${d.yeni} yeni${d.oran != null ? ` · doğruluk %${d.oran}` : ""}</small></div>`).join("")}</div>
    ${kz.defterler.filter(d => d.deneme).map(d => `<details class="gl-ders-kutu">
      <summary><b>${e(d.simge || "")} ${e(d.ad)}</b> ${gelisimCubuk(d.oran)} <span class="gl-oran" style="color:${gelisimRenk(d.oran)}">%${d.oran}</span>
        <small>${d.deneme} cevap · ${d.ogrendi}/${d.kelime} öğrendi</small></summary>
      ${d.zor.length ? `<div class="gl-sorular"><h5>Zorlandığı kelimeler</h5><ul>${d.zor.map(x => `<li><b>${e(x.kelime)}</b> = ${e(x.anlam)} — %${x.oran} (${x.deneme} cevap)${x.yanlis_cevap.length ? `; karıştırdığı: ${x.yanlis_cevap.map(c => `<code>${e(c)}</code>`).join(", ")}` : ""}</li>`).join("")}</ul></div>` : ""}
      <table class="gl-tablo"><thead><tr><th>Kelime</th><th>Anlamı</th><th>Grup</th><th>Durum</th><th>Doğruluk</th><th>Oyuna göre</th></tr></thead><tbody>
        ${d.kelimeler.slice().sort((a, b) => (b.deneme > 0) - (a.deneme > 0) || (a.oran ?? 101) - (b.oran ?? 101)).map(x => `<tr><td><b>${e(x.kelime)}</b></td><td>${e(x.anlam)}</td><td><small>${e(x.grup || "")}</small></td>
          <td>${durum(x)}</td><td>${x.oran == null ? "—" : `<span style="color:${gelisimRenk(x.oran)}">%${x.oran}</span><small> · ${x.deneme}</small>`}</td>
          <td><small>${Object.entries(x.modlar || {}).map(([m, v]) => `${MOD[m] || m} %${v}`).join(" · ")}</small></td></tr>`).join("")}
      </tbody></table></details>`).join("")}</div>`;
}
/* GELISIM_ORTAK_BIT */

async function gelisimCiz() {
  const kap = $("#gelisim");
  if (!kap || !veliAktif()) return;
  try {
    const [g, yz, kz] = await Promise.all([api("GET", "gelisim"), api("GET", "yazili").catch(() => null), api("GET", "kelime/ozet").catch(() => null)]);
    kap.innerHTML = yaziliHazirlikHtml(yz, esc) + kelimeDefteriHtml(kz, esc) + gelisimHtml(g, esc);
  } catch (hata) { kap.innerHTML = `<div class="gl-bos">Gelişim bilgisi alınamadı: ${esc(hata.message)}</div>`; }
}
function gelisimOlaylariniKur() {
  $("#gelisim-yenile").addEventListener("click", gelisimCiz);
}

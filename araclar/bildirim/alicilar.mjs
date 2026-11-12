/* Bildirim kuyruğundaki bir kaydın alıcılarını bulur ve ilişkiyi denetler. Saf işlev (veri erişimi dışarıdan verilir): test edilebilir.
   kayit: { kimden, hedef: { kisi } | { ogrenci_velileri }, tur: "mesaj" | "duyuru" }
   erisim: { kisi(id) → kişi|null, ogrencininVelileri(oid) → [kişi] }
   Kurallar:
   - Gönderen etkin olmalı; alıcılar etkin, gönderenle aynı ailede ve gönderen değil.
   - duyuru: yalnız yönetici gönderir; ailedeki herkese gidebilir.
   - mesaj, hedef kisi: veli/yönetici → kendi öğrencisi ya da aynı ailenin velisi; öğrenci → kendi velisi.
   - mesaj, hedef ogrenci_velileri: gönderen o öğrencinin kendisi ya da velisi olmalı; alıcı o öğrencinin velileri. */
const VELI = ["veli", "yonetici"];

export async function alicilariBul(kayit, erisim) {
  const gonderen = await erisim.kisi(kayit.kimden);
  if (!gonderen || !gonderen.aktif) return [];
  const uygun = a => a && a.aktif && a.id !== gonderen.id && a.aile && a.aile === gonderen.aile;
  const hedef = kayit.hedef || {};
  if (kayit.tur === "duyuru") {
    if (gonderen.rol !== "yonetici" || !hedef.kisi) return [];
    const a = await erisim.kisi(hedef.kisi);
    return uygun(a) ? [a] : [];
  }
  if (kayit.tur !== "mesaj") return [];
  if (hedef.kisi) {
    const a = await erisim.kisi(hedef.kisi);
    if (!uygun(a)) return [];
    if (VELI.includes(gonderen.rol)) {
      const kendiOgrencisi = a.rol === "ogrenci" && (gonderen.ogrenciler || []).includes(a.id);
      return kendiOgrencisi || VELI.includes(a.rol) ? [a] : [];
    }
    if (gonderen.rol === "ogrenci") return VELI.includes(a.rol) && (a.ogrenciler || []).includes(gonderen.id) ? [a] : [];
    return [];
  }
  if (hedef.ogrenci_velileri) {
    const oid = hedef.ogrenci_velileri;
    const yetkili = gonderen.id === oid || (VELI.includes(gonderen.rol) && (gonderen.ogrenciler || []).includes(oid));
    if (!yetkili) return [];
    return (await erisim.ogrencininVelileri(oid)).filter(a => uygun(a) && VELI.includes(a.rol));
  }
  return [];
}

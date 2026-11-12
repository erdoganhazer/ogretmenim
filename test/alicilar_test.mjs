/* Bildirim alıcılarının seçimi ve ilişki denetimi: node --test test/alicilar_test.mjs */
import { test } from "node:test";
import assert from "node:assert";
import { alicilariBul } from "../araclar/bildirim/alicilar.mjs";

const K = {
  hazer: { id: "hazer", rol: "yonetici", aktif: true, aile: "a1", ogrenciler: ["arin"] },
  anne: { id: "anne", rol: "veli", aktif: true, aile: "a1", ogrenciler: ["arin"] },
  arin: { id: "arin", rol: "ogrenci", aktif: true, aile: "a1", ogrenciler: [] },
  elif: { id: "elif", rol: "ogrenci", aktif: true, aile: "a1", ogrenciler: [] },
  eski: { id: "eski", rol: "veli", aktif: false, aile: "a1", ogrenciler: ["arin"] },
  yabanci: { id: "yabanci", rol: "veli", aktif: true, aile: "a2", ogrenciler: ["arin"] },
};
const erisim = { kisi: async id => K[id] || null, ogrencininVelileri: async oid => Object.values(K).filter(k => (k.ogrenciler || []).includes(oid)) };
const ids = async kayit => (await alicilariBul(kayit, erisim)).map(k => k.id).sort();

test("öğrencinin mesajı yalnız etkin ve aynı ailedeki velilerine gider", async () => {
  assert.deepStrictEqual(await ids({ kimden: "arin", tur: "mesaj", hedef: { ogrenci_velileri: "arin" } }), ["anne", "hazer"]);
});
test("veli öğrencisine ve öbür veliye yazar; başka öğrenciye ya da başka aileye yazamaz", async () => {
  assert.deepStrictEqual(await ids({ kimden: "anne", tur: "mesaj", hedef: { kisi: "arin" } }), ["arin"]);
  assert.deepStrictEqual(await ids({ kimden: "anne", tur: "mesaj", hedef: { kisi: "hazer" } }), ["hazer"]);
  assert.deepStrictEqual(await ids({ kimden: "anne", tur: "mesaj", hedef: { kisi: "elif" } }), []);
  assert.deepStrictEqual(await ids({ kimden: "anne", tur: "mesaj", hedef: { kisi: "yabanci" } }), []);
});
test("veli aile sohbetine yazınca gönderen hariç öbür velilere gider; ilgisiz kişi bu hedefi kullanamaz", async () => {
  assert.deepStrictEqual(await ids({ kimden: "anne", tur: "mesaj", hedef: { ogrenci_velileri: "arin" } }), ["hazer"]);
  assert.deepStrictEqual(await ids({ kimden: "elif", tur: "mesaj", hedef: { ogrenci_velileri: "arin" } }), []);
});
test("öğrenci başka öğrenciye ya da kendi velisi olmayan kişiye yazamaz", async () => {
  assert.deepStrictEqual(await ids({ kimden: "arin", tur: "mesaj", hedef: { kisi: "elif" } }), []);
  assert.deepStrictEqual(await ids({ kimden: "arin", tur: "mesaj", hedef: { kisi: "anne" } }), ["anne"]);
});
test("duyuru yalnız yöneticiden, ailedeki etkin kişiye", async () => {
  assert.deepStrictEqual(await ids({ kimden: "hazer", tur: "duyuru", hedef: { kisi: "elif" } }), ["elif"]);
  assert.deepStrictEqual(await ids({ kimden: "hazer", tur: "duyuru", hedef: { kisi: "eski" } }), []);
  assert.deepStrictEqual(await ids({ kimden: "hazer", tur: "duyuru", hedef: { kisi: "yabanci" } }), []);
  assert.deepStrictEqual(await ids({ kimden: "anne", tur: "duyuru", hedef: { kisi: "arin" } }), []);
});
test("kapalı ya da bilinmeyen gönderen hiçbir şey gönderemez", async () => {
  assert.deepStrictEqual(await ids({ kimden: "eski", tur: "mesaj", hedef: { kisi: "arin" } }), []);
  assert.deepStrictEqual(await ids({ kimden: "yok", tur: "mesaj", hedef: { kisi: "arin" } }), []);
});
test("ödev bitti bildirimi yalnız öğrencinin kendisinden, kendi velilerine", async () => {
  assert.deepStrictEqual(await ids({ kimden: "arin", tur: "odev", hedef: { ogrenci_velileri: "arin" } }), ["anne", "hazer"]);
  assert.deepStrictEqual(await ids({ kimden: "anne", tur: "odev", hedef: { ogrenci_velileri: "arin" } }), []);
  assert.deepStrictEqual(await ids({ kimden: "elif", tur: "odev", hedef: { ogrenci_velileri: "arin" } }), []);
});

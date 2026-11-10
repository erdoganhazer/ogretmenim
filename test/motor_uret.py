"""motor.py'yi (HTTP'siz) rastgele API dizileriyle çalıştırır; her adımın yanıtını ve sonraki veri durumunu yazar.
Kullanım: OGRETMENIM_VERI=<boş klasör> python3 motor_uret.py <çıktı.jsonl> <tohum> <senaryo> <adım>"""
import sys, os, json, random, types, copy
from datetime import datetime, timedelta, timezone
sys.path.insert(0, "/home/claude/ogretmenim")
os.chdir("/home/claude/ogretmenim")
import motor as M

cikti, tohum, senaryo, adim = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
r = random.Random(tohum)
SAAT = {"t": datetime(2026, 11, 2, 15, 0, 0)}
TZ = timezone(timedelta(hours=3))
SAYAC = {"n": 0}
def kimlik():
    SAYAC["n"] += 1
    return "%032x" % SAYAC["n"]
M.uuid = types.SimpleNamespace(uuid4=lambda: types.SimpleNamespace(hex=kimlik()))
M.simdi = lambda: SAAT["t"].replace(tzinfo=TZ).isoformat(timespec="seconds")
M.su_an = lambda: SAAT["t"]
M.time = types.SimpleNamespace(time=lambda: SAAT["t"].replace(tzinfo=TZ).timestamp())
GUNLUK = []
def gunluge_yaz(kaynak, metin, tur="bilgi", kim=None):
    if kaynak == "veli" and kim is None:
        kim = getattr(M._istek, "veli_adi", None)
    k = {"zaman": M.simdi(), "kaynak": kaynak, "tur": tur, "metin": metin}
    if kim:
        k["kim"] = kim
    GUNLUK.append(k)
M.gunluge_yaz = gunluge_yaz
M.gunlugu_oku = lambda sinir=300: list(reversed(GUNLUK[-sinir:]))
M.veri_kaydet = lambda: None
M.pin_var_mi = lambda: True
YAZILI = json.load(open("/home/claude/ogretmenim/web/hazirlik/yazili1.json"))
M.yazili_icerigi = lambda: YAZILI
VELI = {"id": "f" * 32, "ad": "Hazer"}

class F(M.Isleyici):
    def __init__(self, veli, path, govde):
        self.veli_, self.path, self.govde_, self.sonuc = veli, path, govde, None
    def _json(self, d, g): self.sonuc = (d, json.loads(json.dumps(g, ensure_ascii=False)))
    def _json_oku(self): return copy.deepcopy(self.govde_)
    def _veli(self):
        M._istek.veli_adi = VELI["ad"] if self.veli_ else None
        return VELI if self.veli_ else None

def cagir(yontem, yol, govde, veli):
    once = copy.deepcopy(M._veri)
    h = F(veli, "/api/" + yol, govde)
    try:
        h._api(yontem, yol.split("?")[0].strip("/").split("/"))
    except (ValueError, KeyError) as e:
        h.sonuc = (400, {"hata": str(e)})
    except Exception as e:
        h.sonuc = (500, {"hata": "Motor hatası: %s" % e})
    if h.sonuc[0] >= 400 and yontem != "GET":
        M._veri = once
    return h.sonuc

def durum():
    v = {k: x for k, x in M._veri.items() if k not in ("guvenlik", "esitleme")}
    try:
        al = [json.loads(s) for s in open(M.ISTATISTIK_DOSYASI, encoding="utf-8")]
    except OSError:
        al = []
    v = json.loads(json.dumps(dict(v, alistirmalar=al, gunluk=GUNLUK)))
    import hashlib
    kel = v["koleksiyonlar"]["kelimeler"]
    v["koleksiyonlar"]["kelimeler"] = {"sayi": len(kel), "ozet": hashlib.sha1(json.dumps(kel, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()}
    return v

def idler(kol, kaynak=None):
    return [k["id"] for k in M._veri["koleksiyonlar"][kol] if not k.get("silindi") and (kaynak is None or k.get("kaynak") == kaynak)]
def sec(l, bos="0" * 32):
    return r.choice(l) if l and r.random() < .92 else bos
def tarih(f=0):
    return (SAAT["t"].date() + timedelta(days=r.randint(-3, 12) + f)).isoformat()
KAYNAK = ["MEB Kitabı", "Defter", "Test Kitabı", "Fasikül"]
def kaynaklar():
    return [{"ad": r.choice(KAYNAK + ["", "  çok   boşluklu  "]), "sayfa": r.choice(["12-14", "3 sayfa", "5", "1-3, 7", "", "20-25"])} for _ in range(r.randint(0, 3))]
def rastgele_deger():
    return r.choice([None, "", "abc", 0, 1, -5, 7.6, True, "12", [], {}])

def islem():
    ders, odev = idler("dersler"), idler("odevler")
    t = r.random()
    v = r.random() < .5
    if t < .14:
        g = {"ders_id": sec(ders, ""), "teslim": tarih(), "baslik": r.choice(["", "Sayfa çöz", "Okuma"]), "kaynaklar": kaynaklar(),
             "sure": r.choice([None, "", 20, "35", 0, 700, "x", 12.5]), "bitti": r.random() < .1}
        if r.random() < .2: g["en_erken"] = r.choice(["", tarih(), "dün"])
        if r.random() < .1: g["teslim"] = "11.11.2026"
        return "POST", "k/odevler", g, v
    if t < .22 and odev:
        g = r.choice([{"bitti": r.random() < .7, "bitti_zaman": M.simdi()}, {"baslik": "Yeni başlık"}, {"kaynaklar": kaynaklar()}, {"bitti": True, "puan": 50}])
        return "PUT", "k/odevler/" + sec(odev), g, v
    if t < .25 and odev:
        return "DELETE", "k/odevler/" + sec(odev), None, v
    if t < .31:
        g = {"tur": r.choice(["sinav", "etut", "etkinlik", "x"]), "tarih": tarih(), "ders_id": sec(ders, ""), "sinav_turu": r.choice(["yazili", "quiz", "zz"]),
             "baslik": "Deneme", "bas": r.choice(["", "09:30", "25:00"])}
        if r.random() < .5: g["puan"] = r.choice([None, 85, 99.5, 101, "90"])
        return "POST", "k/etkinlikler", g, v
    if t < .34 and idler("etkinlikler"):
        return "PUT", "k/etkinlikler/" + sec(idler("etkinlikler")), {"puan": r.choice([None, 40, 72.5, 100])}, v
    if t < .37:
        return "POST", "k/mesajlar", {"metin": r.choice(["", "Merhaba", "  Kitap al  "]), "tur": r.choice(["istek", "mesaj"])}, v
    if t < .39 and idler("mesajlar"):
        return "PUT", "k/mesajlar/" + sec(idler("mesajlar")), {"okundu": True, "tamam": r.random() < .5, "metin": "x"}, v
    if t < .41:
        return "POST", "k/cep_notlari", {"metin": r.choice(["not", ""])}, v
    if t < .43:
        return "PUT", "k/dersler/" + sec(ders), r.choice([{"kaynaklar": [r.choice(KAYNAK), "defter", "DEFTER", " a  b "]}, {"ad": "Yeni"}]), v
    if t < .45:
        d = sec(ders)
        kay = (next((x for x in M._veri["koleksiyonlar"]["dersler"] if x["id"] == d), {}).get("kaynaklar") or [""])
        return "POST", "ders_kaynak_sil", {"ders_id": d, "ad": r.choice(kay + ["yok"])}, v
    if t < .47:
        return "POST", "k/kelime_defterleri", {"ad": r.choice(["", "Hayvanlar"]), "dil": r.choice(["en", "xx"]), "renk": r.choice(["#123456", "kırmızı"]), "sira": r.choice([1, True, "2"])}, v
    if t < .50:
        df = idler("kelime_defterleri")
        if r.random() < .5:
            return "POST", "k/kelimeler", {"defter_id": sec(df), "kelime": r.choice(["cat", "", "Hund"]), "anlam": r.choice(["kedi", "köpek", ""]), "artikel": r.choice(["der", "x"])}, v
        return "POST", "kelime/toplu", {"defter_id": sec(df), "kelimeler": [{"kelime": r.choice(["cat", "dog", "Bird", ""]), "anlam": r.choice(["kedi", "it", "kuş"]), "emoji": "🐱"} for _ in range(r.randint(0, 4))]}, v
    if t < .70:
        tur = r.choice(["bitti", "bitti", "yarim", "zor", "kaynaklar", "simdi", "geri_al", "sira", "sabit", "degerlendirme", "ozel_gun", "xx"])
        g = {"tur": tur}
        if tur in ("bitti", "yarim", "zor", "kaynaklar", "simdi", "geri_al"):
            g["odev_id"] = sec(odev, "")
        if tur in ("bitti", "yarim", "zor"):
            g.update(birim_bas=r.randint(0, 3), birim_bit=r.choice([r.randint(0, 8), 99, "4", None]), dk_plan=r.randint(0, 50), dk_gercek=r.randint(0, 80),
                     yer=r.choice(["ev", "okul", "bekleme", "diger", "uzay"]), **({"not": r.choice(["çok yorgunum", ""])} if r.random() < .5 else {}))
            if r.random() < .3: g["birim_plan_bit"] = r.randint(1, 9)
        if tur == "kaynaklar":
            g["kaynaklar"] = [{"i": i, "durum": r.choice(["tam", "kismi", "yok"]), "kac": r.randint(0, 4)} for i in range(r.randint(0, 3))]
            g.update(dk_plan=10, dk_gercek=12)
        if tur == "simdi":
            g["planli"] = r.choice([True, False, "true"])
        if tur == "sira":
            g["sira"] = r.sample(odev, min(len(odev), 3)) + (["kotu"] if r.random() < .3 else [])
            g["tarih"] = tarih()
        if tur == "sabit":
            g.update(id=r.choice(["kitap", "spor"]), bitti=r.random() < .6)
        if tur == "degerlendirme":
            g.update(deger=r.choice(["kolay", "iyi", "zor", "süper"]), **({"not": "uzun gün"} if r.random() < .5 else {}))
        if tur == "ozel_gun":
            g.update(tarih=r.choice([tarih(), "bozuk"]), dk=r.choice([0, 45, "60", 700, None]), sil=r.random() < .2, baslangic=r.choice(["", "16:00", "x"]), **({"not": " misafir "} if r.random() < .5 else {}))
        return "POST", "plan/islem", g, v
    if t < .73:
        g = r.choice([{"butce": {"0": r.choice([30, 400, "45"]), "6": 0, "9": 5}}, {"arin_sira": r.random() < .5}, {"blok_dk": r.choice([5, 25, "30"])},
                      {"sabitler": [{"ad": "Kitap okuma", "dk": 20, "gunler": [0, 1, "2", 9], "id": "Kitap!"}, {"ad": ""}]}, {"sabit_saat": r.choice(["17:00", "5pm"])}, {"baslangic_tur": r.choice(["okul", "x"])}])
        return "PUT", "plan/ayarlar", r.choice([g, {"ayarlar": g}]), v
    if t < .75:
        return "PUT", r.choice(["profil", "ayarlar"]), r.choice([{"ogrenci_adi": "Arın"}, {"aktif_sinif": r.choice([5, 6, True, "5"])}, {"cevap_kontrol": False}, {"yok": 1}]), v
    if t < .85:
        beceri = r.choice(["", "m.kesir", "t.esanlam", "y1.FB.5.1.1", "y1.T.O.5.2"])
        g = {"arac": r.choice(["carpim", "cevap_kontrol", "oyun"]), "tur": r.choice(["", "toplama", "kesirler"]), "soru": r.choice(["3x4", "7x8", "a|b", "e1|Nedir? [c1]", "12"]),
             "dogru": r.random() < .6, "cevap": r.choice(["12", "2/3", "0/1"]), "oyun": r.choice(["", "carpim", "kesir"]), "ders": r.choice(["matematik", "turkce", ""]),
             "beceri": beceri, "beceri_adi": "Beceri", "etkinlik": r.choice(["", "Kesir Avı", "Karışık Tekrar"]), "sure": r.choice([3.25, 7, "x", 200.05]),
             "bicim": r.choice(["acik", "secmeli", ""]), "eksik": r.choice(["", "0,1", "5"])}
        if r.random() < .3: g["kelime"] = sec([k["id"] for k in M._veri["koleksiyonlar"]["kelimeler"][:30]])
        return "POST", "alistirma", g, v
    if t < .97:
        yol = r.choice(["plan", "plan", "rapor?donem=hafta", "rapor?donem=ay", "rapor?donem=donem", "rapor?donem=yil", "gelisim", "istatistik", "yazili", "kelime", "kelime/ozet",
                        "oyun/carpim/gecmis", "oyun/kesir/gecmis", "oyun/Kötü/gecmis", "alistirma/agirlik", "gunluk", "veri", "ders_programi", "k/odevler", "k/yok"])
        return "GET", yol, None, v
    if t < .985:
        return "PUT", "ders_programi", {"saatler": [{"bas": "08:30", "bit": "09:10"}, {"bas": "09:20", "bit": "10:00"}, {"bas": "10:10", "bit": r.choice(["10:50", "10:00"])}],
                                        "hucreler": {"%d-%d" % (g, s): sec(ders) for g in range(1, 6) for s in range(3)}}, v
    return "POST", "sinif/gec", {}, v

with open(cikti, "w") as out:
    for sn in range(senaryo):
        SAYAC["n"] = 0
        GUNLUK.clear()
        M._istek.veli_adi = None
        SAAT["t"] = datetime(2026, 9, 7, 15, 0) + timedelta(days=r.randint(0, 120), minutes=r.randint(0, 400))
        M.ISTATISTIK_DOSYASI = os.path.join(os.environ["OGRETMENIM_VERI"], "al-%d.jsonl" % sn)
        M._veri = copy.deepcopy(M.VARSAYILAN_VERI)
        bas = json.loads(json.dumps(M._veri))
        bas_saat = M.simdi()
        # veri_yukle'deki tohumlar (program/profil dosyası yok)
        v = M._veri
        for sira, (ad, kisa, renk) in enumerate(M.HAZIR_DERSLER):
            v["koleksiyonlar"]["dersler"].append(M.yeni_kayit({"ad": ad, "kisa": kisa, "renk": renk, "sira": sira}, "ogrenci"))
        v["tohum"].update(dersler=True, ders_kaynaklari=True, program=True, profil=True)
        for d in v["koleksiyonlar"]["dersler"]:
            if not isinstance(d.get("sinif"), int):
                d["sinif"] = v["ayarlar"].get("aktif_sinif", 5)
        for sira, (ad, adres, simge) in enumerate(M.HAZIR_BAGLANTILAR):
            v["koleksiyonlar"]["baglantilar"].append(M.yeni_kayit({"ad": ad, "adres": adres, "simge": simge, "sira": sira}, "veli"))
        v["tohum"]["baglantilar"] = True
        M._guvenli(M.yazili_sinavlarini_ekle); M._guvenli(M.kelime_defterlerini_tohumla); M._guvenli(M.odev_listelerini_ekle)
        out.write(json.dumps({"yeni": True, "veri": bas, "saat": bas_saat, "durum": durum()}, ensure_ascii=False) + "\n")
        for _ in range(adim):
            if r.random() < .25:
                SAAT["t"] += timedelta(minutes=r.choice([5, 40, 300, 1440, 2880, 10080]))
            y, yol, g, veli = islem()
            d, cevap = cagir(y, yol, g, veli)
            out.write(json.dumps({"saat": M.simdi(), "yontem": y, "yol": yol, "govde": g, "veli": veli, "durum_kodu": d, "cevap": cevap, "durum": durum()}, ensure_ascii=False) + "\n")

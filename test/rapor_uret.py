import sys, json, random
from datetime import date, timedelta, datetime
sys.path.insert(0, "/home/claude/ogretmenim")
import types
_src=open('/home/claude/ogretmenim/rapor.py').read().replace('"isteksizlik":', '"isteksiz":')
R=types.ModuleType('rapor'); exec(compile(_src,'rapor.py','exec'), R.__dict__)
r = random.Random(int(sys.argv[2])); out = open(sys.argv[1], "w")
NOTLAR = ["", "çok yorgunum", "anlamadım bu konuyu", "kitabı okulda kaldı", "misafir geldi", "canım istemedi", "sonra yaparım", "x"]
def hx(): return "%032x" % r.getrandbits(128)
for n in range(int(sys.argv[3])):
    bugun = date(2026, 11, 1) + timedelta(days=r.randint(0, 60))
    dersler = {hx(): r.choice(["Matematik", "Türkçe", "Fen Bilimleri", "İngilizce", "Sosyal Bilgiler", "Din Kültürü"]) for _ in range(r.randint(1, 6))}
    dids = list(dersler) + [None]
    odevler = []
    for _ in range(r.randint(0, 25)):
        teslim = bugun - timedelta(days=r.randint(-5, 40))
        o = {"id": hx(), "ders_id": r.choice(dids), "teslim": teslim.isoformat(), "bitti": r.random() < .6, "sure": r.choice([None, 20, 40]),
             "kaynaklar": [{"ad": r.choice(["MEB", "Defter", ""]), "sayfa": r.choice(["", "12-14", "3 sayfa"])}] if r.random() < .7 else [],
             "silindi": r.random() < .05}
        if o["bitti"]: o["bitti_zaman"] = (teslim - timedelta(days=r.randint(-2, 6))).isoformat() + "T%02d:10:00+03:00" % r.randint(8, 22)
        odevler.append(o)
    calisma = []
    for _ in range(r.randint(0, 40)):
        if not odevler: break
        o = r.choice(odevler); tar = bugun - timedelta(days=r.randint(0, 35))
        c = {"odev_id": o["id"], "tarih": tar.isoformat(), "durum": r.choice(["bitti", "bitti", "yarim", "zor"]), "dk_plan": r.randint(5, 40),
             "zaman": "%sT%02d:%02d:00+03:00" % (tar.isoformat(), r.randint(10, 23), r.randint(0, 59)), "not": r.choice(NOTLAR)}
        if r.random() < .8: c["dk_gercek"] = r.randint(3, 70)
        if r.random() < .3: c["yer"] = r.choice(["ev", "okul", "bekleme"])
        calisma.append(c)
    secimler = [{"tarih": (bugun - timedelta(days=r.randint(0, 20))).isoformat(), "odev_id": r.choice(odevler)["id"]} for _ in range(r.randint(0, 6))] if odevler else []
    gunler = {}
    for _ in range(r.randint(0, 20)):
        d = (bugun - timedelta(days=r.randint(0, 30))).isoformat()
        gunler[d] = {"planlanan": r.choice([0, 30, 60, 75])}
        if odevler and r.random() < .6: gunler[d]["plan_odevler"] = [o["id"] for o in r.sample(odevler, min(3, len(odevler)))]
        if r.random() < .4: gunler[d]["degerlendirme"] = r.choice([{"deger": "kolay"}, {"deger": "zor"}, "iyi", {"deger": "iyi", "not": "x"}])
    sinavlar = [{"id": hx(), "tarih": (bugun - timedelta(days=r.randint(0, 40))).isoformat(), "ders_id": r.choice(dids), "puan": r.choice([None, 45, 72, 90, 100, 65.0]),
                 "aciklama": r.choice(["", "Kesirler ve ondalık gösterim"])} for _ in range(r.randint(0, 5))]
    gelisim = {"destek": [{"ders": "Matematik", "beceri": "Kesirler", "oran": 55, "deneme": 12, "konu": r.choice([None, 2]), "etkinlik": r.choice(["", "Kesir Avı"])}] if r.random() < .5 else [],
               "guclu": [{"ders": "Türkçe", "beceri": "Eş anlam", "oran": 92, "deneme": 20}] if r.random() < .5 else []}
    saatler = [{"bas": "08:30", "bit": "09:10"}] * 6
    program = {"saatler": saatler, "hucreler": {"%d-0" % g: "x" for g in range(1, 6) if r.random() < .9}}
    donem = r.choice(["hafta", "ay", "donem"])
    bas = bugun - timedelta(days={"hafta": bugun.weekday(), "ay": 27, "donem": 60}[donem])
    girdi = dict(odevler=odevler, calisma=calisma, secimler=secimler, gunler=gunler, sinavlar=sinavlar, dersler=dersler, gelisim=gelisim,
                 program=program, bas=bas.isoformat(), bit=bugun.isoformat(), ad="Arın", bugun=bugun.isoformat())
    try:
        c = R.rapor_hazirla(**girdi); c.pop("olusturma")
        o2 = R.rapor_hazirla(**dict(girdi, bas=(bas - timedelta(days=28)).isoformat(), bit=(bas - timedelta(days=1)).isoformat()))
        k = R.karsilastir(c, o2)
    except Exception as e:
        c, k, o2 = {"HATA": repr(e)}, None, None
    out.write(json.dumps({"girdi": girdi, "cikti": c, "kiyas": k}, ensure_ascii=False) + "\n")

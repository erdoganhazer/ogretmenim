# Planlayıcı karşılaştırma verisi: rastgele senaryolar → Python plan_hesapla çıktısı (JSONL)
import sys, json, random
from datetime import date, timedelta
sys.path.insert(0, "/home/claude/ogretmenim")
import planlayici as P
r = random.Random(int(sys.argv[2]) if len(sys.argv) > 2 else 1)
SAYFA = ["15-24", "s. 3, 5, 7", "2 kitap", "10 soru", "", "Sayfa 15 ile 24 arası (2 etkinlik/ 29 soru)", "39-56", "3 sayfa", "7 çalışma kâğıdı",
         "12 ile 14", "Üçgen çeşitleri", "45 (45 dahil) 46", "100-110, 120", "1 test", "4 okuma", "s.88"]
KAYNAK = ["MEB Kitabı", "Akıllı Defter", "Soru Bankası", "", "Çalışma kâğıdı", "Defter"]
def hx(): return "%032x" % r.getrandbits(128)
out = open(sys.argv[1], "w")
for n in range(int(sys.argv[3]) if len(sys.argv) > 3 else 300):
    bugun = date(2026, 11, 1) + timedelta(days=r.randint(0, 40))
    dersler = [hx() for _ in range(6)]
    saatler = [{"bas": "%02d:%02d" % (8 + i, 30), "bit": "%02d:%02d" % (9 + i, 10)} for i in range(r.randint(0, 8))]
    hucreler = {"%d-%d" % (g, i): r.choice(dersler) for g in range(1, 6) for i in range(len(saatler)) if r.random() < .8}
    program = {"saatler": saatler, "hucreler": hucreler}
    odevler = []
    for _ in range(r.randint(0, 9)):
        ky = [{"ad": r.choice(KAYNAK), "sayfa": r.choice(SAYFA)} for _ in range(r.randint(0, 3))]
        o = {"id": hx(), "ders_id": r.choice(dersler), "baslik": r.choice(["", "Ödev", "Yazılı hazırlık"]), "kaynaklar": ky,
             "teslim": (bugun + timedelta(days=r.randint(-3, 25))).isoformat(), "sure": r.choice([None, 10, 25, 40, 60, 90, 0]),
             "yay": r.random() < .2, "bitti": r.random() < .1}
        if r.random() < .2: o["en_erken"] = (bugun + timedelta(days=r.randint(-2, 5))).isoformat()
        odevler.append(o)
    etk = [{"id": hx(), "tarih": (bugun + timedelta(days=r.randint(0, 8))).isoformat(), "bas": "%02d:%02d" % (r.randint(14, 19), r.choice([0, 30])),
            "bit": "%02d:%02d" % (r.randint(19, 20), r.choice([0, 30])), "tur": r.choice(["etut", "sinav", "etkinlik"]), "baslik": "x", "ders_id": r.choice(dersler)}
           for _ in range(r.randint(0, 4))]
    calisma = []
    for o in r.sample(odevler, min(len(odevler), r.randint(0, 3))):
        calisma.append({"odev_id": o["id"], "tarih": (bugun - timedelta(days=r.randint(0, 2))).isoformat(), "birim_bit": r.randint(0, 6),
                        "dk_plan": r.randint(5, 30), "durum": r.choice(["bitti", "yarim", "zor"])})
    ozel = {(bugun + timedelta(days=r.randint(0, 6))).isoformat(): r.choice([{"dk": 30}, {"dk": 0}, {"baslangic": "18:00"}, {}]) for _ in range(r.randint(0, 2))}
    ayarlar = r.choice([{}, {"tampon_gun": 0}, {"baslangic_tur": "sabit", "blok_dk": 20}, {"butce": {"1": 45}}])
    sira = {bugun.isoformat(): [o["id"] for o in r.sample(odevler, min(2, len(odevler)))]} if odevler and r.random() < .3 else {}
    secili = r.choice(odevler)["id"] if odevler and r.random() < .3 else None
    simdi_dk = r.randint(6 * 60, 22 * 60)
    girdi = dict(odevler=odevler, program=program, etkinlikler=etk, ayarlar=ayarlar, ozel_gunler=ozel, calisma=calisma, sira=sira,
                 bugun=bugun.isoformat(), simdi_dk=simdi_dk, dersler=dersler, secili=secili)
    try:
        c = P.plan_hesapla(odevler, program, etk, ayarlar, ozel, calisma, sira, bugun, simdi_dk, dersler, secili)
    except Exception as e:
        c = {"HATA": str(e)}
    out.write(json.dumps({"girdi": girdi, "cikti": c}, ensure_ascii=False, default=str) + "\n")

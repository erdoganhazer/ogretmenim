"""Yayın öncesi damgalama: sürüm (commit kısa kimliği) ve yayın zamanı.
- web/sw.js: sürüm + önbelleğe alınacak dosya listesi (her yayın yeni sürüm → yüklü uygulamalar kendiliğinden güncellenir)
- web/js/surum.js: çalışan uygulamanın sürümü (önbelleğe girer; cihazda hangi sürümün çalıştığını söyler)
- web/surum.json: yayındaki en son sürüm (önbelleğe girmez; "güncel mi?" denetimi bunu okur)
Kullanım: python3 araclar/sw_damgala.py web <surum> [<ISO yayın zamanı>]"""
import json, os, sys
from datetime import datetime, timezone

kok, surum = sys.argv[1], sys.argv[2]
tarih = sys.argv[3] if len(sys.argv) > 3 else datetime.now(timezone.utc).isoformat(timespec="seconds")
bilgi = {"surum": surum, "tarih": tarih}

open(os.path.join(kok, "surum.json"), "w", encoding="utf-8").write(json.dumps(bilgi) + "\n")
open(os.path.join(kok, "js", "surum.js"), "w", encoding="utf-8").write(
    "/* Yayında araclar/sw_damgala.py yazar; elle değiştirme. */\nconst UYGULAMA_SURUMU = " + json.dumps(bilgi) + ";\n")

atla = {"sw.js", "surum.json"}
dosyalar = []
for klasor, _, adlar in os.walk(kok):
    for ad in adlar:
        yol = os.path.relpath(os.path.join(klasor, ad), kok).replace(os.sep, "/")
        if yol in atla or ad.endswith(".md") or ad.startswith("."):
            continue
        dosyalar.append(yol)
dosyalar.sort()
sw = os.path.join(kok, "sw.js")
metin = open(sw, encoding="utf-8").read()
assert '"__SURUM__"' in metin and '"__DOSYALAR__"' in metin, "sw.js yer tutucuları bulunamadı"
metin = metin.replace('"__SURUM__"', json.dumps(surum)).replace('"__DOSYALAR__"', json.dumps(dosyalar, ensure_ascii=False))
open(sw, "w", encoding="utf-8").write(metin)
print(f"damgalandı: sürüm {surum} ({tarih}), {len(dosyalar)} dosya önbellekte")

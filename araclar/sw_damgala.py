"""Yayın öncesi web/sw.js'yi damgalar: sürüm (commit kısa kimliği) ve önbelleğe alınacak dosya listesi.
Kullanım: python3 araclar/sw_damgala.py web <surum>"""
import json, os, sys

kok, surum = sys.argv[1], sys.argv[2]
atla = {"sw.js"}
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
print(f"sw.js damgalandı: sürüm {surum}, {len(dosyalar)} dosya")

"""kelime_tohum.py, odev_tohum.py ve motor.py hazır listelerini web/js/motor/tohum_veri.js'e aktarır."""
import json, sys
sys.path.insert(0, "/home/claude/ogretmenim")
import kelime_tohum as k, odev_tohum as o, motor
d = {"HAZIR_DEFTERLER": k.HAZIR_DEFTERLER, "HAZIR_EKLER": getattr(k, "HAZIR_EKLER", []), "ODEV_LISTELERI": o.ODEV_LISTELERI,
     "HAZIR_DERSLER": motor.HAZIR_DERSLER, "HAZIR_BAGLANTILAR": motor.HAZIR_BAGLANTILAR}
s = json.dumps(d, ensure_ascii=False, separators=(",", ":"))
open("web/js/motor/tohum_veri.js", "w").write("/* kelime_tohum.py, odev_tohum.py ve motor.py hazır listelerinden üretildi (test/tohum_aktar.py) */\nconst TOHUM = " + s + ";\nif (typeof module !== \"undefined\") module.exports = TOHUM;\n")

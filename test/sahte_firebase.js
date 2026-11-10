/* Testler için bellekte çalışan sahte Firebase (yalnız ÖğretmeniM'in kullandığı işlevler; kurallar denetlenmez). */
var FB = (() => {
  const SAK = "sahte-fb";
  const yukle = () => { try { return JSON.parse(localStorage.getItem(SAK)) || { belgeler: {}, kullanicilar: {}, oturum: null }; } catch (_) { return { belgeler: {}, kullanicilar: {}, oturum: null }; } };
  const D = yukle(); const yaz = () => localStorage.setItem(SAK, JSON.stringify(D));
  const dinleyiciler = new Set();
  const kopya = o => JSON.parse(JSON.stringify(o));
  let n = 0; const uid = () => "u" + Date.now().toString(36) + (++n);
  function uygula(v, eski) {
    const out = eski ? kopya(eski) : {};
    for (const [k, x] of Object.entries(v)) out[k] = x && x.__au ? [...(out[k] || []), ...x.__au.filter(y => !(out[k] || []).some(z => JSON.stringify(z) === JSON.stringify(y)))] : kopya(x);
    return out;
  }
  function bildir() { yaz(); for (const d of dinleyiciler) d(); }
  const yazIslem = (ref, data, mod) => {
    if (mod === "sil") delete D.belgeler[ref.path];
    else if (mod === "guncelle") { if (!D.belgeler[ref.path]) throw Object.assign(new Error("yok"), { code: "not-found" }); D.belgeler[ref.path] = uygula(data, D.belgeler[ref.path]); }
    else D.belgeler[ref.path] = uygula(data, mod === "birlestir" ? D.belgeler[ref.path] : null);
  };
  const snap = path => ({ id: path.split("/").pop(), exists: () => path in D.belgeler, data: () => kopya(D.belgeler[path]) });
  const auths = [];
  return {
    initializeApp: (c, ad) => ({ ad: ad || "[default]" }), deleteApp: async () => {},
    getAuth: app => { const a = { app, currentUser: app.ad === "[default]" && D.oturum ? { uid: D.oturum, email: (D.kullanicilar[D.oturum] || {}).email } : null, cb: [] }; auths.push(a); return a; },
    onAuthStateChanged: (a, cb) => { setTimeout(() => cb(a.currentUser), 0); return () => {}; },
    createUserWithEmailAndPassword: async (a, email, sifre) => {
      if (Object.values(D.kullanicilar).some(u => u.email === email)) throw Object.assign(new Error(), { code: "auth/email-already-in-use" });
      if (sifre.length < 6) throw Object.assign(new Error(), { code: "auth/weak-password" });
      const u = uid(); D.kullanicilar[u] = { email, sifre }; a.currentUser = { uid: u, email };
      if (a.app.ad === "[default]") D.oturum = u; yaz(); return { user: a.currentUser };
    },
    signInWithEmailAndPassword: async (a, email, sifre) => {
      const e = Object.entries(D.kullanicilar).find(([, u]) => u.email === email && u.sifre === sifre);
      if (!e) throw Object.assign(new Error(), { code: "auth/invalid-credential" });
      a.currentUser = { uid: e[0], email }; if (a.app.ad === "[default]") D.oturum = e[0]; yaz(); return { user: a.currentUser };
    },
    signOut: async a => { if (a.app.ad === "[default]") D.oturum = null; a.currentUser = null; yaz(); },
    EmailAuthProvider: { credential: (e, s) => ({ e, s }) },
    reauthenticateWithCredential: async (u, c) => { if (D.kullanicilar[u.uid].sifre !== c.s) throw Object.assign(new Error(), { code: "auth/wrong-password" }); },
    updatePassword: async (u, s) => { D.kullanicilar[u.uid].sifre = s; yaz(); },
    initializeFirestore: () => ({}), persistentLocalCache: () => ({}), persistentMultipleTabManager: () => ({}),
    doc: (db, ...p) => ({ path: p.join("/") }), collection: (db, ...p) => ({ path: p.join("/"), koleksiyon: true }),
    getDoc: async r => snap(r.path),
    getDocs: async c => ({ docs: Object.keys(D.belgeler).filter(p => p.startsWith(c.path + "/") && p.split("/").length === c.path.split("/").length + 1).map(snap) }),
    setDoc: async (r, v, o) => { yazIslem(r, v, o && o.merge ? "birlestir" : "kur"); bildir(); },
    updateDoc: async (r, v) => { yazIslem(r, v, "guncelle"); bildir(); },
    writeBatch: () => { const l = []; return { set: (r, v, o) => l.push([r, v, o && o.merge ? "birlestir" : "kur"]), update: (r, v) => l.push([r, v, "guncelle"]),
      delete: r => l.push([r, null, "sil"]), commit: async () => { const yedek = kopya(D.belgeler); try { for (const [r, v, m] of l) yazIslem(r, v, m); } catch (e) { D.belgeler = yedek; throw e; } window.SAHTE_YAZMA = (window.SAHTE_YAZMA || 0) + l.length; bildir(); } }; },
    arrayUnion: (...v) => ({ __au: v }),
    onSnapshot: (ref, next) => {
      if (!ref.koleksiyon) { let son = "\u0000ilk"; const f = () => { const j = String(JSON.stringify(D.belgeler[ref.path])); if (j !== son) { son = j; next(snap(ref.path)); } }; dinleyiciler.add(f); setTimeout(f, 0); return () => dinleyiciler.delete(f); }
      let onceki = {};
      const f = () => {
        const simdi = {}, deg = [];
        for (const p of Object.keys(D.belgeler)) if (p.startsWith(ref.path + "/") && p.split("/").length === ref.path.split("/").length + 1) simdi[p] = JSON.stringify(D.belgeler[p]);
        for (const p of Object.keys(simdi)) if (onceki[p] !== simdi[p]) deg.push({ type: p in onceki ? "modified" : "added", doc: snap(p) });
        for (const p of Object.keys(onceki)) if (!(p in simdi)) deg.push({ type: "removed", doc: { id: p.split("/").pop(), data: () => null } });
        const ilk = !f.cagrildi; f.cagrildi = true; onceki = simdi;
        if (deg.length || ilk) next({ docChanges: () => deg });
      };
      dinleyiciler.add(f); setTimeout(f, 0); return () => dinleyiciler.delete(f);
    },
    query: x => x, where: () => null, documentId: () => null, serverTimestamp: () => new Date().toISOString(),
  };
})();

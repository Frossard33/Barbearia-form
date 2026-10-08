// Guarda os ajustes feitos pelos usuários: cor do cliente, observação e títulos ocultos.
// kind: 'cor' (key = cliente), 'nota' (key = cliente), 'oculto' (key = título)
(function () {
  const C = window.CONFIG || {};
  const remoto = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY);
  const LS = 'tecinco-ajustes-v1';
  let estado = { cor: {}, nota: {}, oculto: {} };
  let onChange = () => {};

  const lsLer = () => { try { return JSON.parse(localStorage.getItem(LS)) || null; } catch (e) { return null; } };
  const lsSalvar = () => { try { localStorage.setItem(LS, JSON.stringify(estado)); } catch (e) {} };
  const hdr = () => ({ apikey: C.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + C.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' });
  const url = C.SUPABASE_URL ? C.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/ajustes' : '';

  async function carregar() {
    if (!remoto) { const l = lsLer(); if (l) estado = Object.assign(estado, l); return; }
    const r = await fetch(url + '?select=kind,key,value', { headers: hdr() }).catch(e => { const l = lsLer(); if (l) estado = Object.assign(estado, l); throw e; });
    if (!r.ok) { const l = lsLer(); if (l) estado = Object.assign(estado, l); throw new Error('HTTP ' + r.status); }
    const novo = { cor: {}, nota: {}, oculto: {} };
    (await r.json()).forEach(x => { if (novo[x.kind]) novo[x.kind][x.key] = x.value; });
    estado = novo;
  }

  async function gravar(kind, key, value) {
    if (value === null || value === '' || value === false) delete estado[kind][key]; else estado[kind][key] = value;
    lsSalvar();
    if (!remoto) return;
    if (estado[kind][key] === undefined) {
      const r = await fetch(`${url}?kind=eq.${kind}&key=eq.${encodeURIComponent(key)}`, { method: 'DELETE', headers: hdr() });
      if (!r.ok) throw new Error('HTTP ' + r.status);
    } else {
      const r = await fetch(url, { method: 'POST', headers: Object.assign(hdr(), { Prefer: 'resolution=merge-duplicates' }),
        body: JSON.stringify({ kind, key, value: estado[kind][key], updated_at: new Date().toISOString() }) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
    }
  }

  window.Store = {
    remoto,
    get: (kind, key) => estado[kind][key],
    all: () => estado,
    carregar, gravar,
    substituir(novo) { estado = { cor: novo.cor || {}, nota: novo.nota || {}, oculto: novo.oculto || {} }; lsSalvar(); },
    async enviarTudo() {
      if (!remoto) return;
      const linhas = [];
      for (const kind of ['cor', 'nota', 'oculto']) for (const key in estado[kind]) linhas.push({ kind, key, value: estado[kind][key] });
      if (!linhas.length) return;
      const r = await fetch(url, { method: 'POST', headers: Object.assign(hdr(), { Prefer: 'resolution=merge-duplicates' }), body: JSON.stringify(linhas) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
    }
  };
})();

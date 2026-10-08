(function () {
'use strict';
const D = window.DADOS;
const REF = new Date(D.ref + 'T00:00:00');
const DIA = 864e5;
const NOMES = { 1: 'Três Poços', 2: 'Ponte Alta', 3: 'Barra Mansa', 4: 'Beira Rio', 6: 'Resende' };
const ABAS = [
  { id: 'geral', nome: 'Visão Geral', sub: 'todas as filiais' },
  { id: '1', nome: 'Três Poços', sub: 'Filial 01', filiais: [1] },
  { id: '2', nome: 'Ponte Alta', sub: 'Filial 02', filiais: [2] },
  { id: '3', nome: 'Barra Mansa', sub: 'Filial 03', filiais: [3] },
  { id: '4', nome: 'Beira Rio', sub: 'Filial 04', filiais: [4] },
  { id: '6', nome: 'Resende', sub: 'Filial 06', filiais: [6] },
  { id: 'outras', nome: 'Outras', sub: 'Filiais 05 e 08', filiais: [5, 8] }
];
const COR = { verde: '#1f9d5b', amarelo: '#e3a008', vermelho: '#d23f3f', cinza: '#98a2b3' };
const COR_NOME = { verde: 'Paga em dia (bom pagador)', amarelo: 'Talvez (precisa cobrar)', vermelho: 'Difícil (raramente paga)' };
const CATS = ['#14304f', '#2f64a3', '#5b8fc9', '#8bb2dc', '#2b9aa0', '#6bb7a8', '#c28a3a', '#b25f7a', '#7d6bb3', '#98a2b3'];
const FAIXAS = ['A vencer', '1-30 d', '31-60 d', '61-90 d', '91-180 d', '181-365 d', '+1 ano'];
const FAIXA_COR = ['#a9c2e0', '#8bb2dc', '#5b8fc9', '#2f64a3', '#234f85', '#14304f', '#0b1c30'];

const brl = n => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brl0 = n => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const curto = n => { const a = Math.abs(n); return a >= 1e6 ? 'R$ ' + (n / 1e6).toFixed(1).replace('.', ',') + ' mi' : a >= 1e3 ? 'R$ ' + Math.round(n / 1e3) + ' mil' : 'R$ ' + Math.round(n); };
const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '0%';
const num = n => n.toLocaleString('pt-BR');
const dataBR = iso => iso ? iso.split('-').reverse().join('/') : '—';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const faixaDe = d => d <= 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : d <= 90 ? 3 : d <= 180 ? 4 : d <= 365 ? 5 : 6;

// ---- preparação dos títulos ----
const T = D.titulos.map(t => {
  const dias = t.v ? Math.round((REF - new Date(t.v + 'T00:00:00')) / DIA) : 0;
  return Object.assign({}, t, { dias, faixa: faixaDe(dias), pago: !!t.pg, ck: 'c:' + (t.c || t.n) });
});

const S = { modo: 'R', aba: 'geral', q: '', cat: '', cor: '', so: 'todos', ocultos: false, sort: 'sal', asc: false, pag: 0 };
let charts = [];
const $ = s => document.querySelector(s);
const app = $('#app');

const oculto = t => !!Store.get('oculto', t.k);
const corDe = t => Store.get('cor', t.ck) || '';
const filiaisDa = id => (ABAS.find(a => a.id === id) || {}).filiais || null;

function base() {
  const fs = filiaisDa(S.aba);
  return T.filter(t => t.t === S.modo && (!fs || fs.includes(t.f)));
}
const ativos = list => list.filter(t => !t.pago && !oculto(t));
const soma = (l, k = 'sal') => l.reduce((s, t) => s + t[k], 0);

function resumo(list) {
  const at = ativos(list), venc = at.filter(t => t.dias > 0), av = at.filter(t => t.dias <= 0);
  const pagos = list.filter(t => t.pago);
  return {
    at, venc, av, pagos,
    vencido: soma(venc), aVencer: soma(av), recebido: pagos.reduce((s, t) => s + t.pgv, 0),
    clientes: new Set(venc.map(t => t.ck)).size,
    sem7: soma(at.filter(t => t.dias <= 0 && t.dias >= -7))
  };
}

// ---- gráficos ----
Chart.defaults.font.family = 'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
Chart.defaults.font.size = 12;
Chart.defaults.color = '#5d6b82';
function novoGrafico(id, cfg) {
  const el = document.getElementById(id); if (!el) return;
  cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false }, cfg.options);
  charts.push(new Chart(el, cfg));
}
const tipMoeda = { callbacks: { label: c => ` ${c.dataset.label ? c.dataset.label + ': ' : ''}${brl(c.parsed.x != null && c.chart.options.indexAxis === 'y' ? c.parsed.x : c.parsed.y != null ? c.parsed.y : c.parsed)}` } };

function barrasFilial(id, grupos) {
  const rs = grupos.map(g => resumo(T.filter(t => t.t === S.modo && g.f.includes(t.f))));
  const ds = [
    { label: S.modo === 'R' ? 'Em atraso' : 'Vencido', data: rs.map(r => r.vencido), backgroundColor: '#14304f' },
    { label: 'A vencer', data: rs.map(r => r.aVencer), backgroundColor: '#a9c2e0' }
  ];
  if (S.modo === 'R') ds.push({ label: 'Já recebido', data: rs.map(r => r.recebido), backgroundColor: COR.verde });
  novoGrafico(id, { type: 'bar', data: { labels: grupos.map(g => g.nome), datasets: ds },
    options: { plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${brl(c.parsed.y)}` } } },
      scales: { y: { ticks: { callback: v => curto(v) }, grid: { color: '#eef1f6' } }, x: { grid: { display: false } } } } });
}
function rosca(id, list) {
  const m = {}; ativos(list).filter(t => t.dias > 0).forEach(t => m[t.cat] = (m[t.cat] || 0) + t.sal);
  const e = Object.entries(m).sort((a, b) => b[1] - a[1]); const tot = e.reduce((s, x) => s + x[1], 0);
  novoGrafico(id, { type: 'doughnut', data: { labels: e.map(x => x[0]), datasets: [{ data: e.map(x => x[1]), backgroundColor: e.map((_, i) => CATS[i % CATS.length]), borderWidth: 2, borderColor: '#fff' }] },
    options: { cutout: '58%', plugins: { legend: { position: 'right', labels: { boxWidth: 12, generateLabels: ch => ch.data.labels.map((l, i) => ({ text: `${l} · ${pct(e[i][1], tot)}`, fillStyle: CATS[i % CATS.length], strokeStyle: '#fff', index: i })) } },
      tooltip: { callbacks: { label: c => ` ${c.label}: ${brl(c.parsed)} (${pct(c.parsed, tot)})` } } } } });
}
function faixas(id, list) {
  const v = FAIXAS.map(() => 0); ativos(list).forEach(t => v[t.faixa] += t.sal);
  novoGrafico(id, { type: 'bar', data: { labels: FAIXAS, datasets: [{ data: v, backgroundColor: FAIXA_COR }] },
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + brl(c.parsed.y) } } },
      scales: { y: { ticks: { callback: x => curto(x) }, grid: { color: '#eef1f6' } }, x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: false, font: { size: 11 } } } } } });
}
function topN(id, list, n) {
  const m = {};
  ativos(list).filter(t => t.dias > 0).forEach(t => { const o = m[t.ck] || (m[t.ck] = { n: t.n, ck: t.ck, v: 0 }); o.v += t.sal; });
  const e = Object.values(m).sort((a, b) => b.v - a.v).slice(0, n);
  const cor = o => S.modo === 'R' && Store.get('cor', o.ck) ? COR[Store.get('cor', o.ck)] : '#2f64a3';
  novoGrafico(id, { type: 'bar', data: { labels: e.map(o => o.n.length > 30 ? o.n.slice(0, 29) + '…' : o.n), datasets: [{ data: e.map(o => o.v), backgroundColor: e.map(cor), borderRadius: 4 }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { title: i => e[i[0].dataIndex].n, label: c => ' ' + brl(c.parsed.x) } } },
      scales: { x: { ticks: { callback: v => curto(v) }, grid: { color: '#eef1f6' } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } } } });
}
function porMes(id, list) {
  const at = ativos(list).filter(t => t.dias > 0 && t.v); const m = {}; let antes = 0;
  const lim = new Date(REF.getFullYear(), REF.getMonth() - 11, 1);
  const chaves = []; for (let i = 11; i >= 0; i--) { const d = new Date(REF.getFullYear(), REF.getMonth() - i, 1); chaves.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')); }
  at.forEach(t => { if (new Date(t.v + 'T00:00:00') < lim) antes += t.sal; else { const k = t.v.slice(0, 7); m[k] = (m[k] || 0) + t.sal; } });
  const mes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const labels = ['Mais antigos'].concat(chaves.map(k => mes[+k.slice(5) - 1] + '/' + k.slice(2, 4)));
  novoGrafico(id, { type: 'bar', data: { labels, datasets: [{ data: [antes].concat(chaves.map(k => m[k] || 0)), backgroundColor: ['#0b1c30'].concat(chaves.map(() => '#2f64a3')), borderRadius: 4 }] },
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + brl(c.parsed.y) } } },
      scales: { y: { ticks: { callback: x => curto(x) }, grid: { color: '#eef1f6' } }, x: { grid: { display: false } } } } });
}

// ---- blocos de interface ----
const kpi = (l, v, d, cls = '') => `<div class="kpi ${cls}"><div class="l">${l}</div><div class="v">${v}</div><div class="d">${d || '&nbsp;'}</div></div>`;
const card = (titulo, dica, corpo, cls = 'c6') => `<section class="card ${cls}"><h2>${titulo}</h2><p class="dica">${dica}</p>${corpo}</section>`;
const graf = (id, alto) => `<div class="graf ${alto ? 'alto' : ''}"><canvas id="${id}"></canvas></div>`;

function semaforo(list) {
  const cli = {}; ativos(list).filter(t => t.dias > 0).forEach(t => { (cli[t.ck] = cli[t.ck] || { v: 0 }).v += t.sal; });
  const g = { verde: [0, 0], amarelo: [0, 0], vermelho: [0, 0], '': [0, 0] };
  for (const k in cli) { const c = Store.get('cor', k) || ''; g[c][0]++; g[c][1] += cli[k].v; }
  const tot = Object.values(g).reduce((s, x) => s + x[1], 0);
  const item = (c, nome) => `<div><span class="dot" style="background:${COR[c || 'cinza']}"></span><span>${nome}</span><b>${brl0(g[c][1])}</b><span>${g[c][0]} cliente(s)</span></div>`;
  return `<div class="sem">${item('verde', 'Bom pagador')}${item('amarelo', 'Talvez')}${item('vermelho', 'Difícil')}${item('', 'Sem classificação')}</div>
    <div class="barra" title="Proporção do valor em atraso por classificação">${['verde', 'amarelo', 'vermelho', ''].map(c => `<span style="width:${tot ? g[c][1] / tot * 100 : 0}%;background:${COR[c || 'cinza']}"></span>`).join('')}</div>`;
}

function textoResumo(r, nomeLocal) {
  if (S.modo === 'R') {
    const por = {}; r.venc.forEach(t => por[t.cat] = (por[t.cat] || 0) + t.sal);
    const top = Object.entries(por).sort((a, b) => b[1] - a[1])[0];
    let h = `<p>Em <b>${dataBR(D.ref)}</b>, ${nomeLocal} tem <b>${brl0(r.vencido)}</b> em atraso, distribuídos em <b>${num(r.venc.length)} títulos</b> de <b>${num(r.clientes)} clientes</b>.</p>`;
    if (top) h += `<p>A maior parte (<b>${pct(top[1], r.vencido)}</b>) está na categoria <b>${esc(top[0])}</b>.</p>`;
    const antigo = soma(r.venc.filter(t => t.dias > 365));
    if (antigo) h += `<p>Cerca de <b>${pct(antigo, r.vencido)}</b> do atraso (${brl0(antigo)}) tem <b>mais de 1 ano</b> — quanto mais antigo, menor a chance de receber.</p>`;
    if (r.aVencer) h += `<p>Ainda há <b>${brl0(r.aVencer)}</b> a vencer, que ainda não é atraso.</p>`;
    if (r.recebido) h += `<p>Já recebidos e registrados na planilha: <b>${brl(r.recebido)}</b>.</p>`;
    return h;
  }
  let h = `<p>Em <b>${dataBR(D.ref)}</b>, ${nomeLocal} tem <b>${brl0(r.vencido)}</b> em contas a pagar <b>já vencidas</b> (${num(r.venc.length)} títulos).</p>`;
  h += `<p>Nos próximos 7 dias vencem mais <b>${brl0(r.sem7)}</b>. No total, ainda há <b>${brl0(r.aVencer)}</b> a vencer.</p>`;
  return h;
}

function legendaCor() {
  return `<div class="legenda">${Object.keys(COR_NOME).map(c => `<span><i style="background:${COR[c]}"></i>${COR_NOME[c]}</span>`).join('')}<span><i style="background:#2f64a3"></i>Sem classificação</span></div>`;
}

const nomeTabelaFilial = f => NOMES[f] ? `${NOMES[f]}` : ('Filial ' + String(f).padStart(2, '0'));

// ---- visão geral ----
function viewGeral() {
  const list = base(), r = resumo(list);
  const grupos = [1, 2, 3, 4, 6].map(f => ({ nome: NOMES[f], f: [f], id: String(f) })).concat([{ nome: 'Outras (05 e 08)', f: [5, 8], id: 'outras' }]);
  const rk = grupos.map(g => ({ g, r: resumo(list.filter(t => g.f.includes(t.f))) })).sort((a, b) => b.r.vencido - a.r.vencido);
  const mx = Math.max(...rk.map(x => x.r.vencido), 1);
  const R = S.modo === 'R';
  app.innerHTML = `
    <section class="card resumo"><h2>Resumo em palavras simples</h2>${textoResumo(r, 'a empresa')}</section>
    <div class="kpis">
      ${kpi(R ? 'Total em atraso' : 'Total vencido', brl0(r.vencido), `${num(r.venc.length)} títulos vencidos`, 'k-red')}
      ${kpi('A vencer', brl0(r.aVencer), `${num(r.av.length)} títulos no prazo`)}
      ${R ? kpi('Clientes em atraso', num(r.clientes), 'clientes diferentes', 'k-amber') : kpi('Vence em 7 dias', brl0(r.sem7), 'atenção ao caixa', 'k-amber')}
      ${R ? kpi('Já recebido', brl0(r.recebido), `${r.pagos.length} títulos pagos registrados`, 'k-green') : ''}
      ${kpi('Maior ' + (R ? 'devedora' : 'dívida'), rk[0].g.nome, brl0(rk[0].r.vencido) + ' (' + pct(rk[0].r.vencido, r.vencido) + ')', 'k-gray')}
    </div>
    ${R ? `<div class="aviso">O valor “Já recebido” mostra só os pagamentos registrados nas abas <b>Cobrança Adm</b> da planilha. Hoje são poucos títulos, por isso a barra verde é pequena. Quando houver mais baixas registradas, ela cresce sozinha.</div>` : ''}
    <div class="grid">
      ${card('Quanto cada filial ' + (R ? 'tem a receber' : 'tem a pagar'), 'Compare as filiais: azul-escuro é o que já passou do vencimento.', graf('g1', 1), 'c7')}
      ${card('Em que situação está o atraso', 'Cada cor é uma categoria da cobrança.', graf('g2', 1), 'c5')}
      ${card('10 maiores ' + (R ? 'devedores' : 'fornecedores a pagar'), R ? 'Somando todas as filiais. A cor da barra é a classificação feita por vocês.' : 'Somando todas as filiais, apenas contas vencidas.', graf('g3', 1) + (R ? legendaCor() : ''), 'c7')}
      ${card('Há quanto tempo está atrasado', 'Quanto mais para a direita, mais antigo e mais difícil de receber.', graf('g4', 1), 'c5')}
      ${card('Atrasos por mês de vencimento', 'Valor vencido, agrupado pelo mês em que deveria ter sido pago.', graf('g5'), 'c7')}
      ${R ? card('Semáforo dos clientes em atraso', 'Quanto do atraso está com bons, médios e maus pagadores. Classificação feita manualmente em cada filial.', semaforo(list), 'c5') : ''}
      ${card('Ranking das filiais', 'Clique no nome para ver o detalhe de cada filial.', `<table class="rank"><thead><tr><th>Filial</th><th class="n">Em atraso</th><th class="n">Títulos</th></tr></thead><tbody>${rk.map(x => `<tr><td><a href="#/${S.modo}/${x.g.id}">${x.g.nome}</a><div class="mini"><i style="width:${x.r.vencido / mx * 100}%"></i></div></td><td class="n">${brl0(x.r.vencido)}</td><td class="n">${num(x.r.venc.length)}</td></tr>`).join('')}</tbody></table>`, 'c12')}
    </div>`;
  barrasFilial('g1', grupos); rosca('g2', list); topN('g3', list, 10); faixas('g4', list); porMes('g5', list);
}

// ---- página de filial ----
function viewFilial() {
  const aba = ABAS.find(a => a.id === S.aba), list = base(), r = resumo(list), R = S.modo === 'R';
  const nome = S.aba === 'outras' ? 'as filiais 05 e 08' : 'a filial ' + aba.nome;
  const cats = [...new Set(list.map(t => t.cat))].sort();
  app.innerHTML = `
    <section class="card resumo"><h2>${aba.nome} <span style="font-weight:400;color:var(--muted)">· ${aba.sub}</span></h2>${textoResumo(r, nome)}</section>
    <div class="kpis">
      ${kpi(R ? 'Em atraso' : 'Vencido', brl0(r.vencido), `${num(r.venc.length)} títulos`, 'k-red')}
      ${kpi('A vencer', brl0(r.aVencer), `${num(r.av.length)} títulos`)}
      ${R ? kpi('Clientes em atraso', num(r.clientes), 'clientes diferentes', 'k-amber') : kpi('Fornecedores', num(new Set(r.at.map(t => t.ck)).size), 'com contas em aberto', 'k-amber')}
      ${R ? kpi('Já recebido', brl0(r.recebido), `${r.pagos.length} títulos pagos`, 'k-green') : kpi('Vence em 7 dias', brl0(r.sem7), '', 'k-gray')}
    </div>
    <div class="grid">
      ${card('Há quanto tempo está atrasado', 'Valor por tempo de atraso.', graf('g1'), 'c6')}
      ${card('Situação do atraso', 'Por categoria de cobrança.', graf('g2'), 'c6')}
      ${card('5 maiores ' + (R ? 'devedores' : 'fornecedores'), R ? 'A cor mostra a classificação.' : 'Contas vencidas.', graf('g3'), R ? 'c6' : 'c12')}
      ${R ? card('Semáforo dos clientes', 'Quanto do atraso está com cada tipo de pagador.', semaforo(list) + legendaCor(), 'c6') : ''}
    </div>
    <section class="card">
      <h2>Lista de títulos</h2>
      <p class="dica">${R ? 'Marque a cor de cada cliente: verde = paga certo · amarelo = talvez, precisa cobrar · vermelho = difícil. A cor vale para todos os títulos do cliente, em todas as filiais.' : 'Contas a pagar da filial, da mais urgente para a menos urgente.'}</p>
      <div class="filtros">
        <input type="search" id="fq" placeholder="Buscar ${R ? 'cliente' : 'fornecedor'} ou nº do título" value="${esc(S.q)}">
        <select id="fcat"><option value="">Todas as categorias</option>${cats.map(c => `<option ${S.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
        ${R ? `<select id="fcor"><option value="">Todas as cores</option><option value="verde" ${S.cor === 'verde' ? 'selected' : ''}>🟢 Verde</option><option value="amarelo" ${S.cor === 'amarelo' ? 'selected' : ''}>🟡 Amarelo</option><option value="vermelho" ${S.cor === 'vermelho' ? 'selected' : ''}>🔴 Vermelho</option><option value="sem" ${S.cor === 'sem' ? 'selected' : ''}>Sem classificação</option></select>` : ''}
        <select id="fso"><option value="todos">Todos os títulos</option><option value="atraso" ${S.so === 'atraso' ? 'selected' : ''}>Só em atraso</option><option value="pagos" ${S.so === 'pagos' ? 'selected' : ''}>Só pagos</option></select>
        <label class="chk"><input type="checkbox" id="foc" ${S.ocultos ? 'checked' : ''}> Mostrar ocultos</label>
        <button class="btn-sec" id="fcsv">Baixar planilha (CSV)</button>
      </div>
      <div id="tabela"></div>
    </section>`;
  faixas('g1', list); rosca('g2', list); topN('g3', list, 5);
  $('#fq').oninput = e => { S.q = e.target.value; S.pag = 0; tabela(); };
  $('#fcat').onchange = e => { S.cat = e.target.value; S.pag = 0; tabela(); };
  if (R) $('#fcor').onchange = e => { S.cor = e.target.value; S.pag = 0; tabela(); };
  $('#fso').onchange = e => { S.so = e.target.value; S.pag = 0; tabela(); };
  $('#foc').onchange = e => { S.ocultos = e.target.checked; S.pag = 0; tabela(); };
  $('#fcsv').onclick = () => csv(filtrados());
  tabela();
}

const PAGE = 50;
function filtrados() {
  const q = S.q.trim().toLowerCase();
  let l = base().filter(t => {
    if (!S.ocultos && oculto(t)) return false;
    if (S.cat && t.cat !== S.cat) return false;
    if (S.so === 'atraso' && (t.pago || t.dias <= 0)) return false;
    if (S.so === 'pagos' && !t.pago) return false;
    if (S.cor) { const c = corDe(t); if (S.cor === 'sem' ? c : c !== S.cor) return false; }
    if (q && !(t.n.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))) return false;
    return true;
  });
  const k = S.sort, dir = S.asc ? 1 : -1;
  l.sort((a, b) => { const x = a[k], y = b[k]; return (typeof x === 'string' ? x.localeCompare(y) : (x || 0) - (y || 0)) * dir; });
  return l;
}

function statusTag(t) {
  if (t.pago) return '<span class="tag ok">Pago</span>';
  if (S.modo === 'P') return t.dias > 0 ? `<span class="tag bad">Vencido há ${t.dias} d</span>` : t.dias >= -7 ? '<span class="tag warn">Vence em breve</span>' : '<span class="tag">No prazo</span>';
  return t.dias > 0 ? `<span class="tag ${t.dias > 90 ? 'bad' : 'warn'}">${t.dias} dias</span>` : '<span class="tag">A vencer</span>';
}

function tabela() {
  const R = S.modo === 'R', l = filtrados(), n = l.length, pgs = Math.max(1, Math.ceil(n / PAGE));
  if (S.pag >= pgs) S.pag = pgs - 1;
  const cols = [['n', R ? 'Cliente' : 'Fornecedor'], ['cat', 'Categoria'], ['v', 'Vencimento'], ['dias', 'Atraso', 'n'], ['val', 'Valor', 'n'], ['sal', 'Saldo', 'n']];
  const total = soma(l.filter(t => !t.pago && !oculto(t)));
  const rows = l.slice(S.pag * PAGE, (S.pag + 1) * PAGE).map(t => {
    const c = corDe(t), oc = oculto(t), nota = Store.get('nota', t.ck);
    const sem = t.pago ? '<span class="tag ok">🟢 Pago</span>' : R ? `<div class="cores" data-ck="${esc(t.ck)}">${['verde', 'amarelo', 'vermelho'].map(x => `<button type="button" style="--c:${COR[x]}" class="${c === x ? 'on' : ''}" data-cor="${x}" title="${COR_NOME[x]}" aria-label="${COR_NOME[x]}" aria-pressed="${c === x}"></button>`).join('')}${c ? '<button type="button" class="x" data-cor="" title="Limpar classificação" aria-label="Limpar classificação">✕</button>' : ''}</div>` : '';
    return `<tr class="${t.pago ? 'pago' : ''} ${oc ? 'oculto' : ''}">
      ${R ? `<td data-l="Cor">${sem}</td>` : ''}
      <td class="cli" data-l="${R ? 'Cliente' : 'Fornecedor'}">${esc(t.n)}<small>Título ${esc(t.id)}${t.par && t.par !== '1' ? ' · parcela ' + esc(t.par) : ''}${S.aba === 'geral' ? '' : ''}</small></td>
      <td data-l="Categoria"><span class="tag">${esc(t.cat)}</span></td>
      <td data-l="Vencimento">${dataBR(t.v)}</td>
      <td class="n" data-l="Atraso">${statusTag(t)}</td>
      <td class="n" data-l="Valor">${brl(t.val)}</td>
      <td class="n" data-l="Saldo">${t.pago ? `<b>${brl(t.pgv)}</b><small style="display:block;color:var(--muted)">pago em ${dataBR(t.pg)}</small>` : brl(t.sal)}</td>
      <td data-l="Ações" style="white-space:nowrap">
        <button class="ic ${nota ? 'tem' : ''}" data-nota="${esc(t.ck)}" data-nome="${esc(t.n)}" title="${nota ? esc(nota) : 'Adicionar observação'}">${nota ? '📝 Obs.' : '＋ Obs.'}</button>
        <button class="ic" data-oc="${esc(t.k)}" title="${oc ? 'Voltar para a lista' : 'Tirar da lista (some dos totais)'}">${oc ? 'Mostrar' : 'Ocultar'}</button>
      </td></tr>`;
  }).join('');
  const th = cols.map(([k, nm, c]) => `<th data-s="${k}" class="${c || ''} ${S.sort === k ? 'on' + (S.asc ? ' asc' : '') : ''}">${nm}</th>`).join('');
  $('#tabela').innerHTML = n ? `<div class="tw"><table class="t"><thead><tr>${R ? '<th style="cursor:default">Classificação</th>' : ''}${th}<th style="cursor:default">Ações</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="pag"><span>${num(n)} título(s) · saldo em aberto na lista: <b>${brl(total)}</b></span><span><button id="pp" ${S.pag === 0 ? 'disabled' : ''}>◀ Anterior</button> Página ${S.pag + 1} de ${pgs} <button id="pn" ${S.pag >= pgs - 1 ? 'disabled' : ''}>Próxima ▶</button></span></div>` : '<div class="vazio">Nenhum título encontrado com esses filtros.</div>';
  const tb = $('#tabela');
  tb.querySelectorAll('th[data-s]').forEach(h => h.onclick = () => { const k = h.dataset.s; S.asc = S.sort === k ? !S.asc : (k === 'n' || k === 'cat' || k === 'v'); S.sort = k; tabela(); });
  tb.querySelectorAll('.cores button').forEach(b => b.onclick = () => ajustar('cor', b.closest('.cores').dataset.ck, b.dataset.cor && corDe({ ck: b.closest('.cores').dataset.ck }) !== b.dataset.cor ? b.dataset.cor : ''));
  tb.querySelectorAll('[data-oc]').forEach(b => b.onclick = () => ajustar('oculto', b.dataset.oc, Store.get('oculto', b.dataset.oc) ? false : true));
  tb.querySelectorAll('[data-nota]').forEach(b => b.onclick = () => abrirNota(b.dataset.nota, b.dataset.nome));
  const pp = $('#pp'), pn = $('#pn'); if (pp) pp.onclick = () => { S.pag--; tabela(); }; if (pn) pn.onclick = () => { S.pag++; tabela(); };
}

// Salva um ajuste e atualiza a tela sem perder filtros/rolagem
async function ajustar(kind, key, valor) {
  try { await Store.gravar(kind, key, valor); status(Store.remoto ? 'Salvo para todos ✓' : 'Salvo neste navegador ✓'); }
  catch (e) { status('Não foi possível salvar no servidor (' + e.message + '). Mantido só neste navegador.', true); }
  const y = scrollY; render(true); scrollTo(0, y);
}

function abrirNota(ck, nome) {
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `<h3>Observação — ${esc(nome)}</h3><p>Vale para o cliente em todas as filiais (ex.: “prometeu pagar dia 15”).</p><textarea maxlength="500">${esc(Store.get('nota', ck) || '')}</textarea><div class="bt"><button class="btn-sec" value="x">Cancelar</button><button class="btn-p" value="ok">Salvar</button></div>`;
  document.body.appendChild(dlg); dlg.showModal();
  dlg.querySelectorAll('button').forEach(b => b.onclick = () => { const v = dlg.querySelector('textarea').value.trim(); const ok = b.value === 'ok'; dlg.close(); dlg.remove(); if (ok) ajustar('nota', ck, v); });
  dlg.addEventListener('cancel', () => dlg.remove());
}

function csv(l) {
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const linhas = [['Filial', 'Cliente/Fornecedor', 'Título', 'Categoria', 'Vencimento', 'Dias de atraso', 'Valor', 'Saldo', 'Classificação', 'Observação', 'Pago em', 'Valor pago']];
  l.forEach(t => linhas.push([nomeTabelaFilial(t.f), t.n, t.id, t.cat, dataBR(t.v), t.dias > 0 ? t.dias : 0, String(t.val).replace('.', ','), String(t.sal).replace('.', ','), corDe(t), Store.get('nota', t.ck) || '', t.pg ? dataBR(t.pg) : '', t.pgv ? String(t.pgv).replace('.', ',') : '']));
  baixar('﻿' + linhas.map(r => r.map(q).join(';')).join('\r\n'), `titulos-${S.aba}-${D.ref}.csv`, 'text/csv;charset=utf-8');
}
function baixar(txt, nome, tipo) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: tipo })); a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }

function status(msg, erro) {
  const el = $('#sync'); el.textContent = msg; el.className = 'sync' + (erro ? ' err' : '');
}

// ---- navegação ----
function render(manter) {
  charts.forEach(c => c.destroy()); charts = [];
  document.querySelectorAll('.modo button').forEach(b => b.classList.toggle('on', b.dataset.modo === S.modo));
  $('#abas').innerHTML = ABAS.map(a => `<a href="#/${S.modo}/${a.id}" class="${a.id === S.aba ? 'on' : ''}">${a.nome}<small>${a.sub}</small></a>`).join('');
  if (S.aba === 'geral') viewGeral(); else viewFilial();
  if (!manter) scrollTo(0, 0);
}
function rota() {
  const m = location.hash.match(/^#\/([RP])\/(\w+)/);
  const modo = m ? m[1] : 'R', aba = m && ABAS.some(a => a.id === m[2]) ? m[2] : 'geral';
  if (modo !== S.modo || aba !== S.aba) { S.q = ''; S.cat = ''; S.cor = ''; S.so = 'todos'; S.pag = 0; S.sort = 'sal'; S.asc = false; }
  S.modo = modo; S.aba = aba; render();
}
document.querySelectorAll('.modo button').forEach(b => b.onclick = () => { location.hash = `#/${b.dataset.modo}/${S.aba}`; });
addEventListener('hashchange', rota);

$('#ref').textContent = `Dados de ${dataBR(D.ref)} · ${num(T.length)} títulos pendentes`;
$('#btnPrint').onclick = () => print();
$('#btnExport').onclick = () => baixar(JSON.stringify(Store.all(), null, 2), `ajustes-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
$('#fileImport').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try { Store.substituir(JSON.parse(await f.text())); await Store.enviarTudo(); status('Ajustes importados ✓'); render(true); }
  catch (err) { status('Arquivo inválido ou erro ao enviar (' + err.message + ')', true); }
  e.target.value = '';
};

(async function iniciar() {
  try { await Store.carregar(); status(Store.remoto ? 'Ajustes compartilhados ativos' : 'Ajustes salvos apenas neste navegador'); }
  catch (e) { status('Servidor de ajustes indisponível (' + e.message + '). Usando este navegador.', true); }
  rota();
  if (Store.remoto) setInterval(async () => { if (document.hidden || document.querySelector('dialog[open]')) return; try { await Store.carregar(); render(true); } catch (e) {} }, 60000);
})();
})();

const MODULOS = [
  { id: 'm1', nome: 'Módulo 1' },
  { id: 'm2', nome: 'Módulo 2' },
  { id: 'm3', nome: 'Módulo 3' },
  { id: 'm4', nome: 'Módulo 4' },
  { id: 'm5', nome: 'Módulo 5' },
  { id: 'm6', nome: 'Módulo 6' },
  { id: 'm7', nome: 'Módulo 7' }
];
const CHAVE = 'trilha-devops-progresso';
const app = document.getElementById('app');
const btnVoltar = document.getElementById('voltar');
const cache = {};
let prog = ler();

function ler() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; }
}
function salvar() { localStorage.setItem(CHAVE, JSON.stringify(prog)); }
function feitos(id) { return prog[id] || []; }
function feito(id, n) { return feitos(id).includes(n); }
function livre(id, n) { return n === 1 || feito(id, n - 1); }
function alternar(id, n) {
  const lista = feitos(id).filter(x => x !== n);
  if (!feito(id, n)) lista.push(n);
  prog[id] = lista.sort((a, b) => a - b);
  salvar();
}

async function carregar(id) {
  if (cache[id]) return cache[id];
  const r = await fetch('conteudo/' + id + '.html');
  if (!r.ok) throw new Error(r.status);
  const doc = new DOMParser().parseFromString('<div id="raiz">' + await r.text() + '</div>', 'text/html');
  const raiz = doc.getElementById('raiz');
  raiz.querySelectorAll('.ac').forEach(x => x.remove());
  const intro = raiz.querySelector('.p0');
  const topicos = [...raiz.querySelectorAll('.p')].filter(p => p !== intro).map((p, i) => {
    const tg = ((p.querySelector('.tg') || {}).textContent || '').trim();
    return {
      n: i + 1,
      bloco: tg.includes('·') ? tg.split('·')[0].trim() : tg,
      titulo: (p.querySelector('h2') || {}).textContent || 'Tópico ' + (i + 1),
      sec: /devsecops/i.test(tg),
      html: p.innerHTML
    };
  });
  return (cache[id] = {
    id,
    titulo: (raiz.querySelector('h1') || {}).textContent || id,
    intro: intro ? intro.innerHTML : '',
    topicos,
    html: raiz.innerHTML
  });
}

function pct(m) {
  return m.topicos.length ? Math.round(feitos(m.id).length / m.topicos.length * 100) : 0;
}
function barra(m) {
  return '<div class="barra"><i style="width:' + pct(m) + '%"></i></div>' +
    '<p class="meta">' + feitos(m.id).length + ' de ' + m.topicos.length + ' concluídos</p>';
}

async function telaIndice() {
  const mods = await Promise.all(MODULOS.map(m => carregar(m.id)));
  const itens = mods.map(m =>
    '<li><a class="cartao' + (pct(m) === 100 ? ' ok' : '') + '" href="#/' + m.id + '"><b>' + m.titulo + '</b>' + barra(m) + '</a></li>'
  ).join('');
  return '<h1>Trilha DevOps</h1><p class="sub">Estude offline. O progresso fica salvo neste aparelho.</p>' +
    '<ol class="lista"><li><a class="cartao rec" href="#/recursos"><b>Recursos complementares</b>' +
    '<p class="meta">Guias, exercícios e laboratórios por módulo</p></a></li>' + itens + '</ol>' +
    '<div class="ajustes"><h3>Backup do progresso</h3>' +
    '<p class="meta">Se trocar de celular ou limpar os dados do navegador, o progresso se perde. Guarde uma cópia.</p>' +
    '<button class="btn" data-acao="copiar">Copiar backup</button>' +
    '<button class="btn" data-acao="restaurar">Restaurar backup</button>' +
    '<button class="btn" data-acao="zerar">Zerar progresso</button></div>';
}

function telaModulo(m) {
  let h = '<h1>' + m.titulo + '</h1>' + barra(m);
  if (m.intro) h += '<details class="intro"><summary>Como usar este módulo</summary><div class="conteudo">' + m.intro + '</div></details>';
  let atual = null;
  m.topicos.forEach(t => {
    if (t.bloco !== atual) {
      if (atual !== null) h += '</div>';
      atual = t.bloco;
      h += '<div class="bloco"><h3>' + t.bloco + '</h3>';
    }
    const f = feito(m.id, t.n);
    const cls = f ? 'feito' : !livre(m.id, t.n) ? 'trancado' : t.sec ? 'sec' : '';
    h += '<a class="topico ' + cls + '" href="#/' + m.id + '/' + t.n + '"><span class="st">' + (f ? '\u2713' : t.n) + '</span>' + t.titulo + '</a>';
  });
  if (atual !== null) h += '</div>';
  return h;
}

function telaTopico(m, n) {
  const t = m.topicos[n - 1];
  if (!t) return telaModulo(m);
  if (!livre(m.id, n)) {
    return '<p class="k">Conclua o tópico anterior para liberar este.</p>' +
      '<a class="btn" href="#/' + m.id + '/' + (n - 1) + '">Ir para o tópico anterior</a>';
  }
  const f = feito(m.id, n);
  const prox = m.topicos[n];
  const proxMod = MODULOS[MODULOS.findIndex(x => x.id === m.id) + 1];
  let a = '<button class="btn ' + (f ? '' : 'ok') + '" data-acao="alternar" data-m="' + m.id + '" data-n="' + n + '">' +
    (f ? 'Desmarcar concluído' : 'Marcar como concluído') + '</button>';
  if (f && prox) a += '<a class="btn esc" href="#/' + m.id + '/' + (n + 1) + '">Próximo: ' + prox.titulo + '</a>';
  if (f && !prox && proxMod) a += '<a class="btn esc" href="#/' + proxMod.id + '">Ir para o ' + proxMod.nome + '</a>';
  a += '<a class="btn" href="#/' + m.id + '">Voltar ao módulo</a>';
  return '<article class="conteudo">' + t.html + '</article><div class="acoes">' + a + '</div>';
}

function definirVoltar(destino) {
  btnVoltar.hidden = !destino;
  btnVoltar.dataset.destino = destino || '';
}
btnVoltar.addEventListener('click', () => { location.hash = btnVoltar.dataset.destino; });

async function rota(rolar) {
  const [id, n] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  try {
    if (!id) {
      definirVoltar(null);
      app.innerHTML = await telaIndice();
    } else if (id === 'recursos') {
      definirVoltar('#/');
      app.innerHTML = '<div class="recursos conteudo">' + (await carregar('recursos')).html + '</div>';
    } else {
      const m = await carregar(id);
      if (n) { definirVoltar('#/' + id); app.innerHTML = telaTopico(m, Number(n)); }
      else { definirVoltar('#/'); app.innerHTML = telaModulo(m); }
    }
    app.querySelectorAll('a[href^="http"]').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
  } catch (e) {
    app.innerHTML = '<p class="erro">Não consegui carregar este conteúdo. Abra o app uma vez com internet para ele ficar disponível offline.</p>';
  }
  if (rolar !== false) window.scrollTo(0, 0);
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-acao]');
  if (!b) return;
  const acao = b.dataset.acao;
  if (acao === 'alternar') {
    alternar(b.dataset.m, Number(b.dataset.n));
    rota(false);
  } else if (acao === 'copiar') {
    const txt = JSON.stringify(prog);
    try {
      await navigator.clipboard.writeText(txt);
      alert('Backup copiado. Cole num lugar seguro, como suas notas.');
    } catch (err) {
      prompt('Copie o texto abaixo:', txt);
    }
  } else if (acao === 'restaurar') {
    const txt = prompt('Cole aqui o texto do backup:');
    if (!txt) return;
    try {
      const dados = JSON.parse(txt);
      if (!dados || typeof dados !== 'object') throw new Error('inválido');
      prog = dados;
      salvar();
      rota(false);
      alert('Progresso restaurado.');
    } catch (err) {
      alert('Texto de backup inválido.');
    }
  } else if (acao === 'zerar') {
    if (confirm('Apagar todo o progresso deste aparelho?')) { prog = {}; salvar(); rota(false); }
  }
});

window.addEventListener('hashchange', rota);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
rota();

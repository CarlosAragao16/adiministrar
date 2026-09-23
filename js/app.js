/**
 * app.js
 * Lógica compartilhada entre todas as páginas internas do Finanças IA:
 * autenticação de demonstração, tema, navegação, toasts, modais e busca global.
 */

/* ---------------------------------------------------------------------- */
/* AUTENTICAÇÃO (DEMONSTRAÇÃO)                                            */
/* ---------------------------------------------------------------------- */

function estaLogado() {
  return localStorage.getItem(AUTH_KEY) === '1';
}

function entrarDemo() {
  localStorage.setItem(AUTH_KEY, '1');
}

function sair() {
  localStorage.removeItem(AUTH_KEY);
  window.location.href = 'index.html';
}

function exigirLogin() {
  if (!estaLogado()) {
    window.location.href = 'index.html';
  }
}

/* ---------------------------------------------------------------------- */
/* TEMA                                                                    */
/* ---------------------------------------------------------------------- */

function aplicarTemaSalvo() {
  const tema = localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.setAttribute('data-theme', tema);
  return tema;
}

function alternarTema() {
  const atual = document.documentElement.getAttribute('data-theme') || 'light';
  const novo = atual === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', novo);
  localStorage.setItem(THEME_KEY, novo);
  document.querySelectorAll('.theme-switch [data-tema-atual]').forEach(el => {
    el.textContent = novo === 'dark' ? '🌙' : '☀️';
  });
  document.dispatchEvent(new CustomEvent('tema:alterado', { detail: novo }));
}

/* ---------------------------------------------------------------------- */
/* TOASTS                                                                   */
/* ---------------------------------------------------------------------- */

function garantirToastContainer() {
  let el = document.querySelector('.toast-container');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast-container';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  return el;
}

function showToast(mensagem, tipo = 'info', duracaoMs = 3600) {
  const container = garantirToastContainer();
  const icones = { success: '✅', error: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `<span>${icones[tipo] || icones.info}</span><span>${mensagem}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 200);
  }, duracaoMs);
}

/* ---------------------------------------------------------------------- */
/* MODAIS                                                                   */
/* ---------------------------------------------------------------------- */

function openModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  const foco = overlay.querySelector('input, select, textarea, button');
  if (foco) setTimeout(() => foco.focus(), 60);
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function inicializarModais() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.closest('.modal-overlay').id));
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(o => closeModal(o.id));
    }
  });
}

/* Confirmação genérica antes de excluir */
function confirmarAcao({ titulo = 'Tem certeza?', mensagem = '', icone = '⚠️', textoConfirmar = 'Excluir', tipo = 'danger', onConfirm }) {
  let overlay = document.getElementById('modal-confirmar-global');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modal-confirmar-global';
    overlay.className = 'modal-overlay';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="modal" style="max-width:380px;">
      <div class="modal-body">
        <div class="confirm-box">
          <div class="ic">${icone}</div>
          <h2>${titulo}</h2>
          <p>${mensagem}</p>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-secondary" data-acao="cancelar">Cancelar</button>
        <button class="btn ${tipo === 'danger' ? 'btn-danger' : 'btn-primary'}" data-acao="confirmar">${textoConfirmar}</button>
      </div>
    </div>`;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  const fechar = () => { overlay.classList.remove('open'); document.body.style.overflow = ''; };

  overlay.querySelector('[data-acao="cancelar"]').onclick = fechar;
  overlay.querySelector('[data-acao="confirmar"]').onclick = () => {
    fechar();
    if (onConfirm) onConfirm();
  };
  overlay.onclick = e => { if (e.target === overlay) fechar(); };
}

/* ---------------------------------------------------------------------- */
/* CONTAGEM ANIMADA                                                         */
/* ---------------------------------------------------------------------- */

function animarContador(el, valorFinal, { moeda = true, duracao = 700 } = {}) {
  if (!el) return;
  const inicio = 0;
  const t0 = performance.now();
  function passo(t) {
    const progresso = Math.min(1, (t - t0) / duracao);
    const facilitado = 1 - Math.pow(1 - progresso, 3);
    const atual = inicio + (valorFinal - inicio) * facilitado;
    el.textContent = moeda ? formatarMoeda(atual) : Math.round(atual).toLocaleString('pt-BR');
    if (progresso < 1) requestAnimationFrame(passo);
    else el.textContent = moeda ? formatarMoeda(valorFinal) : Math.round(valorFinal).toLocaleString('pt-BR');
  }
  requestAnimationFrame(passo);
}

/* ---------------------------------------------------------------------- */
/* NAVEGAÇÃO / SHELL                                                        */
/* ---------------------------------------------------------------------- */

const ITENS_MENU = [
  { href: 'dashboard.html', ic: '🏠', label: 'Dashboard', mobile: true },
  { href: 'transacoes.html', ic: '💳', label: 'Transações', mobile: true },
  { href: 'metas.html', ic: '🎯', label: 'Metas', mobile: true },
  { href: 'orcamento.html', ic: '📊', label: 'Orçamento', mobile: false },
  { href: 'relatorios.html', ic: '📈', label: 'Relatórios', mobile: false },
  { href: 'assistente.html', ic: '🤖', label: 'Assistente IA', mobile: true },
  { href: 'configuracoes.html', ic: '⚙️', label: 'Configurações', mobile: true }
];

function paginaAtual() {
  return window.location.pathname.split('/').pop() || 'dashboard.html';
}

function montarSidebar() {
  const nav = document.querySelector('.nav-list');
  const bottomNav = document.querySelector('.bottom-nav');
  const drawerNav = document.querySelector('.drawer .nav-list');
  const atual = paginaAtual();

  const linkHtml = item => `<a href="${item.href}" class="${item.href === atual ? 'active' : ''}"><span class="ic">${item.ic}</span>${item.label}</a>`;

  if (nav) nav.innerHTML = ITENS_MENU.map(linkHtml).join('');
  if (drawerNav) drawerNav.innerHTML = ITENS_MENU.map(linkHtml).join('');

  if (bottomNav) {
    bottomNav.innerHTML = ITENS_MENU.filter(i => i.mobile).map(item => `
      <a href="${item.href}" class="${item.href === atual ? 'active' : ''}">
        <span class="ic">${item.ic}</span>${item.label.split(' ')[0]}
      </a>`).join('');
  }
}

function montarPerfil() {
  const dados = loadData();
  document.querySelectorAll('[data-user-nome]').forEach(el => (el.textContent = dados.perfil.nome));
  document.querySelectorAll('[data-user-email]').forEach(el => (el.textContent = dados.perfil.email));
  document.querySelectorAll('[data-user-inicial]').forEach(el => (el.textContent = dados.perfil.nome.charAt(0).toUpperCase()));
}

function montarNotificacoes() {
  const dados = loadData();
  const painel = document.getElementById('painel-notificacoes');
  const badge = document.getElementById('badge-notificacoes');
  const naoLidas = dados.notificacoes.filter(n => !n.lida);

  if (badge) badge.style.display = naoLidas.length > 0 ? 'block' : 'none';

  if (painel) {
    const lista = dados.notificacoes.slice(0, 8);
    const iconesTipo = { alerta: '⚠️', meta: '🎯', ia: '🤖', conta: '📅', receita: '📈', despesa: '💸' };
    painel.querySelector('.dd-list').innerHTML = lista.length ? lista.map(n => `
      <div class="notif-item ${n.lida ? '' : 'unread'}">
        ${n.lida ? '' : '<div class="dot-unread"></div>'}
        <div class="txt">
          <strong>${iconesTipo[n.tipo] || '🔔'} ${n.texto}</strong>
          <span>${formatarData(n.data)}</span>
        </div>
      </div>`).join('') : '<div class="notif-item">Nenhuma notificação por aqui.</div>';
  }
}

function inicializarDropdowns() {
  document.querySelectorAll('[data-dropdown-trigger]').forEach(trigger => {
    const alvoId = trigger.getAttribute('data-dropdown-trigger');
    const painel = document.getElementById(alvoId);
    if (!painel) return;
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.dropdown-panel.open, .menu-panel.open').forEach(p => {
        if (p !== painel) p.classList.remove('open');
      });
      painel.classList.toggle('open');
      if (alvoId === 'painel-notificacoes' && painel.classList.contains('open')) {
        marcarTodasNotificacoesLidas();
        const badge = document.getElementById('badge-notificacoes');
        if (badge) badge.style.display = 'none';
      }
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-panel.open, .menu-panel.open').forEach(p => p.classList.remove('open'));
  });
}

function inicializarDrawerMobile() {
  const btnAbrir = document.getElementById('btn-abrir-menu');
  const overlay = document.getElementById('drawer-overlay');
  const drawer = document.getElementById('drawer');
  const btnFechar = document.getElementById('btn-fechar-drawer');
  if (!btnAbrir || !overlay || !drawer) return;

  const abrir = () => { overlay.classList.add('open'); drawer.classList.add('open'); };
  const fechar = () => { overlay.classList.remove('open'); drawer.classList.remove('open'); };

  btnAbrir.addEventListener('click', abrir);
  overlay.addEventListener('click', fechar);
  if (btnFechar) btnFechar.addEventListener('click', fechar);
}

function inicializarBuscaGlobal() {
  const input = document.getElementById('busca-global');
  const resultados = document.getElementById('busca-resultados');
  if (!input || !resultados) return;

  input.addEventListener('input', debounce(() => {
    const termo = input.value.trim().toLowerCase();
    if (termo.length < 2) { resultados.classList.remove('open'); resultados.innerHTML = ''; return; }

    const dados = loadData();
    const achados = [];

    dados.transacoes.filter(t => t.descricao.toLowerCase().includes(termo) || getCategoria(t.categoria).nome.toLowerCase().includes(termo))
      .slice(0, 4).forEach(t => achados.push(`💳 ${t.descricao} — ${formatarMoeda(t.valor)}`));

    dados.metas.filter(m => m.nome.toLowerCase().includes(termo)).slice(0, 3)
      .forEach(m => achados.push(`🎯 Meta: ${m.nome}`));

    dados.contasRecorrentes.filter(c => c.nome.toLowerCase().includes(termo)).slice(0, 3)
      .forEach(c => achados.push(`🔄 Conta recorrente: ${c.nome}`));

    todosCategorias().filter(c => c.nome.toLowerCase().includes(termo)).slice(0, 3)
      .forEach(c => achados.push(`${c.icone} Categoria: ${c.nome}`));

    resultados.innerHTML = achados.length
      ? achados.map(a => `<div class="notif-item">${a}</div>`).join('')
      : '<div class="notif-item">Nenhum resultado encontrado.</div>';
    resultados.classList.add('open');
  }, 200));

  document.addEventListener('click', e => {
    if (!e.target.closest('.global-search')) resultados.classList.remove('open');
  });
}

function debounce(fn, delay = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ---------------------------------------------------------------------- */
/* INICIALIZAÇÃO GERAL DE PÁGINA INTERNA                                    */
/* ---------------------------------------------------------------------- */

function inicializarShell() {
  exigirLogin();
  aplicarTemaSalvo();
  montarSidebar();
  montarPerfil();
  montarNotificacoes();
  inicializarDropdowns();
  inicializarModais();
  inicializarDrawerMobile();
  inicializarBuscaGlobal();

  document.querySelectorAll('[data-acao="alternar-tema"]').forEach(btn => {
    btn.addEventListener('click', alternarTema);
  });
  document.querySelectorAll('[data-acao="sair"]').forEach(btn => {
    btn.addEventListener('click', sair);
  });

  const temaAtualEl = document.querySelectorAll('[data-tema-atual]');
  const temaAtual = document.documentElement.getAttribute('data-theme') || 'light';
  temaAtualEl.forEach(el => (el.textContent = temaAtual === 'dark' ? '🌙' : '☀️'));

  const btnNovaTransacao = document.querySelectorAll('[data-acao="nova-transacao"]');
  btnNovaTransacao.forEach(btn => btn.addEventListener('click', () => {
    if (typeof abrirModalTransacao === 'function') abrirModalTransacao();
  }));

  gerarInsightsAutomaticos();
}

/* ---------------------------------------------------------------------- */
/* VALIDAÇÃO DE FORMULÁRIO                                                  */
/* ---------------------------------------------------------------------- */

function validarCampo(input, condicao, mensagem) {
  const campo = input.closest('.field');
  if (!campo) return condicao;
  const erroEl = campo.querySelector('.error-msg');
  if (!condicao) {
    campo.classList.add('has-error');
    if (erroEl) erroEl.textContent = mensagem;
  } else {
    campo.classList.remove('has-error');
  }
  return condicao;
}

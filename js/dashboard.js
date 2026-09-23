/**
 * dashboard.js — lógica da página Dashboard
 */

let periodoAtualFluxo = '6m';

function saudacaoPorHorario() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function renderKpis() {
  const dados = loadData();
  const mesAtual = transacoesDoMes(dados.transacoes, 0);
  const mesAnterior = transacoesDoMes(dados.transacoes, -1);

  const receitas = totalReceitas(mesAtual);
  const despesas = totalDespesas(mesAtual);
  const saldo = calcularSaldo(mesAtual);
  const economia = calcularEconomia(mesAtual);

  const receitasAnt = totalReceitas(mesAnterior);
  const despesasAnt = totalDespesas(mesAnterior);
  const saldoAnt = calcularSaldo(mesAnterior);
  const economiaAnt = calcularEconomia(mesAnterior);

  animarContador(document.getElementById('kpi-saldo'), saldo);
  animarContador(document.getElementById('kpi-receitas'), receitas);
  animarContador(document.getElementById('kpi-despesas'), despesas);
  animarContador(document.getElementById('kpi-economia'), economia);

  renderDelta('kpi-saldo-delta', percentualVariacao(saldo, saldoAnt));
  renderDelta('kpi-receitas-delta', percentualVariacao(receitas, receitasAnt));
  renderDelta('kpi-despesas-delta', percentualVariacao(despesas, despesasAnt), true);
  renderDelta('kpi-economia-delta', percentualVariacao(economia, economiaAnt));
}

function renderDelta(elId, variacao, inverterCor = false) {
  const el = document.getElementById(elId);
  if (!el) return;
  const positivo = variacao >= 0;
  const boa = inverterCor ? !positivo : positivo;
  el.innerHTML = `<span class="${boa ? 'text-success' : 'text-danger'}">${positivo ? '▲' : '▼'} ${Math.abs(variacao).toFixed(1)}%</span> <span class="text-muted">vs mês anterior</span>`;
}

function renderGraficosDashboard() {
  const dados = loadData();
  renderGraficoFluxo('grafico-fluxo', dados.transacoes, periodoAtualFluxo);

  const mesAtual = transacoesDoMes(dados.transacoes, 0);
  const entradas = renderGraficoCategorias('grafico-categorias', mesAtual);
  const legenda = document.getElementById('legenda-categorias');
  if (!legenda) return;

  if (!entradas || entradas.length === 0) {
    legenda.innerHTML = '<div class="empty-state" style="padding:20px;"><p>Nenhuma despesa este mês ainda.</p></div>';
    return;
  }
  const total = entradas.reduce((s, [, v]) => s + v, 0);
  legenda.innerHTML = entradas.map(([id, valor]) => {
    const cat = getCategoria(id);
    const pct = total > 0 ? (valor / total) * 100 : 0;
    return `<div class="row">
      <span class="swatch" style="background:${cat.cor}"></span>
      <span class="name">${cat.icone} ${cat.nome}</span>
      <span class="val">${formatarMoeda(valor)}</span>
      <span class="pct">${pct.toFixed(0)}%</span>
    </div>`;
  }).join('');
}

function inicializarToolbarPeriodo() {
  const toolbar = document.getElementById('toolbar-periodo');
  if (!toolbar) return;
  toolbar.addEventListener('click', e => {
    const btn = e.target.closest('button[data-periodo]');
    if (!btn) return;
    toolbar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    periodoAtualFluxo = btn.dataset.periodo;
    const dados = loadData();
    renderGraficoFluxo('grafico-fluxo', dados.transacoes, periodoAtualFluxo);
  });
}

function renderPrevisao() {
  const dados = loadData();
  const prev = previsaoFinanceira(dados.transacoes);
  const elReceita = document.getElementById('prev-receita');
  const elDespesa = document.getElementById('prev-despesa');
  const elSaldo = document.getElementById('prev-saldo');
  if (elReceita) elReceita.textContent = formatarMoeda(prev.receitaEstimada);
  if (elDespesa) elDespesa.textContent = formatarMoeda(prev.despesaEstimada);
  if (elSaldo) {
    elSaldo.textContent = formatarMoeda(prev.saldoEstimado);
    elSaldo.className = 'val ' + (prev.saldoEstimado >= 0 ? 'text-success' : 'text-danger');
  }
}

function renderContasRecorrentesPreview() {
  const container = document.getElementById('lista-contas-recorrentes');
  if (!container) return;
  const dados = loadData();
  const ativas = dados.contasRecorrentes.filter(c => c.ativo);
  if (ativas.length === 0) {
    container.innerHTML = '<p class="text-muted" style="font-size:13px;">Nenhuma conta recorrente cadastrada.</p>';
    return;
  }
  container.innerHTML = ativas.map(c => {
    const cat = getCategoria(c.categoria);
    const hoje = new Date().getDate();
    const proximo = c.diaVencimento >= hoje ? c.diaVencimento - hoje : null;
    return `<div class="recurring-chip">
      <span>${cat.icone}</span>
      <span>${c.nome} · ${formatarMoeda(c.valor)}</span>
      ${proximo !== null && proximo <= 5 ? `<span class="pill pill-warning">vence em ${proximo === 0 ? 'hoje' : proximo + 'd'}</span>` : ''}
    </div>`;
  }).join('');
}

function renderTransacoesRecentes() {
  const container = document.getElementById('lista-transacoes-recentes');
  if (!container) return;
  const dados = loadData();
  const recentes = [...dados.transacoes].sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm)).slice(0, 8);

  if (recentes.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="ic">🧾</div><h3>Nenhuma transação ainda</h3><p>Clique em "Nova transação" para começar a registrar seus gastos e receitas.</p></div>`;
    return;
  }

  container.innerHTML = recentes.map(t => linhaTransacaoHtml(t)).join('');
  vincularAcoesTransacao(container);
}

function inicializarDashboard() {
  inicializarShell();
  renderKpis();
  renderGraficosDashboard();
  inicializarToolbarPeriodo();
  renderPrevisao();
  renderContasRecorrentesPreview();
  renderTransacoesRecentes();

  const saudacao = document.getElementById('saudacao');
  if (saudacao) {
    const dados = loadData();
    const primeiroNome = dados.perfil.nome.split(' ')[0];
    saudacao.textContent = `${saudacaoPorHorario()}, ${primeiroNome}! 👋`;
  }

  document.addEventListener('tema:alterado', () => {
    renderGraficosDashboard();
  });

  document.addEventListener('financas:atualizado', () => {
    renderKpis();
    renderGraficosDashboard();
    renderPrevisao();
    renderTransacoesRecentes();
    gerarInsightsAutomaticos();
  });
}

document.addEventListener('DOMContentLoaded', inicializarDashboard);

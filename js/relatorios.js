/**
 * relatorios.js — lógica da página de Relatórios
 */

let periodoRelatorio = 'este_mes';

function transacoesPorPeriodoRelatorio(transacoes, periodo) {
  switch (periodo) {
    case 'mes_anterior': return transacoesDoMes(transacoes, -1);
    case '3m': {
      let lista = [];
      for (let i = 0; i < 3; i++) lista = lista.concat(transacoesDoMes(transacoes, -i));
      return lista;
    }
    case '6m': {
      let lista = [];
      for (let i = 0; i < 6; i++) lista = lista.concat(transacoesDoMes(transacoes, -i));
      return lista;
    }
    case '1a': {
      let lista = [];
      for (let i = 0; i < 12; i++) lista = lista.concat(transacoesDoMes(transacoes, -i));
      return lista;
    }
    default: return transacoesDoMes(transacoes, 0);
  }
}

function diasNoPeriodo(periodo) {
  return { este_mes: 30, mes_anterior: 30, '3m': 90, '6m': 180, '1a': 365 }[periodo] || 30;
}

function renderRelatorios() {
  const container = document.getElementById('relatorio-stats');
  if (!container) return;

  const dados = loadData();
  const transacoes = transacoesPorPeriodoRelatorio(dados.transacoes, periodoRelatorio);

  const receitas = totalReceitas(transacoes);
  const despesas = totalDespesas(transacoes);
  const saldo = receitas - despesas;
  const economia = receitas > 0 ? (saldo / receitas) * 100 : 0;
  const maiorCat = maiorCategoriaGasto(transacoes);
  const maiorGasto = maiorDespesa(transacoes);
  const dias = diasNoPeriodo(periodoRelatorio);
  const mDiaria = mediaDiaria(transacoes, dias);
  const mMensal = mediaMensal(dados.transacoes);

  document.getElementById('rel-receitas').textContent = formatarMoeda(receitas);
  document.getElementById('rel-despesas').textContent = formatarMoeda(despesas);
  document.getElementById('rel-saldo').textContent = formatarMoeda(saldo);
  document.getElementById('rel-saldo').className = 'kpi-value count-up ' + (saldo >= 0 ? 'text-success' : 'text-danger');
  document.getElementById('rel-economia').textContent = economia.toFixed(1) + '%';
  document.getElementById('rel-maior-categoria').textContent = maiorCat ? `${getCategoria(maiorCat.categoria).icone} ${getCategoria(maiorCat.categoria).nome} — ${formatarMoeda(maiorCat.valor)}` : '—';
  document.getElementById('rel-maior-despesa').textContent = maiorGasto ? `${maiorGasto.descricao} — ${formatarMoeda(maiorGasto.valor)}` : '—';
  document.getElementById('rel-media-diaria').textContent = formatarMoeda(mDiaria);
  document.getElementById('rel-media-mensal').textContent = formatarMoeda(mMensal);

  renderGraficoFluxo('grafico-evolucao', dados.transacoes, periodoRelatorio === '1a' ? '1a' : '6m');

  const entradas = renderGraficoCategorias('grafico-relatorio-categorias', transacoes);
  const legenda = document.getElementById('legenda-relatorio-categorias');
  if (legenda) {
    if (!entradas || entradas.length === 0) {
      legenda.innerHTML = '<p class="text-muted" style="font-size:13px;">Nenhuma despesa neste período.</p>';
    } else {
      const total = entradas.reduce((s, [, v]) => s + v, 0);
      legenda.innerHTML = entradas.map(([id, valor]) => {
        const cat = getCategoria(id);
        const pct = total > 0 ? (valor / total) * 100 : 0;
        return `<div class="row"><span class="swatch" style="background:${cat.cor}"></span><span class="name">${cat.icone} ${cat.nome}</span><span class="val">${formatarMoeda(valor)}</span><span class="pct">${pct.toFixed(0)}%</span></div>`;
      }).join('');
    }
  }
}

function inicializarPaginaRelatorios() {
  const container = document.getElementById('relatorio-stats');
  if (!container) return;

  const select = document.getElementById('select-periodo-relatorio');
  select.addEventListener('change', () => {
    periodoRelatorio = select.value;
    renderRelatorios();
  });

  renderRelatorios();
  document.addEventListener('financas:atualizado', renderRelatorios);
  document.addEventListener('tema:alterado', renderRelatorios);
}

document.addEventListener('DOMContentLoaded', inicializarPaginaRelatorios);

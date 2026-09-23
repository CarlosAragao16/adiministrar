/**
 * charts.js
 * Funções utilitárias para criação e atualização dos gráficos (Chart.js).
 */

const registroGraficos = {};

function corTema(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function configuracaoBaseChart() {
  return {
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: corTema('--surface'),
        titleColor: corTema('--text'),
        bodyColor: corTema('--text-muted'),
        borderColor: corTema('--border'),
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: true
      }
    },
    responsive: true,
    maintainAspectRatio: false
  };
}

/* ---------------------------------------------------------------------- */
/* GRÁFICO DE FLUXO (Receitas x Despesas)                                   */
/* ---------------------------------------------------------------------- */

function renderGraficoFluxo(canvasId, transacoes, periodo = '6m') {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;

  let labels = [];
  let receitas = [];
  let despesas = [];

  if (periodo === '7d' || periodo === '30d') {
    const dias = periodo === '7d' ? 7 : 30;
    for (let i = dias - 1; i >= 0; i--) {
      const dataIso = isoHoje(-i);
      const doDia = transacoes.filter(t => t.data === dataIso);
      labels.push(new Date(dataIso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: dias > 7 ? undefined : 'short' }));
      receitas.push(totalReceitas(doDia));
      despesas.push(totalDespesas(doDia));
    }
  } else {
    const meses = periodo === '1a' ? 12 : 6;
    const evolucao = evolucaoMensal(transacoes, meses);
    labels = evolucao.map(m => m.mes.charAt(0).toUpperCase() + m.mes.slice(1));
    receitas = evolucao.map(m => m.receitas);
    despesas = evolucao.map(m => m.despesas);
  }

  if (registroGraficos[canvasId]) registroGraficos[canvasId].destroy();

  registroGraficos[canvasId] = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Receitas',
          data: receitas,
          borderColor: corTema('--success'),
          backgroundColor: hexParaRgba(corTema('--success'), 0.12),
          fill: true,
          tension: 0.35,
          pointRadius: 2,
          borderWidth: 2.5
        },
        {
          label: 'Despesas',
          data: despesas,
          borderColor: corTema('--danger'),
          backgroundColor: hexParaRgba(corTema('--danger'), 0.1),
          fill: true,
          tension: 0.35,
          pointRadius: 2,
          borderWidth: 2.5
        }
      ]
    },
    options: {
      ...configuracaoBaseChart(),
      plugins: { ...configuracaoBaseChart().plugins, legend: { display: true, position: 'top', align: 'end', labels: { color: corTema('--text-muted'), boxWidth: 10, usePointStyle: true, font: { size: 11 } } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: corTema('--text-muted'), font: { size: 11 } } },
        y: { grid: { color: corTema('--border') }, ticks: { color: corTema('--text-muted'), font: { size: 11 }, callback: v => 'R$ ' + v } }
      }
    }
  });
}

/* ---------------------------------------------------------------------- */
/* GRÁFICO DE CATEGORIAS (Donut)                                            */
/* ---------------------------------------------------------------------- */

function renderGraficoCategorias(canvasId, transacoes) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;

  const totais = totalPorCategoria(transacoes, 'despesa');
  const entradas = Object.entries(totais).sort((a, b) => b[1] - a[1]);
  const labels = entradas.map(([id]) => getCategoria(id).nome);
  const valores = entradas.map(([, v]) => v);
  const cores = entradas.map(([id]) => getCategoria(id).cor);

  if (registroGraficos[canvasId]) registroGraficos[canvasId].destroy();

  if (entradas.length === 0) {
    return null;
  }

  registroGraficos[canvasId] = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: { labels, datasets: [{ data: valores, backgroundColor: cores, borderWidth: 3, borderColor: corTema('--surface'), hoverOffset: 6 }] },
    options: {
      ...configuracaoBaseChart(),
      cutout: '68%',
      plugins: { ...configuracaoBaseChart().plugins }
    }
  });

  return entradas;
}

function hexParaRgba(hex, alpha) {
  hex = hex.replace('#', '').trim();
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r || 0}, ${g || 0}, ${b || 0}, ${alpha})`;
}

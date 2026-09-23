/**
 * orcamento.js — lógica da página de Orçamento mensal
 */

function renderOrcamentos() {
  const lista = document.getElementById('lista-orcamentos');
  if (!lista) return;
  const dados = loadData();

  if (dados.orcamentos.length === 0) {
    lista.innerHTML = `<div class="empty-state"><div class="ic">📊</div><h3>Nenhum orçamento definido</h3><p>Defina limites mensais por categoria para manter seus gastos sob controle.</p></div>`;
    atualizarResumoOrcamento(dados);
    return;
  }

  lista.innerHTML = dados.orcamentos.map(o => {
    const cat = getCategoria(o.categoria);
    const u = orcamentoUtilizado(o, dados.transacoes);
    const classeBarra = u.ultrapassou ? 'danger' : (u.percentual >= 80 ? 'warn' : '');
    return `
    <div class="budget-row" data-id="${o.id}">
      <div class="budget-head">
        <span class="cat">${cat.icone} ${cat.nome}</span>
        <span class="vals">${formatarMoeda(u.gasto)} / ${formatarMoeda(o.limite)}</span>
      </div>
      <div class="progress-track"><div class="progress-fill ${classeBarra}" style="width:${Math.min(100, u.percentual)}%"></div></div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
        <span class="text-muted" style="font-size:12px;">${u.percentual.toFixed(0)}% utilizado</span>
        <div style="display:flex; gap:4px;">
          <button class="icon-btn btn-sm" data-acao="editar-orc" data-tooltip="Editar">✏️</button>
          <button class="icon-btn btn-sm" data-acao="excluir-orc" data-tooltip="Excluir">🗑️</button>
        </div>
      </div>
      ${u.ultrapassou
        ? `<div class="budget-alert over">⚠️ Você ultrapassou o orçamento desta categoria.</div>`
        : (u.percentual >= 80 ? `<div class="budget-alert">⚠️ Orçamento próximo do limite.</div>` : '')}
    </div>`;
  }).join('');

  lista.querySelectorAll('[data-acao="editar-orc"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.closest('.budget-row').dataset.id;
      const orc = dados.orcamentos.find(o => o.id === id);
      abrirModalOrcamento(orc);
    });
  });
  lista.querySelectorAll('[data-acao="excluir-orc"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.closest('.budget-row').dataset.id;
      confirmarAcao({
        titulo: 'Remover orçamento?',
        mensagem: 'O limite definido para esta categoria será removido.',
        onConfirm: () => { deleteOrcamento(id); showToast('Orçamento removido.', 'success'); renderOrcamentos(); }
      });
    });
  });

  atualizarResumoOrcamento(dados);
}

function atualizarResumoOrcamento(dados) {
  const totalLimite = dados.orcamentos.reduce((s, o) => s + o.limite, 0);
  const totalGasto = dados.orcamentos.reduce((s, o) => s + orcamentoUtilizado(o, dados.transacoes).gasto, 0);
  const elLimite = document.getElementById('resumo-limite-total');
  const elGasto = document.getElementById('resumo-gasto-total');
  const elBarra = document.getElementById('resumo-barra-total');
  if (elLimite) elLimite.textContent = formatarMoeda(totalLimite);
  if (elGasto) elGasto.textContent = formatarMoeda(totalGasto);
  if (elBarra) {
    const pct = totalLimite > 0 ? Math.min(100, (totalGasto / totalLimite) * 100) : 0;
    elBarra.style.width = pct + '%';
    elBarra.className = 'progress-fill' + (pct >= 100 ? ' danger' : pct >= 80 ? ' warn' : '');
  }
}

function popularSelectCategoriaOrcamento() {
  const sel = document.getElementById('orc-categoria');
  if (!sel) return;
  sel.innerHTML = CATEGORIAS_DESPESA.map(c => `<option value="${c.id}">${c.icone} ${c.nome}</option>`).join('');
}

function abrirModalOrcamento(orc = null) {
  popularSelectCategoriaOrcamento();
  document.getElementById('form-orcamento').reset();
  if (orc) {
    document.getElementById('titulo-modal-orcamento').textContent = 'Editar orçamento';
    document.getElementById('orc-categoria').value = orc.categoria;
    document.getElementById('orc-categoria').disabled = true;
    document.getElementById('orc-limite').value = orc.limite;
  } else {
    document.getElementById('titulo-modal-orcamento').textContent = 'Definir orçamento';
    document.getElementById('orc-categoria').disabled = false;
  }
  openModal('modal-orcamento');
}

function salvarOrcamentoDoFormulario() {
  const categoria = document.getElementById('orc-categoria').value;
  const limiteInput = document.getElementById('orc-limite');
  const limite = parseFloat(limiteInput.value);
  if (!validarCampo(limiteInput, limite > 0, 'Informe um limite válido.')) return;

  setOrcamento(categoria, limite);
  closeModal('modal-orcamento');
  showToast('Orçamento salvo com sucesso!', 'success');
  renderOrcamentos();
}

function inicializarPaginaOrcamento() {
  const lista = document.getElementById('lista-orcamentos');
  if (!lista) return;

  renderOrcamentos();
  document.getElementById('btn-novo-orcamento').addEventListener('click', () => abrirModalOrcamento());
  document.getElementById('btn-salvar-orcamento').addEventListener('click', salvarOrcamentoDoFormulario);

  document.addEventListener('financas:atualizado', renderOrcamentos);
}

document.addEventListener('DOMContentLoaded', inicializarPaginaOrcamento);

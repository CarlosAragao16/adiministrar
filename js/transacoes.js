/**
 * transacoes.js
 * Contém a lógica do modal "Nova/Editar transação" (usado em várias páginas)
 * e, quando presente na página, a lógica completa da tela de Transações
 * (busca, filtros, ordenação, editar, excluir, duplicar).
 */

/* ---------------------------------------------------------------------- */
/* MODAL — usado no Dashboard e na página de Transações                    */
/* ---------------------------------------------------------------------- */

function popularSelectsTransacao(tipo) {
  const selCategoria = document.getElementById('tx-categoria');
  const selForma = document.getElementById('tx-forma');
  if (selCategoria) {
    const categorias = tipo === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
    selCategoria.innerHTML = categorias.map(c => `<option value="${c.id}">${c.icone} ${c.nome}</option>`).join('');
  }
  if (selForma && !selForma.options.length) {
    selForma.innerHTML = FORMAS_PAGAMENTO.map(f => `<option value="${f}">${f}</option>`).join('');
  }
}

function inicializarModalTransacao() {
  const toggleTipo = document.getElementById('toggle-tipo');
  if (!toggleTipo) return;

  toggleTipo.addEventListener('click', e => {
    const btn = e.target.closest('button[data-tipo]');
    if (!btn) return;
    toggleTipo.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    popularSelectsTransacao(btn.dataset.tipo);
  });

  popularSelectsTransacao('despesa');

  const btnSalvar = document.getElementById('btn-salvar-transacao');
  if (btnSalvar) btnSalvar.addEventListener('click', salvarTransacaoDoFormulario);
}

function abrirModalTransacao(idParaEditar = null) {
  const modal = document.getElementById('modal-transacao');
  if (!modal) return;
  const form = document.getElementById('form-transacao');
  form.reset();
  document.getElementById('tx-id').value = '';
  document.getElementById('tx-data').value = isoHoje(0);
  document.querySelectorAll('#form-transacao .field').forEach(f => f.classList.remove('has-error'));

  const toggleTipo = document.getElementById('toggle-tipo');
  toggleTipo.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.tipo === 'despesa'));
  popularSelectsTransacao('despesa');

  if (idParaEditar) {
    const dados = loadData();
    const t = dados.transacoes.find(x => x.id === idParaEditar);
    if (t) {
      document.getElementById('titulo-modal-transacao').textContent = 'Editar transação';
      document.getElementById('tx-id').value = t.id;
      document.getElementById('tx-descricao').value = t.descricao;
      document.getElementById('tx-valor').value = t.valor;
      document.getElementById('tx-data').value = t.data;
      document.getElementById('tx-observacao').value = t.observacao || '';
      toggleTipo.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.tipo === t.tipo));
      popularSelectsTransacao(t.tipo);
      document.getElementById('tx-categoria').value = t.categoria;
      document.getElementById('tx-forma').value = t.formaPagamento;
    }
  } else {
    document.getElementById('titulo-modal-transacao').textContent = 'Nova transação';
  }

  openModal('modal-transacao');
}

function salvarTransacaoDoFormulario() {
  const descricao = document.getElementById('tx-descricao');
  const valor = document.getElementById('tx-valor');
  const data = document.getElementById('tx-data');
  const categoria = document.getElementById('tx-categoria');
  const forma = document.getElementById('tx-forma');
  const observacao = document.getElementById('tx-observacao');
  const id = document.getElementById('tx-id').value;
  const tipo = document.querySelector('#toggle-tipo button.active').dataset.tipo;

  const descOk = validarCampo(descricao, descricao.value.trim().length > 0, 'Informe uma descrição.');
  const valorOk = validarCampo(valor, parseFloat(valor.value) > 0, 'Informe um valor válido.');
  const dataOk = validarCampo(data, !!data.value, 'Informe a data.');
  if (!descOk || !valorOk || !dataOk) return;

  const payload = {
    tipo,
    descricao: descricao.value.trim(),
    valor: parseFloat(valor.value),
    data: data.value,
    categoria: categoria.value,
    formaPagamento: forma.value,
    observacao: observacao.value.trim()
  };

  if (id) {
    updateTransacao(id, payload);
    showToast('Transação atualizada com sucesso!', 'success');
  } else {
    addTransacao(payload);
    showToast('Transação adicionada com sucesso!', 'success');
  }

  closeModal('modal-transacao');
  document.dispatchEvent(new CustomEvent('financas:atualizado'));
}

/* ---------------------------------------------------------------------- */
/* RENDERIZAÇÃO DE LINHA (usada no Dashboard e na página de Transações)     */
/* ---------------------------------------------------------------------- */

function linhaTransacaoHtml(t) {
  const cat = getCategoria(t.categoria);
  const sinal = t.tipo === 'receita' ? '+' : '-';
  return `
  <div class="tx-row" data-id="${t.id}">
    <div class="tx-icon">${cat.icone}</div>
    <div class="tx-info">
      <div class="desc">${t.descricao}</div>
      <div class="meta">${cat.nome} · ${formatarData(t.data)}${t.formaPagamento ? ' · ' + t.formaPagamento : ''}</div>
    </div>
    <div class="tx-value ${t.tipo}">${sinal} ${formatarMoeda(t.valor)}</div>
    <div class="tx-actions">
      <button class="icon-btn btn-sm" data-acao="editar-tx" data-tooltip="Editar" aria-label="Editar transação">✏️</button>
      <button class="icon-btn btn-sm" data-acao="duplicar-tx" data-tooltip="Duplicar" aria-label="Duplicar transação">📄</button>
      <button class="icon-btn btn-sm" data-acao="excluir-tx" data-tooltip="Excluir" aria-label="Excluir transação">🗑️</button>
    </div>
  </div>`;
}

function vincularAcoesTransacao(container) {
  container.querySelectorAll('[data-acao="editar-tx"]').forEach(btn => {
    btn.addEventListener('click', () => abrirModalTransacao(btn.closest('.tx-row').dataset.id));
  });
  container.querySelectorAll('[data-acao="duplicar-tx"]').forEach(btn => {
    btn.addEventListener('click', () => {
      duplicateTransacao(btn.closest('.tx-row').dataset.id);
      showToast('Transação duplicada.', 'success');
      document.dispatchEvent(new CustomEvent('financas:atualizado'));
    });
  });
  container.querySelectorAll('[data-acao="excluir-tx"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.closest('.tx-row').dataset.id;
      confirmarAcao({
        titulo: 'Excluir transação?',
        mensagem: 'Essa ação não pode ser desfeita.',
        onConfirm: () => {
          deleteTransacao(id);
          showToast('Transação excluída.', 'success');
          document.dispatchEvent(new CustomEvent('financas:atualizado'));
        }
      });
    });
  });
}

/* ---------------------------------------------------------------------- */
/* PÁGINA COMPLETA DE TRANSAÇÕES                                            */
/* ---------------------------------------------------------------------- */

let filtrosTransacoes = { busca: '', periodo: 'todos', categoria: 'todas', tipo: 'todos', forma: 'todas', ordenar: 'recentes' };

function aplicarFiltrosTransacoes(transacoes) {
  let lista = [...transacoes];
  const f = filtrosTransacoes;

  if (f.busca) {
    const termo = f.busca.toLowerCase();
    lista = lista.filter(t => t.descricao.toLowerCase().includes(termo) || getCategoria(t.categoria).nome.toLowerCase().includes(termo));
  }
  if (f.tipo !== 'todos') lista = lista.filter(t => t.tipo === f.tipo);
  if (f.categoria !== 'todas') lista = lista.filter(t => t.categoria === f.categoria);
  if (f.forma !== 'todas') lista = lista.filter(t => t.formaPagamento === f.forma);

  if (f.periodo !== 'todos') {
    const dias = { '7d': 7, '30d': 30, '90d': 90 }[f.periodo];
    if (dias) {
      const limite = isoHoje(-dias);
      lista = lista.filter(t => t.data >= limite);
    }
  }

  switch (f.ordenar) {
    case 'antigas': lista.sort((a, b) => a.data.localeCompare(b.data)); break;
    case 'maior': lista.sort((a, b) => b.valor - a.valor); break;
    case 'menor': lista.sort((a, b) => a.valor - b.valor); break;
    default: lista.sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm));
  }

  return lista;
}

function renderTabelaTransacoes() {
  const corpo = document.getElementById('corpo-tabela-transacoes');
  const contador = document.getElementById('contador-transacoes');
  if (!corpo) return;

  const dados = loadData();
  const lista = aplicarFiltrosTransacoes(dados.transacoes);

  if (contador) contador.textContent = `${lista.length} transaç${lista.length === 1 ? 'ão' : 'ões'}`;

  if (lista.length === 0) {
    corpo.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="ic">🔎</div><h3>Nenhuma transação encontrada</h3><p>Tente ajustar os filtros ou a busca.</p></div></td></tr>`;
    return;
  }

  corpo.innerHTML = lista.map(t => {
    const cat = getCategoria(t.categoria);
    const sinal = t.tipo === 'receita' ? '+' : '-';
    return `<tr data-id="${t.id}">
      <td data-label="Descrição"><strong>${cat.icone} ${t.descricao}</strong></td>
      <td data-label="Categoria">${cat.nome}</td>
      <td data-label="Data">${formatarData(t.data)}</td>
      <td data-label="Pagamento">${t.formaPagamento || '—'}</td>
      <td data-label="Valor"><span class="tx-value ${t.tipo}">${sinal} ${formatarMoeda(t.valor)}</span></td>
      <td data-label="Ações">
        <div style="display:flex; gap:4px; justify-content:flex-end;">
          <button class="icon-btn btn-sm" data-acao="editar-tx" data-tooltip="Editar">✏️</button>
          <button class="icon-btn btn-sm" data-acao="duplicar-tx" data-tooltip="Duplicar">📄</button>
          <button class="icon-btn btn-sm" data-acao="excluir-tx" data-tooltip="Excluir">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  corpo.querySelectorAll('[data-acao="editar-tx"]').forEach(btn => btn.addEventListener('click', () => abrirModalTransacao(btn.closest('tr').dataset.id)));
  corpo.querySelectorAll('[data-acao="duplicar-tx"]').forEach(btn => btn.addEventListener('click', () => {
    duplicateTransacao(btn.closest('tr').dataset.id);
    showToast('Transação duplicada.', 'success');
    document.dispatchEvent(new CustomEvent('financas:atualizado'));
  }));
  corpo.querySelectorAll('[data-acao="excluir-tx"]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.closest('tr').dataset.id;
    confirmarAcao({
      titulo: 'Excluir transação?',
      mensagem: 'Essa ação não pode ser desfeita.',
      onConfirm: () => {
        deleteTransacao(id);
        showToast('Transação excluída.', 'success');
        document.dispatchEvent(new CustomEvent('financas:atualizado'));
      }
    });
  }));
}

function popularFiltroCategorias() {
  const sel = document.getElementById('filtro-categoria');
  if (!sel) return;
  sel.innerHTML = '<option value="todas">Todas as categorias</option>' + todosCategorias().map(c => `<option value="${c.id}">${c.icone} ${c.nome}</option>`).join('');
}

function popularFiltroFormas() {
  const sel = document.getElementById('filtro-forma');
  if (!sel) return;
  sel.innerHTML = '<option value="todas">Todas as formas</option>' + FORMAS_PAGAMENTO.map(f => `<option value="${f}">${f}</option>`).join('');
}

function inicializarPaginaTransacoes() {
  const tabela = document.getElementById('corpo-tabela-transacoes');
  if (!tabela) return;

  popularFiltroCategorias();
  popularFiltroFormas();

  document.getElementById('filtro-busca').addEventListener('input', debounce(e => {
    filtrosTransacoes.busca = e.target.value;
    renderTabelaTransacoes();
  }, 200));

  document.getElementById('filtro-periodo').addEventListener('change', e => { filtrosTransacoes.periodo = e.target.value; renderTabelaTransacoes(); });
  document.getElementById('filtro-categoria').addEventListener('change', e => { filtrosTransacoes.categoria = e.target.value; renderTabelaTransacoes(); });
  document.getElementById('filtro-tipo').addEventListener('change', e => { filtrosTransacoes.tipo = e.target.value; renderTabelaTransacoes(); });
  document.getElementById('filtro-forma').addEventListener('change', e => { filtrosTransacoes.forma = e.target.value; renderTabelaTransacoes(); });
  document.getElementById('filtro-ordenar').addEventListener('change', e => { filtrosTransacoes.ordenar = e.target.value; renderTabelaTransacoes(); });

  renderTabelaTransacoes();

  document.addEventListener('financas:atualizado', renderTabelaTransacoes);
}

document.addEventListener('DOMContentLoaded', () => {
  inicializarModalTransacao();
  inicializarPaginaTransacoes();
});

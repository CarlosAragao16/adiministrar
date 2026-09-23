/**
 * metas.js — lógica da página de Metas financeiras
 */

const ICONES_META = {
  'Reserva de emergência': '🛟',
  'Viagem': '✈️',
  'Carro': '🚗',
  'Casa': '🏡',
  'Investimentos': '📈',
  'Compra': '🛍️'
};

function iconeMeta(categoria) {
  return ICONES_META[categoria] || '🎯';
}

function renderMetas() {
  const grid = document.getElementById('grid-metas');
  if (!grid) return;
  const dados = loadData();

  if (dados.metas.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="ic">🎯</div><h3>Nenhuma meta criada ainda</h3><p>Crie sua primeira meta financeira para começar a acompanhar seu progresso.</p></div>`;
    return;
  }

  grid.innerHTML = dados.metas.map(m => {
    const pct = percentualMeta(m);
    const restante = valorRestanteMeta(m);
    const porMes = quantoGuardarPorMes(m);
    const concluida = pct >= 100;
    return `
    <div class="card meta-card" data-id="${m.id}">
      <div class="meta-top">
        <div>
          <div class="meta-icon">${iconeMeta(m.categoria)}</div>
          <h4>${m.nome}</h4>
        </div>
        <div class="menu-btn" style="position:relative;">
          <button class="icon-btn btn-sm" data-dropdown-trigger="menu-meta-${m.id}">⋮</button>
          <div class="menu-panel" id="menu-meta-${m.id}">
            <button data-acao="aportar-meta">💰 Adicionar valor</button>
            <button data-acao="editar-meta">✏️ Editar</button>
            <button data-acao="excluir-meta" class="danger">🗑️ Excluir</button>
          </div>
        </div>
      </div>
      ${m.descricao ? `<p class="text-muted" style="font-size:12.5px;">${m.descricao}</p>` : ''}
      <div class="valores">
        <strong>${formatarMoeda(m.valorAtual)}</strong>
        <span class="text-muted">de ${formatarMoeda(m.valorObjetivo)}</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="rodape">
        <span class="${concluida ? 'text-success' : ''}">${concluida ? '✅ Concluída' : pct.toFixed(0) + '% concluída'}</span>
        <span>${m.prazo ? 'até ' + formatarData(m.prazo) : 'sem prazo'}</span>
      </div>
      ${!concluida ? `<div class="text-muted" style="font-size:12px;">Faltam ${formatarMoeda(restante)}${porMes ? ` · guarde ~${formatarMoeda(porMes)}/mês` : ''}</div>` : ''}
    </div>`;
  }).join('');

  vincularAcoesMetas();
}

function vincularAcoesMetas() {
  document.querySelectorAll('[data-dropdown-trigger^="menu-meta-"]').forEach(trigger => {
    const id = trigger.getAttribute('data-dropdown-trigger');
    const painel = document.getElementById(id);
    trigger.onclick = e => {
      e.stopPropagation();
      document.querySelectorAll('.menu-panel.open, .dropdown-panel.open').forEach(p => { if (p !== painel) p.classList.remove('open'); });
      painel.classList.toggle('open');
    };
  });

  document.querySelectorAll('.meta-card').forEach(card => {
    const id = card.dataset.id;
    const btnAportar = card.querySelector('[data-acao="aportar-meta"]');
    const btnEditar = card.querySelector('[data-acao="editar-meta"]');
    const btnExcluir = card.querySelector('[data-acao="excluir-meta"]');

    if (btnAportar) btnAportar.addEventListener('click', () => abrirModalAporte(id));
    if (btnEditar) btnEditar.addEventListener('click', () => abrirModalMeta(id));
    if (btnExcluir) btnExcluir.addEventListener('click', () => {
      confirmarAcao({
        titulo: 'Excluir meta?',
        mensagem: 'Todo o progresso registrado nessa meta será perdido.',
        onConfirm: () => { deleteMeta(id); showToast('Meta excluída.', 'success'); renderMetas(); }
      });
    });
  });
}

/* ---------------------------------------------------------------------- */
/* MODAL — Criar / Editar Meta                                             */
/* ---------------------------------------------------------------------- */

function abrirModalMeta(idParaEditar = null) {
  const form = document.getElementById('form-meta');
  form.reset();
  document.getElementById('meta-id').value = '';
  document.getElementById('meta-inicial-wrap').style.display = 'block';

  if (idParaEditar) {
    const dados = loadData();
    const m = dados.metas.find(x => x.id === idParaEditar);
    if (m) {
      document.getElementById('titulo-modal-meta').textContent = 'Editar meta';
      document.getElementById('meta-id').value = m.id;
      document.getElementById('meta-nome').value = m.nome;
      document.getElementById('meta-objetivo').value = m.valorObjetivo;
      document.getElementById('meta-prazo').value = m.prazo || '';
      document.getElementById('meta-categoria').value = m.categoria;
      document.getElementById('meta-descricao').value = m.descricao || '';
      document.getElementById('meta-inicial-wrap').style.display = 'none';
    }
  } else {
    document.getElementById('titulo-modal-meta').textContent = 'Criar meta';
  }
  atualizarResumoMeta();
  openModal('modal-meta');
}

function atualizarResumoMeta() {
  const objetivo = parseFloat(document.getElementById('meta-objetivo').value) || 0;
  const inicial = parseFloat(document.getElementById('meta-inicial').value) || 0;
  const prazo = document.getElementById('meta-prazo').value;
  const resumo = document.getElementById('resumo-meta');
  if (!resumo) return;

  const restante = Math.max(0, objetivo - inicial);
  const pct = objetivo > 0 ? Math.min(100, (inicial / objetivo) * 100) : 0;
  let porMes = null;
  if (prazo) {
    const meses = Math.max(1, Math.round((new Date(prazo) - new Date()) / (1000 * 60 * 60 * 24 * 30)));
    porMes = restante / meses;
  }

  resumo.innerHTML = `
    <div class="row"><span>Falta juntar</span><strong>${formatarMoeda(restante)}</strong></div>
    <div class="row"><span>Percentual concluído</span><strong>${pct.toFixed(0)}%</strong></div>
    <div class="row"><span>Guardar por mês</span><strong>${porMes !== null ? formatarMoeda(porMes) : '—'}</strong></div>`;
}

function salvarMetaDoFormulario() {
  const nome = document.getElementById('meta-nome');
  const objetivo = document.getElementById('meta-objetivo');
  const inicial = document.getElementById('meta-inicial');
  const prazo = document.getElementById('meta-prazo');
  const categoria = document.getElementById('meta-categoria');
  const descricao = document.getElementById('meta-descricao');
  const id = document.getElementById('meta-id').value;

  const nomeOk = validarCampo(nome, nome.value.trim().length > 0, 'Dê um nome para a meta.');
  const objetivoOk = validarCampo(objetivo, parseFloat(objetivo.value) > 0, 'Informe um valor objetivo válido.');
  if (!nomeOk || !objetivoOk) return;

  if (id) {
    updateMeta(id, {
      nome: nome.value.trim(),
      valorObjetivo: parseFloat(objetivo.value),
      prazo: prazo.value,
      categoria: categoria.value,
      descricao: descricao.value.trim()
    });
    showToast('Meta atualizada com sucesso!', 'success');
  } else {
    addMeta({
      nome: nome.value.trim(),
      valorObjetivo: parseFloat(objetivo.value),
      valorInicial: parseFloat(inicial.value) || 0,
      prazo: prazo.value,
      categoria: categoria.value,
      descricao: descricao.value.trim()
    });
    showToast('Meta criada com sucesso!', 'success');
  }

  closeModal('modal-meta');
  renderMetas();
}

/* ---------------------------------------------------------------------- */
/* MODAL — Aportar valor                                                    */
/* ---------------------------------------------------------------------- */

function abrirModalAporte(id) {
  document.getElementById('aporte-meta-id').value = id;
  document.getElementById('aporte-valor').value = '';
  openModal('modal-aporte');
}

function salvarAporte() {
  const id = document.getElementById('aporte-meta-id').value;
  const valorInput = document.getElementById('aporte-valor');
  const valor = parseFloat(valorInput.value);
  if (!validarCampo(valorInput, valor > 0, 'Informe um valor válido.')) return;
  aportarMeta(id, valor);
  closeModal('modal-aporte');
  showToast('Valor adicionado à meta!', 'success');
  renderMetas();
}

function inicializarPaginaMetas() {
  const grid = document.getElementById('grid-metas');
  if (!grid) return;

  renderMetas();

  document.getElementById('btn-nova-meta').addEventListener('click', () => abrirModalMeta());
  document.getElementById('btn-salvar-meta').addEventListener('click', salvarMetaDoFormulario);
  document.getElementById('btn-salvar-aporte').addEventListener('click', salvarAporte);
  ['meta-objetivo', 'meta-inicial', 'meta-prazo'].forEach(id => {
    document.getElementById(id).addEventListener('input', atualizarResumoMeta);
  });
}

document.addEventListener('DOMContentLoaded', inicializarPaginaMetas);

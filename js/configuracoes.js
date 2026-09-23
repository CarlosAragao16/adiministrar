/**
 * configuracoes.js — lógica da página de Configurações
 */

function inicializarNavegacaoConfiguracoes() {
  const botoes = document.querySelectorAll('.settings-nav button');
  const secoes = document.querySelectorAll('.settings-section');
  botoes.forEach(btn => {
    btn.addEventListener('click', () => {
      botoes.forEach(b => b.classList.remove('active'));
      secoes.forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('secao-' + btn.dataset.secao).classList.add('active');
    });
  });
}

/* ---------------------------------------------------------------------- */
/* PERFIL                                                                   */
/* ---------------------------------------------------------------------- */

function carregarPerfil() {
  const dados = loadData();
  document.getElementById('perfil-nome').value = dados.perfil.nome;
  document.getElementById('perfil-email').value = dados.perfil.email;
}

function salvarPerfil() {
  const nome = document.getElementById('perfil-nome');
  const email = document.getElementById('perfil-email');
  const nomeOk = validarCampo(nome, nome.value.trim().length > 0, 'Informe seu nome.');
  const emailOk = validarCampo(email, /\S+@\S+\.\S+/.test(email.value), 'Informe um e-mail válido.');
  if (!nomeOk || !emailOk) return;

  updatePerfil({ nome: nome.value.trim(), email: email.value.trim() });
  montarPerfil();
  showToast('Perfil atualizado com sucesso!', 'success');
}

/* ---------------------------------------------------------------------- */
/* PREFERÊNCIAS                                                             */
/* ---------------------------------------------------------------------- */

function carregarPreferencias() {
  const dados = loadData();
  document.getElementById('pref-moeda').value = dados.perfil.moeda || 'BRL';
  document.getElementById('pref-idioma').value = dados.perfil.idioma || 'pt-BR';
  const temaAtual = document.documentElement.getAttribute('data-theme') || 'light';
  document.getElementById('pref-tema').value = temaAtual;
}

function salvarPreferencias() {
  const moeda = document.getElementById('pref-moeda').value;
  const idioma = document.getElementById('pref-idioma').value;
  const tema = document.getElementById('pref-tema').value;

  updatePerfil({ moeda, idioma });
  if (tema !== (document.documentElement.getAttribute('data-theme') || 'light')) alternarTema();

  showToast('Preferências salvas com sucesso!', 'success');
}

/* ---------------------------------------------------------------------- */
/* CATEGORIAS                                                               */
/* ---------------------------------------------------------------------- */

function renderCategorias() {
  const lista = document.getElementById('lista-categorias-config');
  if (!lista) return;
  lista.innerHTML = CATEGORIAS_DESPESA.map(c => `
    <div class="settings-row">
      <div class="lbl"><strong>${c.icone} ${c.nome}</strong><span>Categoria de despesa</span></div>
      <span class="pill pill-muted">Padrão</span>
    </div>`).join('') + CATEGORIAS_RECEITA.map(c => `
    <div class="settings-row">
      <div class="lbl"><strong>${c.icone} ${c.nome}</strong><span>Categoria de receita</span></div>
      <span class="pill pill-muted">Padrão</span>
    </div>`).join('');
}

/* ---------------------------------------------------------------------- */
/* CONTAS RECORRENTES                                                       */
/* ---------------------------------------------------------------------- */

function renderContasRecorrentesConfig() {
  const lista = document.getElementById('lista-recorrentes-config');
  if (!lista) return;
  const dados = loadData();

  if (dados.contasRecorrentes.length === 0) {
    lista.innerHTML = `<div class="empty-state"><div class="ic">🔄</div><h3>Nenhuma conta recorrente</h3><p>Cadastre assinaturas e contas fixas para receber lembretes de vencimento.</p></div>`;
    return;
  }

  lista.innerHTML = dados.contasRecorrentes.map(c => {
    const cat = getCategoria(c.categoria);
    return `<div class="recurring-row" data-id="${c.id}">
      <div class="tx-icon">${cat.icone}</div>
      <div class="info">
        <strong>${c.nome}</strong>
        <span>${formatarMoeda(c.valor)} · vence dia ${c.diaVencimento} · ${c.periodicidade}</span>
      </div>
      <label class="switch">
        <input type="checkbox" data-acao="toggle-recorrente" ${c.ativo ? 'checked' : ''}>
        <span class="track"></span>
      </label>
      <button class="icon-btn btn-sm" data-acao="excluir-recorrente" data-tooltip="Excluir">🗑️</button>
    </div>`;
  }).join('');

  lista.querySelectorAll('[data-acao="toggle-recorrente"]').forEach(input => {
    input.addEventListener('change', () => {
      const id = input.closest('.recurring-row').dataset.id;
      updateContaRecorrente(id, { ativo: input.checked });
      showToast(input.checked ? 'Conta ativada.' : 'Conta desativada.', 'success');
    });
  });
  lista.querySelectorAll('[data-acao="excluir-recorrente"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.closest('.recurring-row').dataset.id;
      confirmarAcao({
        titulo: 'Excluir conta recorrente?',
        mensagem: 'Você deixará de receber lembretes de vencimento para ela.',
        onConfirm: () => { deleteContaRecorrente(id); showToast('Conta removida.', 'success'); renderContasRecorrentesConfig(); }
      });
    });
  });
}

function popularSelectCategoriaRecorrente() {
  const sel = document.getElementById('rec-categoria');
  if (!sel) return;
  sel.innerHTML = CATEGORIAS_DESPESA.map(c => `<option value="${c.id}">${c.icone} ${c.nome}</option>`).join('');
}

function salvarContaRecorrente() {
  const nome = document.getElementById('rec-nome');
  const valor = document.getElementById('rec-valor');
  const dia = document.getElementById('rec-dia');

  const nomeOk = validarCampo(nome, nome.value.trim().length > 0, 'Informe o nome da conta.');
  const valorOk = validarCampo(valor, parseFloat(valor.value) > 0, 'Informe um valor válido.');
  const diaOk = validarCampo(dia, dia.value >= 1 && dia.value <= 31, 'Informe um dia entre 1 e 31.');
  if (!nomeOk || !valorOk || !diaOk) return;

  addContaRecorrente({
    nome: nome.value.trim(),
    valor: parseFloat(valor.value),
    categoria: document.getElementById('rec-categoria').value,
    diaVencimento: parseInt(dia.value, 10),
    periodicidade: document.getElementById('rec-periodicidade').value,
    ativo: true
  });

  closeModal('modal-recorrente');
  document.getElementById('form-recorrente').reset();
  showToast('Conta recorrente adicionada!', 'success');
  renderContasRecorrentesConfig();
}

/* ---------------------------------------------------------------------- */
/* EXPORTAÇÃO DE DADOS                                                      */
/* ---------------------------------------------------------------------- */

function baixarArquivo(conteudo, nomeArquivo, tipo) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportarJSON() {
  const dados = loadData();
  baixarArquivo(JSON.stringify(dados, null, 2), 'financas-ia-dados.json', 'application/json');
  showToast('Dados exportados em JSON!', 'success');
}

function exportarCSV() {
  const dados = loadData();
  const cabecalho = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Forma de pagamento', 'Valor'];
  const linhas = dados.transacoes.map(t => [
    t.data, t.tipo, `"${t.descricao.replace(/"/g, '""')}"`, getCategoria(t.categoria).nome, t.formaPagamento || '', t.valor.toFixed(2)
  ].join(','));
  const csv = [cabecalho.join(','), ...linhas].join('\n');
  baixarArquivo(csv, 'financas-ia-transacoes.csv', 'text/csv');
  showToast('Transações exportadas em CSV!', 'success');
}

/* ---------------------------------------------------------------------- */
/* SEGURANÇA / DADOS                                                        */
/* ---------------------------------------------------------------------- */

function restaurarDadosDemo() {
  confirmarAcao({
    titulo: 'Restaurar dados de demonstração?',
    mensagem: 'Todas as transações, metas e orçamentos atuais serão substituídos pelos dados de exemplo.',
    icone: '♻️',
    textoConfirmar: 'Restaurar',
    onConfirm: () => {
      resetDemoData();
      showToast('Dados de demonstração restaurados!', 'success');
      setTimeout(() => window.location.reload(), 700);
    }
  });
}

function limparTodosDados() {
  confirmarAcao({
    titulo: 'Apagar todos os dados?',
    mensagem: 'Essa ação é irreversível e removerá todas as suas transações, metas e configurações.',
    icone: '🗑️',
    textoConfirmar: 'Apagar tudo',
    onConfirm: () => {
      clearData();
      showToast('Todos os dados foram apagados.', 'success');
      setTimeout(() => window.location.reload(), 700);
    }
  });
}

/* ---------------------------------------------------------------------- */

function inicializarPaginaConfiguracoes() {
  const shell = document.getElementById('secao-perfil');
  if (!shell) return;

  inicializarNavegacaoConfiguracoes();
  carregarPerfil();
  carregarPreferencias();
  renderCategorias();
  renderContasRecorrentesConfig();
  popularSelectCategoriaRecorrente();

  document.getElementById('btn-salvar-perfil').addEventListener('click', salvarPerfil);
  document.getElementById('btn-salvar-preferencias').addEventListener('click', salvarPreferencias);
  document.getElementById('btn-exportar-json').addEventListener('click', exportarJSON);
  document.getElementById('btn-exportar-csv').addEventListener('click', exportarCSV);
  document.getElementById('btn-restaurar-demo').addEventListener('click', restaurarDadosDemo);
  document.getElementById('btn-limpar-dados').addEventListener('click', limparTodosDados);
  document.getElementById('btn-nova-recorrente').addEventListener('click', () => openModal('modal-recorrente'));
  document.getElementById('btn-salvar-recorrente').addEventListener('click', salvarContaRecorrente);
}

document.addEventListener('DOMContentLoaded', inicializarPaginaConfiguracoes);

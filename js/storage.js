/**
 * storage.js
 * Camada de dados do Finanças IA.
 * Responsável por: schema dos dados, seed inicial, persistência em LocalStorage
 * e todas as funções de cálculo financeiro usadas pelas demais páginas.
 */

const DB_KEY = 'financasIA.dados.v1';
const THEME_KEY = 'financasIA.tema';
const AUTH_KEY = 'financasIA.sessao';
const ONBOARD_KEY = 'financasIA.onboarding';

const CATEGORIAS_DESPESA = [
  { id: 'moradia',      nome: 'Moradia',      icone: '🏠', cor: '#6366F1' },
  { id: 'alimentacao',  nome: 'Alimentação',  icone: '🍔', cor: '#F59E0B' },
  { id: 'transporte',   nome: 'Transporte',   icone: '🚗', cor: '#0EA5E9' },
  { id: 'compras',      nome: 'Compras',      icone: '🛒', cor: '#EC4899' },
  { id: 'saude',        nome: 'Saúde',        icone: '💊', cor: '#10B981' },
  { id: 'lazer',        nome: 'Lazer',        icone: '🎮', cor: '#8B5CF6' },
  { id: 'assinaturas',  nome: 'Assinaturas',  icone: '📱', cor: '#F43F5E' },
  { id: 'educacao',     nome: 'Educação',     icone: '📚', cor: '#14B8A6' },
  { id: 'outros',       nome: 'Outros',       icone: '💰', cor: '#6B7280' }
];

const CATEGORIAS_RECEITA = [
  { id: 'salario',      nome: 'Salário',      icone: '💼', cor: '#16A34A' },
  { id: 'freelance',    nome: 'Freelance',    icone: '🧑‍💻', cor: '#0EA5E9' },
  { id: 'investimentos',nome: 'Investimentos',icone: '📈', cor: '#7C3AED' },
  { id: 'outros_rec',   nome: 'Outros',       icone: '💰', cor: '#6B7280' }
];

const FORMAS_PAGAMENTO = ['Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Transferência', 'Boleto'];

function todosCategorias() {
  return [...CATEGORIAS_DESPESA, ...CATEGORIAS_RECEITA];
}

function getCategoria(id) {
  return todosCategorias().find(c => c.id === id) || { id, nome: id, icone: '💰', cor: '#6B7280' };
}

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isoHoje(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}

/* ---------------------------------------------------------------------- */
/* SEED — dados de demonstração                                           */
/* ---------------------------------------------------------------------- */

function gerarDadosDemo() {
  const transacoes = [];

  const add = (tipo, descricao, valor, categoria, offsetDias, formaPagamento, observacao = '') => {
    transacoes.push({
      id: uid('tx'),
      tipo,
      descricao,
      valor: Number(valor),
      categoria,
      data: isoHoje(offsetDias),
      formaPagamento,
      observacao,
      criadoEm: new Date().toISOString()
    });
  };

  // Receitas (mês atual e anterior)
  add('receita', 'Salário — Empresa XPTO', 9800, 'salario', -18, 'Transferência');
  add('receita', 'Projeto freelance — Landing page', 1600, 'freelance', -12, 'Pix');
  add('receita', 'Dividendos carteira', 340, 'investimentos', -6, 'Transferência');
  add('receita', 'Salário — Empresa XPTO', 9800, 'salario', -48, 'Transferência');
  add('receita', 'Reembolso plano de saúde', 260, 'outros_rec', -25, 'Pix');
  add('receita', 'Venda de item usado', 700, 'outros_rec', -3, 'Pix');

  // Despesas variadas
  add('despesa', 'Aluguel', 2200, 'moradia', -27, 'Boleto');
  add('despesa', 'Condomínio', 480, 'moradia', -27, 'Boleto');
  add('despesa', 'Conta de luz', 210, 'moradia', -20, 'Pix');
  add('despesa', 'Supermercado', 540, 'alimentacao', -22, 'Cartão de débito');
  add('despesa', 'Restaurante', 85, 'alimentacao', -1, 'Cartão de crédito');
  add('despesa', 'Ifood', 62, 'alimentacao', -4, 'Pix');
  add('despesa', 'Padaria', 38, 'alimentacao', -9, 'Dinheiro');
  add('despesa', 'Combustível', 260, 'transporte', -15, 'Cartão de débito');
  add('despesa', 'Uber', 46, 'transporte', -2, 'Cartão de crédito');
  add('despesa', 'Estacionamento', 30, 'transporte', -7, 'Dinheiro');
  add('despesa', 'Roupas', 320, 'compras', -11, 'Cartão de crédito');
  add('despesa', 'Eletrônicos', 450, 'compras', -30, 'Cartão de crédito');
  add('despesa', 'Farmácia', 95, 'saude', -14, 'Cartão de débito');
  add('despesa', 'Plano de saúde', 380, 'saude', -25, 'Boleto');
  add('despesa', 'Cinema', 70, 'lazer', -8, 'Cartão de crédito');
  add('despesa', 'Show / evento', 180, 'lazer', -19, 'Pix');
  add('despesa', 'Netflix', 44.90, 'assinaturas', -5, 'Cartão de crédito');
  add('despesa', 'Spotify', 21.90, 'assinaturas', -5, 'Cartão de crédito');
  add('despesa', 'Academia', 99, 'assinaturas', -10, 'Cartão de crédito');
  add('despesa', 'Curso online', 149, 'educacao', -16, 'Pix');
  add('despesa', 'Livros', 87, 'educacao', -21, 'Cartão de débito');
  add('despesa', 'Presente', 120, 'outros', -13, 'Pix');

  // Mês anterior (para comparação de evolução)
  add('despesa', 'Aluguel', 2200, 'moradia', -57, 'Boleto');
  add('despesa', 'Supermercado', 610, 'alimentacao', -50, 'Cartão de débito');
  add('despesa', 'Combustível', 240, 'transporte', -45, 'Cartão de débito');
  add('despesa', 'Netflix', 44.90, 'assinaturas', -35, 'Cartão de crédito');
  add('despesa', 'Farmácia', 60, 'saude', -40, 'Cartão de débito');

  const metas = [
    {
      id: uid('meta'),
      nome: 'Reserva de emergência',
      valorObjetivo: 10000,
      valorAtual: 6500,
      prazo: isoHoje(150),
      categoria: 'Reserva de emergência',
      descricao: 'Equivalente a 6 meses de despesas fixas.',
      criadoEm: new Date().toISOString()
    },
    {
      id: uid('meta'),
      nome: 'Viagem para o Nordeste',
      valorObjetivo: 6000,
      valorAtual: 2100,
      prazo: isoHoje(210),
      categoria: 'Viagem',
      descricao: 'Passagens + hospedagem para 7 dias.',
      criadoEm: new Date().toISOString()
    },
    {
      id: uid('meta'),
      nome: 'Notebook novo',
      valorObjetivo: 5500,
      valorAtual: 4800,
      prazo: isoHoje(40),
      categoria: 'Compra',
      descricao: '',
      criadoEm: new Date().toISOString()
    }
  ];

  const orcamentos = [
    { id: uid('orc'), categoria: 'alimentacao', limite: 1000 },
    { id: uid('orc'), categoria: 'transporte', limite: 600 },
    { id: uid('orc'), categoria: 'lazer', limite: 500 },
    { id: uid('orc'), categoria: 'compras', limite: 700 },
    { id: uid('orc'), categoria: 'assinaturas', limite: 200 }
  ];

  const contasRecorrentes = [
    { id: uid('rec'), nome: 'Netflix', valor: 44.90, categoria: 'assinaturas', diaVencimento: 5, periodicidade: 'Mensal', ativo: true },
    { id: uid('rec'), nome: 'Spotify', valor: 21.90, categoria: 'assinaturas', diaVencimento: 5, periodicidade: 'Mensal', ativo: true },
    { id: uid('rec'), nome: 'Aluguel', valor: 2200, categoria: 'moradia', diaVencimento: 5, periodicidade: 'Mensal', ativo: true },
    { id: uid('rec'), nome: 'Academia', valor: 99, categoria: 'assinaturas', diaVencimento: 10, periodicidade: 'Mensal', ativo: true },
    { id: uid('rec'), nome: 'Internet', valor: 120, categoria: 'moradia', diaVencimento: 15, periodicidade: 'Mensal', ativo: true }
  ];

  const notificacoes = [
    { id: uid('ntf'), texto: 'Seu orçamento de transporte chegou a 97%.', tipo: 'alerta', lida: false, data: isoHoje(0) },
    { id: uid('ntf'), texto: 'Faltam R$ 700 para você concluir a meta "Notebook novo".', tipo: 'meta', lida: false, data: isoHoje(-1) },
    { id: uid('ntf'), texto: 'Novo insight da IA disponível no dashboard.', tipo: 'ia', lida: false, data: isoHoje(-1) },
    { id: uid('ntf'), texto: 'Sua conta "Netflix" vence em 5 dias.', tipo: 'conta', lida: true, data: isoHoje(-2) }
  ];

  return {
    versao: 1,
    perfil: { nome: 'Usuário Demonstração', email: 'demo@financasia.app', moeda: 'BRL', idioma: 'pt-BR' },
    transacoes,
    metas,
    orcamentos,
    contasRecorrentes,
    notificacoes
  };
}

/* ---------------------------------------------------------------------- */
/* PERSISTÊNCIA                                                            */
/* ---------------------------------------------------------------------- */

function saveData(dados) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(dados));
    return true;
  } catch (e) {
    console.error('Erro ao salvar dados:', e);
    return false;
  }
}

function loadData() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      const dados = gerarDadosDemo();
      saveData(dados);
      return dados;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao carregar dados, restaurando demonstração:', e);
    const dados = gerarDadosDemo();
    saveData(dados);
    return dados;
  }
}

function updateData(mutador) {
  const dados = loadData();
  mutador(dados);
  saveData(dados);
  return dados;
}

function clearData() {
  localStorage.removeItem(DB_KEY);
}

function resetDemoData() {
  const dados = gerarDadosDemo();
  saveData(dados);
  return dados;
}

/* ---------------------------------------------------------------------- */
/* CRUD — TRANSAÇÕES                                                       */
/* ---------------------------------------------------------------------- */

function addTransacao(t) {
  return updateData(dados => {
    dados.transacoes.unshift({
      id: uid('tx'),
      criadoEm: new Date().toISOString(),
      ...t,
      valor: Number(t.valor)
    });
  });
}

function updateTransacao(id, patch) {
  return updateData(dados => {
    const idx = dados.transacoes.findIndex(t => t.id === id);
    if (idx !== -1) {
      dados.transacoes[idx] = { ...dados.transacoes[idx], ...patch, valor: Number(patch.valor ?? dados.transacoes[idx].valor) };
    }
  });
}

function deleteTransacao(id) {
  return updateData(dados => {
    dados.transacoes = dados.transacoes.filter(t => t.id !== id);
  });
}

function duplicateTransacao(id) {
  return updateData(dados => {
    const original = dados.transacoes.find(t => t.id === id);
    if (original) {
      dados.transacoes.unshift({ ...original, id: uid('tx'), data: isoHoje(0), criadoEm: new Date().toISOString() });
    }
  });
}

/* ---------------------------------------------------------------------- */
/* CRUD — METAS                                                            */
/* ---------------------------------------------------------------------- */

function addMeta(m) {
  return updateData(dados => {
    dados.metas.unshift({
      id: uid('meta'),
      criadoEm: new Date().toISOString(),
      valorAtual: Number(m.valorInicial || 0),
      ...m,
      valorObjetivo: Number(m.valorObjetivo)
    });
  });
}

function updateMeta(id, patch) {
  return updateData(dados => {
    const idx = dados.metas.findIndex(m => m.id === id);
    if (idx !== -1) dados.metas[idx] = { ...dados.metas[idx], ...patch };
  });
}

function aportarMeta(id, valor) {
  return updateData(dados => {
    const meta = dados.metas.find(m => m.id === id);
    if (meta) meta.valorAtual = Math.max(0, Number(meta.valorAtual) + Number(valor));
  });
}

function deleteMeta(id) {
  return updateData(dados => {
    dados.metas = dados.metas.filter(m => m.id !== id);
  });
}

/* ---------------------------------------------------------------------- */
/* CRUD — ORÇAMENTOS                                                       */
/* ---------------------------------------------------------------------- */

function setOrcamento(categoria, limite) {
  return updateData(dados => {
    const existente = dados.orcamentos.find(o => o.categoria === categoria);
    if (existente) existente.limite = Number(limite);
    else dados.orcamentos.push({ id: uid('orc'), categoria, limite: Number(limite) });
  });
}

function deleteOrcamento(id) {
  return updateData(dados => {
    dados.orcamentos = dados.orcamentos.filter(o => o.id !== id);
  });
}

/* ---------------------------------------------------------------------- */
/* CRUD — CONTAS RECORRENTES                                               */
/* ---------------------------------------------------------------------- */

function addContaRecorrente(c) {
  return updateData(dados => {
    dados.contasRecorrentes.unshift({ id: uid('rec'), ativo: true, ...c });
  });
}

function updateContaRecorrente(id, patch) {
  return updateData(dados => {
    const idx = dados.contasRecorrentes.findIndex(c => c.id === id);
    if (idx !== -1) dados.contasRecorrentes[idx] = { ...dados.contasRecorrentes[idx], ...patch };
  });
}

function deleteContaRecorrente(id) {
  return updateData(dados => {
    dados.contasRecorrentes = dados.contasRecorrentes.filter(c => c.id !== id);
  });
}

/* ---------------------------------------------------------------------- */
/* PERFIL                                                                   */
/* ---------------------------------------------------------------------- */

function updatePerfil(patch) {
  return updateData(dados => {
    dados.perfil = { ...dados.perfil, ...patch };
  });
}

/* ---------------------------------------------------------------------- */
/* NOTIFICAÇÕES                                                            */
/* ---------------------------------------------------------------------- */

function addNotificacao(texto, tipo = 'ia') {
  return updateData(dados => {
    dados.notificacoes.unshift({ id: uid('ntf'), texto, tipo, lida: false, data: isoHoje(0) });
  });
}

function marcarNotificacaoLida(id) {
  return updateData(dados => {
    const n = dados.notificacoes.find(n => n.id === id);
    if (n) n.lida = true;
  });
}

function marcarTodasNotificacoesLidas() {
  return updateData(dados => {
    dados.notificacoes.forEach(n => (n.lida = true));
  });
}

/* ---------------------------------------------------------------------- */
/* CÁLCULOS FINANCEIROS                                                    */
/* ---------------------------------------------------------------------- */

function filtrarPorPeriodo(transacoes, inicio, fim) {
  return transacoes.filter(t => t.data >= inicio && t.data <= fim);
}

function transacoesDoMes(transacoes, offsetMeses = 0) {
  const hoje = new Date();
  const ref = new Date(hoje.getFullYear(), hoje.getMonth() + offsetMeses, 1);
  const inicio = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const fim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  const iso = d => d.toISOString().slice(0, 10);
  return filtrarPorPeriodo(transacoes, iso(inicio), iso(fim));
}

function totalReceitas(transacoes) {
  return transacoes.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
}

function totalDespesas(transacoes) {
  return transacoes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
}

function calcularSaldo(transacoes) {
  return totalReceitas(transacoes) - totalDespesas(transacoes);
}

function calcularEconomia(transacoes) {
  const receitas = totalReceitas(transacoes);
  const despesas = totalDespesas(transacoes);
  return receitas - despesas;
}

function percentualVariacao(atual, anterior) {
  if (anterior === 0) return atual === 0 ? 0 : 100;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

function totalPorCategoria(transacoes, tipo = 'despesa') {
  const mapa = {};
  transacoes.filter(t => t.tipo === tipo).forEach(t => {
    mapa[t.categoria] = (mapa[t.categoria] || 0) + t.valor;
  });
  return mapa;
}

function percentualPorCategoria(transacoes, tipo = 'despesa') {
  const totais = totalPorCategoria(transacoes, tipo);
  const total = Object.values(totais).reduce((s, v) => s + v, 0);
  const resultado = {};
  Object.entries(totais).forEach(([cat, valor]) => {
    resultado[cat] = total > 0 ? (valor / total) * 100 : 0;
  });
  return resultado;
}

function evolucaoMensal(transacoes, meses = 6) {
  const resultado = [];
  for (let i = meses - 1; i >= 0; i--) {
    const doMes = transacoesDoMes(transacoes, -i);
    const hoje = new Date();
    const ref = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    resultado.push({
      mes: ref.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      ano: ref.getFullYear(),
      receitas: totalReceitas(doMes),
      despesas: totalDespesas(doMes)
    });
  }
  return resultado;
}

function mediaDiaria(transacoes, dias = 30) {
  const total = totalDespesas(transacoes);
  return dias > 0 ? total / dias : 0;
}

function mediaMensal(transacoes) {
  const evolucao = evolucaoMensal(transacoes, 3);
  const total = evolucao.reduce((s, m) => s + m.despesas, 0);
  return evolucao.length > 0 ? total / evolucao.length : 0;
}

function maiorCategoriaGasto(transacoes) {
  const totais = totalPorCategoria(transacoes, 'despesa');
  let maior = null;
  Object.entries(totais).forEach(([cat, valor]) => {
    if (!maior || valor > maior.valor) maior = { categoria: cat, valor };
  });
  return maior;
}

function maiorDespesa(transacoes) {
  const despesas = transacoes.filter(t => t.tipo === 'despesa');
  if (despesas.length === 0) return null;
  return despesas.reduce((max, t) => (t.valor > max.valor ? t : max), despesas[0]);
}

function percentualMeta(meta) {
  if (!meta.valorObjetivo) return 0;
  return Math.min(100, (meta.valorAtual / meta.valorObjetivo) * 100);
}

function valorRestanteMeta(meta) {
  return Math.max(0, meta.valorObjetivo - meta.valorAtual);
}

function quantoGuardarPorMes(meta) {
  const restante = valorRestanteMeta(meta);
  if (!meta.prazo) return null;
  const hoje = new Date();
  const alvo = new Date(meta.prazo);
  const mesesRestantes = Math.max(1, Math.round((alvo - hoje) / (1000 * 60 * 60 * 24 * 30)));
  return restante / mesesRestantes;
}

function orcamentoUtilizado(orcamento, transacoes) {
  const doMes = transacoesDoMes(transacoes, 0);
  const gasto = doMes
    .filter(t => t.tipo === 'despesa' && t.categoria === orcamento.categoria)
    .reduce((s, t) => s + t.valor, 0);
  const percentual = orcamento.limite > 0 ? (gasto / orcamento.limite) * 100 : 0;
  return { gasto, percentual, restante: Math.max(0, orcamento.limite - gasto), ultrapassou: gasto > orcamento.limite };
}

function previsaoFinanceira(transacoes) {
  const evolucao = evolucaoMensal(transacoes, 3);
  const n = evolucao.length || 1;
  const mediaReceita = evolucao.reduce((s, m) => s + m.receitas, 0) / n;
  const mediaDespesa = evolucao.reduce((s, m) => s + m.despesas, 0) / n;
  return {
    receitaEstimada: mediaReceita,
    despesaEstimada: mediaDespesa,
    saldoEstimado: mediaReceita - mediaDespesa
  };
}

function formatarMoeda(valor) {
  return (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

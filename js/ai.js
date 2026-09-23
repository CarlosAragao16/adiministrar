/**
 * ai.js — Assistente Finanças IA
 * -----------------------------------------------------------------------
 * IMPORTANTE — SEGURANÇA:
 * Esta versão usa uma camada de IA SIMULADA (baseada em regras + dados reais
 * do usuário), rodando 100% no navegador. NENHUMA chave de API é usada aqui.
 *
 * Para conectar uma IA real (ex.: OpenAI ou Anthropic) no futuro:
 *  1. NUNCA coloque a chave secreta no JavaScript do navegador.
 *  2. Crie um backend (Node/Edge Function/Supabase Function) que guarda a
 *     chave em uma variável de ambiente no servidor.
 *  3. O frontend deve chamar o SEU backend (ex.: POST /api/perguntar-ia),
 *     e o backend é quem chama a API da OpenAI/Anthropic.
 *  4. Substitua o corpo da função `perguntarParaIA` abaixo por uma chamada
 *     `fetch('/api/perguntar-ia', { method: 'POST', body: JSON.stringify({ pergunta, contexto }) })`.
 *
 * A função `perguntarParaIA` já está estruturada dessa forma — hoje ela
 * delega para o motor local `responderPerguntaIA`, e no futuro basta trocar
 * sua implementação interna sem alterar quem a chama.
 * -----------------------------------------------------------------------
 */

/* ---------------------------------------------------------------------- */
/* CONTEXTO FINANCEIRO                                                     */
/* ---------------------------------------------------------------------- */

function montarContextoFinanceiro() {
  const dados = loadData();
  const mesAtual = transacoesDoMes(dados.transacoes, 0);
  const mesAnterior = transacoesDoMes(dados.transacoes, -1);

  return {
    dados,
    mesAtual,
    mesAnterior,
    receitasMes: totalReceitas(mesAtual),
    despesasMes: totalDespesas(mesAtual),
    receitasMesAnterior: totalReceitas(mesAnterior),
    despesasMesAnterior: totalDespesas(mesAnterior),
    saldoMes: calcularSaldo(mesAtual),
    porCategoria: totalPorCategoria(mesAtual, 'despesa'),
    percentualCategoria: percentualPorCategoria(mesAtual, 'despesa'),
    maiorCategoria: maiorCategoriaGasto(mesAtual),
    maiorGasto: maiorDespesa(mesAtual),
    metas: dados.metas,
    orcamentos: dados.orcamentos,
    temDados: dados.transacoes.length > 0
  };
}

/* ---------------------------------------------------------------------- */
/* MOTOR DE RESPOSTAS (SIMULADO, BASEADO EM DADOS REAIS)                    */
/* ---------------------------------------------------------------------- */

function responderPerguntaIA(pergunta) {
  const ctx = montarContextoFinanceiro();
  const p = pergunta.toLowerCase();

  if (!ctx.temDados) {
    return { texto: 'Ainda não há dados suficientes na sua conta para eu responder com precisão. Cadastre algumas transações e pergunte novamente.' };
  }

  // Quanto gastei este mês
  if (/(quanto).*(gastei|gasto).*(m[eê]s)|gastos.*m[eê]s/.test(p)) {
    return {
      texto: `Este mês você gastou ${formatarMoeda(ctx.despesasMes)} em ${ctx.mesAtual.filter(t=>t.tipo==='despesa').length} transações. Suas receitas somaram ${formatarMoeda(ctx.receitasMes)}, resultando em um saldo de ${formatarMoeda(ctx.saldoMes)}.`,
      insight: ctx.saldoMes >= 0
        ? `Você está no positivo este mês — ótimo sinal de controle financeiro.`
        : `Suas despesas superaram as receitas este mês. Vale revisar os maiores gastos.`
    };
  }

  // Maior despesa
  if (/(maior).*(despesa|gasto)/.test(p)) {
    if (!ctx.maiorGasto) return { texto: 'Não encontrei despesas registradas neste período.' };
    const cat = getCategoria(ctx.maiorGasto.categoria);
    return {
      texto: `Sua maior despesa deste mês foi "${ctx.maiorGasto.descricao}" (${cat.icone} ${cat.nome}), no valor de ${formatarMoeda(ctx.maiorGasto.valor)}, em ${formatarData(ctx.maiorGasto.data)}.`
    };
  }

  // Onde estou gastando mais / categoria
  if (/(onde).*(gastando)|maior categoria|categoria.*(mais gasto)/.test(p)) {
    if (!ctx.maiorCategoria) return { texto: 'Ainda não há despesas suficientes para identificar uma categoria dominante.' };
    const cat = getCategoria(ctx.maiorCategoria.categoria);
    const pct = ctx.percentualCategoria[ctx.maiorCategoria.categoria] || 0;
    return {
      texto: `Analisei seus gastos deste mês. A categoria "${cat.icone} ${cat.nome}" concentra ${formatarMoeda(ctx.maiorCategoria.valor)}, o que representa ${pct.toFixed(0)}% do total de despesas.`,
      insight: pct > 30 ? `Essa categoria já passa de 30% dos seus gastos — pode valer a pena definir um limite de orçamento para ela.` : null
    };
  }

  // Quanto posso gastar por semana
  if (/(posso gastar).*(semana)|limite.*(semana)/.test(p)) {
    const disponivel = Math.max(0, ctx.receitasMes - ctx.despesasMes);
    const porSemana = disponivel / 4;
    return {
      texto: `Considerando seu saldo atual do mês (${formatarMoeda(disponivel)}) distribuído pelas semanas restantes, você poderia gastar cerca de ${formatarMoeda(porSemana)} por semana sem comprometer o saldo.`,
      insight: 'Essa é uma estimativa simples — ajustada conforme contas fixas que ainda vão vencer no mês.'
    };
  }

  // Como economizar X por mês
  const matchEconomizar = p.match(/economizar\s*r?\$?\s*([\d.,]+)/);
  if (matchEconomizar) {
    const alvo = parseFloat(matchEconomizar[1].replace('.', '').replace(',', '.'));
    const categoriasOrdenadas = Object.entries(ctx.porCategoria).sort((a, b) => b[1] - a[1]);
    if (categoriasOrdenadas.length === 0) {
      return { texto: 'Não há despesas suficientes registradas para sugerir cortes específicos.' };
    }
    const [catId, valor] = categoriasOrdenadas[0];
    const cat = getCategoria(catId);
    const corte = Math.min(valor * 0.3, alvo);
    return {
      texto: `Para economizar ${formatarMoeda(alvo)} por mês, uma opção realista é reduzir gastos em "${cat.icone} ${cat.nome}", sua maior categoria (${formatarMoeda(valor)} este mês).`,
      insight: `Cortando cerca de ${formatarMoeda(corte)} em ${cat.nome}, você chega perto da meta de economia sem grandes mudanças no seu estilo de vida.`
    };
  }

  // Quanto preciso guardar para atingir minha meta
  if (/(meta)|(guardar).*(m[eê]s)/.test(p)) {
    if (ctx.metas.length === 0) return { texto: 'Você ainda não criou nenhuma meta financeira. Que tal criar uma na página "Metas"?' };
    const linhas = ctx.metas.map(m => {
      const porMes = quantoGuardarPorMes(m);
      return `• ${m.nome}: faltam ${formatarMoeda(valorRestanteMeta(m))} (${percentualMeta(m).toFixed(0)}% concluída)${porMes ? `, guarde ~${formatarMoeda(porMes)}/mês para chegar no prazo` : ''}`;
    });
    return { texto: `Aqui está a situação das suas metas:\n${linhas.join('\n')}` };
  }

  // Gastos aumentando
  if (/(aumentando)|(subiu)|(aumento)/.test(p)) {
    const catsAnterior = totalPorCategoria(ctx.mesAnterior, 'despesa');
    const aumentos = Object.entries(ctx.porCategoria)
      .map(([id, valor]) => ({ id, valor, anterior: catsAnterior[id] || 0, variacao: percentualVariacao(valor, catsAnterior[id] || 0) }))
      .filter(c => c.variacao > 5)
      .sort((a, b) => b.variacao - a.variacao);
    if (aumentos.length === 0) return { texto: 'Nenhuma categoria teve aumento relevante em relação ao mês anterior. Bom sinal!' };
    const top = aumentos.slice(0, 3).map(a => `${getCategoria(a.id).icone} ${getCategoria(a.id).nome} (+${a.variacao.toFixed(0)}%)`);
    return { texto: `As categorias que mais aumentaram em relação ao mês anterior foram: ${top.join(', ')}.` };
  }

  // Estou gastando demais / genérico sobre gastos
  if (/(gastando demais)|(devo me preocupar)|(situa[cç][ãa]o financeira)/.test(p)) {
    const pctEconomia = ctx.receitasMes > 0 ? (ctx.saldoMes / ctx.receitasMes) * 100 : 0;
    let texto = `Analisei seus dados deste mês: você recebeu ${formatarMoeda(ctx.receitasMes)} e gastou ${formatarMoeda(ctx.despesasMes)}, guardando ${pctEconomia.toFixed(0)}% da sua renda.`;
    if (ctx.maiorCategoria) {
      const cat = getCategoria(ctx.maiorCategoria.categoria);
      const pct = ctx.percentualCategoria[ctx.maiorCategoria.categoria] || 0;
      texto += ` A categoria "${cat.nome}" representa ${pct.toFixed(0)}% dos seus gastos totais.`;
    }
    return {
      texto,
      insight: pctEconomia < 10
        ? 'Você está guardando menos de 10% da sua renda — considere revisar despesas variáveis para aumentar essa margem.'
        : 'Sua margem de economia está saudável. Continue assim!'
    };
  }

  // saldo
  if (/(saldo)/.test(p)) {
    return { texto: `Seu saldo atual do mês é ${formatarMoeda(ctx.saldoMes)} (receitas de ${formatarMoeda(ctx.receitasMes)} menos despesas de ${formatarMoeda(ctx.despesasMes)}).` };
  }

  // orçamento
  if (/(or[çc]amento)/.test(p)) {
    if (ctx.orcamentos.length === 0) return { texto: 'Você ainda não definiu limites de orçamento por categoria. Crie um na página "Orçamento".' };
    const linhas = ctx.orcamentos.map(o => {
      const u = orcamentoUtilizado(o, ctx.dados.transacoes);
      const cat = getCategoria(o.categoria);
      return `• ${cat.icone} ${cat.nome}: ${u.percentual.toFixed(0)}% do limite de ${formatarMoeda(o.limite)}${u.ultrapassou ? ' — ultrapassado ⚠️' : ''}`;
    });
    return { texto: `Situação do seu orçamento mensal:\n${linhas.join('\n')}` };
  }

  // fallback
  return {
    texto: 'Posso te ajudar com perguntas sobre seus gastos, receitas, metas e orçamento. Tente perguntar, por exemplo: "Quanto gastei este mês?" ou "Onde estou gastando mais?".'
  };
}

/**
 * Ponto de integração para uma IA real no futuro.
 * Hoje delega para o motor local. Para conectar um backend real, troque
 * o corpo desta função por uma chamada fetch ao seu servidor — a assinatura
 * (parâmetros e retorno) pode permanecer a mesma para não quebrar o restante do app.
 *
 * @param {string} pergunta - pergunta do usuário em linguagem natural
 * @param {object} contextoFinanceiro - dados financeiros relevantes do usuário
 * @returns {Promise<{texto: string, insight?: string}>}
 */
async function perguntarParaIA(pergunta, contextoFinanceiro) {
  // ---- Versão real (exemplo para o futuro, comentada) -------------------
  // const resp = await fetch('/api/perguntar-ia', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ pergunta, contexto: contextoFinanceiro })
  // });
  // const data = await resp.json();
  // return data;
  // -------------------------------------------------------------------------

  // Simula latência de rede para uma UX realista.
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
  return responderPerguntaIA(pergunta);
}

/* ---------------------------------------------------------------------- */
/* INSIGHTS AUTOMÁTICOS                                                     */
/* ---------------------------------------------------------------------- */

function calcularInsightsAutomaticos() {
  const ctx = montarContextoFinanceiro();
  const insights = [];

  if (!ctx.temDados) {
    insights.push({ icone: '👋', texto: 'Cadastre suas primeiras transações para eu começar a gerar insights personalizados.' });
    return insights;
  }

  // Economia da renda
  if (ctx.receitasMes > 0) {
    const pct = (ctx.saldoMes / ctx.receitasMes) * 100;
    insights.push({
      icone: pct >= 0 ? '💰' : '📉',
      texto: pct >= 0
        ? `Você está economizando ${pct.toFixed(0)}% da sua renda este mês.`
        : `Suas despesas superaram a renda em ${Math.abs(pct).toFixed(0)}% este mês.`
    });
  }

  // Categoria em alta
  const catsAnterior = totalPorCategoria(ctx.mesAnterior, 'despesa');
  const variacoes = Object.entries(ctx.porCategoria).map(([id, valor]) => ({
    id, valor, variacao: percentualVariacao(valor, catsAnterior[id] || 0)
  })).filter(v => v.variacao >= 15).sort((a, b) => b.variacao - a.variacao);
  if (variacoes.length > 0) {
    const cat = getCategoria(variacoes[0].id);
    insights.push({ icone: '📈', texto: `Seus gastos com ${cat.nome.toLowerCase()} aumentaram ${variacoes[0].variacao.toFixed(0)}% este mês.` });
  }

  // Meta mais próxima
  const metasAtivas = ctx.metas.filter(m => percentualMeta(m) < 100);
  if (metasAtivas.length > 0) {
    const maisProxima = metasAtivas.sort((a, b) => percentualMeta(b) - percentualMeta(a))[0];
    insights.push({ icone: '🎯', texto: `Faltam ${formatarMoeda(valorRestanteMeta(maisProxima))} para você concluir a meta "${maisProxima.nome}".` });
  }

  // Orçamento perto do limite
  const orcEstourando = ctx.orcamentos
    .map(o => ({ o, u: orcamentoUtilizado(o, ctx.dados.transacoes) }))
    .filter(x => x.u.percentual >= 80)
    .sort((a, b) => b.u.percentual - a.u.percentual);
  if (orcEstourando.length > 0) {
    const cat = getCategoria(orcEstourando[0].o.categoria);
    insights.push({
      icone: orcEstourando[0].u.ultrapassou ? '🚨' : '⚠️',
      texto: `Orçamento de ${cat.nome.toLowerCase()} em ${orcEstourando[0].u.percentual.toFixed(0)}% do limite mensal.`
    });
  }

  // Categoria dominante
  if (ctx.maiorCategoria) {
    const cat = getCategoria(ctx.maiorCategoria.categoria);
    const pct = ctx.percentualCategoria[ctx.maiorCategoria.categoria] || 0;
    if (pct >= 25) {
      insights.push({ icone: '🔎', texto: `"${cat.nome}" já representa ${pct.toFixed(0)}% de tudo que você gastou este mês.` });
    }
  }

  return insights.slice(0, 4);
}

function gerarInsightsAutomaticos() {
  const container = document.getElementById('lista-insights');
  if (!container) return;
  const insights = calcularInsightsAutomaticos();
  container.innerHTML = insights.map(i => `
    <div class="insight-item">
      <span class="dot">${i.icone}</span>
      <span>${i.texto}</span>
    </div>`).join('');
}

/* ---------------------------------------------------------------------- */
/* PÁGINA — ASSISTENTE IA (CHAT)                                            */
/* ---------------------------------------------------------------------- */

const PERGUNTAS_SUGERIDAS = [
  'Quanto gastei este mês?',
  'Qual foi minha maior despesa?',
  'Onde estou gastando mais?',
  'Quanto posso gastar por semana?',
  'Como posso economizar R$ 500 por mês?',
  'Quanto preciso guardar para atingir minha meta?',
  'Quais gastos estão aumentando?',
  'Estou gastando demais?'
];

function renderMensagemChat(autor, texto, insight = null) {
  const lista = document.getElementById('chat-mensagens');
  if (!lista) return;
  const el = document.createElement('div');
  el.className = `chat-msg ${autor}`;
  el.innerHTML = `
    <div class="avatar">${autor === 'ai' ? '🤖' : '🙂'}</div>
    <div class="bubble">
      <div>${texto.replace(/\n/g, '<br>')}</div>
      ${insight ? `<div class="insight-mini">💡 ${insight}</div>` : ''}
    </div>`;
  lista.appendChild(el);
  lista.scrollTop = lista.scrollHeight;
}

function renderDigitando(mostrar) {
  const lista = document.getElementById('chat-mensagens');
  if (!lista) return;
  let el = document.getElementById('chat-digitando');
  if (mostrar) {
    if (el) return;
    el = document.createElement('div');
    el.id = 'chat-digitando';
    el.className = 'chat-msg ai';
    el.innerHTML = `<div class="avatar">🤖</div><div class="bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div>`;
    lista.appendChild(el);
    lista.scrollTop = lista.scrollHeight;
  } else if (el) {
    el.remove();
  }
}

async function enviarPerguntaChat(pergunta) {
  if (!pergunta.trim()) return;
  renderMensagemChat('user', pergunta);
  renderDigitando(true);

  const contexto = montarContextoFinanceiro();
  const resposta = await perguntarParaIA(pergunta, contexto);

  renderDigitando(false);
  renderMensagemChat('ai', resposta.texto, resposta.insight);
}

function renderSugestoesChat() {
  const wrap = document.getElementById('chat-sugestoes');
  if (!wrap) return;
  wrap.innerHTML = PERGUNTAS_SUGERIDAS.slice(0, 5).map(p => `<button type="button">${p}</button>`).join('');
  wrap.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => enviarPerguntaChat(btn.textContent));
  });
}

function inicializarChatIA() {
  const shell = document.getElementById('chat-mensagens');
  if (!shell) return;

  renderMensagemChat('ai', 'Olá! Sou seu assistente financeiro. Analiso seus dados e posso te ajudar a entender seus gastos, metas e orçamento. Pergunte qualquer coisa sobre suas finanças.');
  renderSugestoesChat();

  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const texto = input.value;
    input.value = '';
    enviarPerguntaChat(texto);
  });
}

document.addEventListener('DOMContentLoaded', inicializarChatIA);

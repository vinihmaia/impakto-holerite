/* =========================================================
   PAINEL DO RH: importar PDF, lançar manual, lista, funcionários
   ========================================================= */
const ABAS = ['aba-importar','aba-lancar','aba-lista','aba-func'];
document.querySelectorAll('.aba').forEach(botao => { botao.onclick = () => trocarAba(botao.dataset.aba); });
function trocarAba(id){
  document.querySelectorAll('.aba').forEach(b => b.classList.toggle('ativa', b.dataset.aba === id));
  ABAS.forEach(a => $(a).classList.toggle('oculto', a !== id));
}

$('txt-senha-padrao').textContent = SENHA_PADRAO;
$('f-cpf').addEventListener('input', e => e.target.value = formatarCPF(e.target.value));
$('f-telefone').addEventListener('input', e => e.target.value = formatarTelefone(e.target.value));

function iniciarRH(){
  $('rh-nome').textContent = usuarioAtual.nome;
  $('lanc-mes').innerHTML = MESES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
  $('busca-hol').value = ''; $('busca-func').value = '';
  trocarAba('aba-importar');
  preencherSelectFuncionarios();
  resetarLancamento();
  cancelarEdicaoFunc();
  renderFuncionarios();
  renderLista();
  renderFila();
  fecharPreview();
}

function preencherSelectFuncionarios(){
  const atual = $('lanc-func').value;
  const lista = [...db.usuarios].sort((a, b) => a.nome.localeCompare(b.nome));
  $('lanc-func').innerHTML = '<option value="">Selecione…</option>' +
    lista.map(u => `<option value="${u.cpf}">${esc(u.nome)} — ${formatarCPF(u.cpf)}</option>`).join('');
  $('lanc-func').value = lista.some(u => u.cpf === atual) ? atual : '';
}

/* =========================================================
   IMPORTAÇÃO DE PDFs
   ========================================================= */
let fila = [];

const MESES_BUSCA = [['janeiro','jan'],['fevereiro','fev'],['marco','mar'],['abril','abr'],['maio','mai'],['junho','jun'],
                     ['julho','jul'],['agosto','ago'],['setembro','set'],['outubro','out'],['novembro','nov'],['dezembro','dez']];

// Tenta descobrir funcionário e mês pelo NOME do arquivo
function sugerirPeloNome(nomeArquivo){
  const base = nomeArquivo.replace(/\.pdf$/i, '');
  const regexCpf = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g;
  let cpf = '';
  for (const trecho of (base.match(regexCpf) || [])) {
    const d = soDigitos(trecho);
    if (db.usuarios.some(u => u.cpf === d)) { cpf = d; break; }
  }
  const texto = normalizar(base.replace(regexCpf, ' ')).replace(/[_\-.]+/g, ' ');
  if (!cpf) {
    const candidatos = db.usuarios.filter(u => {
      const partes = normalizar(u.nome).split(/\s+/);
      if (texto.includes(partes.join(' '))) return true;
      return partes.length > 1 && new RegExp('\\b' + partes[0] + '\\b').test(texto)
                                && new RegExp('\\b' + partes[partes.length - 1] + '\\b').test(texto);
    });
    if (candidatos.length === 1) cpf = candidatos[0].cpf;
  }
  const hoje = new Date();
  let mes = hoje.getMonth() + 1, ano = hoje.getFullYear(), achouMes = false;
  const semCpf = base.replace(regexCpf, ' ');
  let m = semCpf.match(/(?<!\d)(20\d{2})[-_. ]?(0[1-9]|1[0-2])(?!\d)/);
  if (m) { ano = +m[1]; mes = +m[2]; achouMes = true; }
  else if ((m = semCpf.match(/(?<!\d)(0[1-9]|1[0-2])[-_. ]?(20\d{2})(?!\d)/))) { mes = +m[1]; ano = +m[2]; achouMes = true; }
  else {
    for (let i = 0; i < 12; i++) {
      if (new RegExp('\\b(' + MESES_BUSCA[i][0] + '|' + MESES_BUSCA[i][1] + ')\\b').test(texto)) {
        mes = i + 1; achouMes = true;
        const a = texto.match(/\b20\d{2}\b/); if (a) ano = +a[0];
        break;
      }
    }
  }
  return {cpf, mes, ano, achouMes};
}

async function adicionarPdfs(lista){
  const rejeitados = [];
  for (const file of lista) {
    const parecePdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!parecePdf) { rejeitados.push(`${file.name}: não é PDF`); continue; }
    if (file.size > LIMITE_PDF) { rejeitados.push(`${file.name}: maior que ${tamanhoLegivel(LIMITE_PDF)}`); continue; }
    try {
      // todo PDF verdadeiro começa com os caracteres "%PDF-"
      const cab = new Uint8Array(await file.slice(0, 5).arrayBuffer());
      if (String.fromCharCode(...cab) !== '%PDF-') { rejeitados.push(`${file.name}: arquivo PDF inválido`); continue; }
    } catch(e) { rejeitados.push(`${file.name}: não foi possível ler`); continue; }
    if (fila.some(f => f.file.name === file.name && f.file.size === file.size)) continue;   // já está na lista
    const sug = sugerirPeloNome(file.name);
    fila.push({id: novoId(), file, cpf: sug.cpf, mes: sug.mes, ano: sug.ano, sug});
  }
  renderFila();
  if (rejeitados.length) avisar('Alguns arquivos foram ignorados', rejeitados.join('\n'), 'aviso');
}

function renderFila(){
  const cont = $('fila-pdf');
  cont.innerHTML = '';
  $('imp-acoes').classList.toggle('oculto', !fila.length);
  $('btn-importar').textContent = `Importar ${fila.length} arquivo${fila.length > 1 ? 's' : ''}`;
  const usuarios = [...db.usuarios].sort((a, b) => a.nome.localeCompare(b.nome));
  const opcoesFunc = '<option value="">Escolha o funcionário…</option>' +
    usuarios.map(u => `<option value="${u.cpf}">${esc(u.nome)} — ${formatarCPF(u.cpf)}</option>`).join('');
  const opcoesMes = MESES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');

  fila.forEach(item => {
    const linha = document.createElement('div');
    linha.className = 'fila-item' + (item.cpf ? '' : ' falta');
    linha.innerHTML = `
      <div class="fila-arq"><b></b><small></small></div>
      <select class="i-func" aria-label="Funcionário">${opcoesFunc}</select>
      <select class="i-mes" aria-label="Mês">${opcoesMes}</select>
      <input class="i-ano" type="number" min="2000" max="2100" aria-label="Ano">
      <button type="button" class="btn btn-perigo btn-pequeno" title="Tirar da lista">✕</button>`;
    linha.querySelector('b').textContent = item.file.name;
    linha.querySelector('b').title = item.file.name;
    const pistas = [tamanhoLegivel(item.file.size)];
    if (item.sug.cpf) pistas.push('funcionário detectado');
    if (item.sug.achouMes) pistas.push('mês detectado');
    linha.querySelector('small').textContent = pistas.join(' · ');
    const selF = linha.querySelector('.i-func'), selM = linha.querySelector('.i-mes'), inA = linha.querySelector('.i-ano');
    selF.value = usuarios.some(u => u.cpf === item.cpf) ? item.cpf : '';
    item.cpf = selF.value;
    selM.value = item.mes; inA.value = item.ano;
    selF.onchange = () => { item.cpf = selF.value; linha.classList.toggle('falta', !item.cpf); };
    selM.onchange = () => item.mes = Number(selM.value);
    inA.oninput = () => item.ano = Number(inA.value);
    linha.querySelector('button').onclick = () => { fila = fila.filter(x => x !== item); renderFila(); };
    cont.appendChild(linha);
  });
}

function limparFila(){ fila = []; renderFila(); $('imp-msg').classList.add('oculto'); }

const compDe = item => `${item.ano}-${String(item.mes).padStart(2, '0')}`;

async function importarFila(){
  if (!fila.length) return;
  const semFunc = fila.filter(f => !f.cpf).length;
  if (semFunc) return aviso('imp-msg', `Escolha o funcionário em ${semFunc} arquivo${semFunc > 1 ? 's' : ''} (marcados em amarelo).`);
  if (fila.some(f => !f.ano || f.ano < 2000 || f.ano > 2100)) return aviso('imp-msg', 'Confira o ano dos arquivos.');
  const chaves = fila.map(f => f.cpf + '|' + compDe(f));
  const repetida = chaves.find((c, i) => chaves.indexOf(c) !== i);
  if (repetida) {
    const [cpf, comp] = repetida.split('|');
    return aviso('imp-msg', `Há dois arquivos para ${nomeDe(cpf)} em ${nomeMes(comp)}. Deixe só um.`);
  }
  const existentes = fila.map(f => db.holerites.find(h => h.cpf === f.cpf && h.competencia === compDe(f))).filter(Boolean);
  if (existentes.length) {
    const assinados = existentes.filter(h => h.assinatura).length;
    const ok = await perguntar('Substituir holerites existentes?',
      `${existentes.length} arquivo(s) são de funcionários que já têm holerite no mesmo mês.` +
      (assinados ? `\n${assinados} deles já foi(ram) ASSINADO(S): as assinaturas serão perdidas.` : '') +
      '\n\nOs anteriores serão trocados pelos novos.',
      {botao:'Substituir', perigo: assinados > 0});
    if (!ok) return;
  }

  $('btn-importar').disabled = true;
  $('btn-importar').textContent = 'Importando…';
  let importados = 0;
  const falhas = [];
  for (const item of [...fila]) {
    try {
      const dados = await item.file.arrayBuffer();
      const pdfId = 'pdf_' + novoId();
      await arquivos.salvar(pdfId, dados);
      const competencia = compDe(item);
      const antigo = db.holerites.find(h => h.cpf === item.cpf && h.competencia === competencia);
      if (antigo) {
        db.holerites = db.holerites.filter(h => h !== antigo);
        if (antigo.pdfId) arquivos.apagar(antigo.pdfId).catch(() => {});
      }
      db.holerites.push({
        id: novoId(), cpf: item.cpf, competencia, tipo: 'pdf', pdfId,
        arquivo: item.file.name, tamanho: item.file.size,
        proventos: [], descontos: [], importadoEm: new Date().toISOString()
      });
      fila = fila.filter(x => x !== item);
      importados++;
    } catch(e) {
      falhas.push(item.file.name);
    }
  }
  salvar();
  $('btn-importar').disabled = false;
  renderFila(); renderLista();
  if (falhas.length) {
    avisar('Alguns arquivos não foram importados',
      `${importados} importado(s). Falharam:\n${falhas.join('\n')}\n\nO navegador pode estar sem espaço ou bloqueando o armazenamento. Os que falharam continuam na lista para tentar de novo.`,
      'aviso');
  } else {
    avisar('PDFs importados', `${importados} holerite(s) importado(s). Os funcionários já podem ver e assinar.`, 'sucesso');
  }
}

(function prepararArrastar(){
  const zona = $('drop-pdf'), input = $('input-pdf');
  zona.onclick = () => input.click();
  zona.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } };
  input.onchange = () => { if (input.files.length) adicionarPdfs([...input.files]); input.value = ''; };
  zona.ondragover = e => { e.preventDefault(); zona.classList.add('ativo'); };
  zona.ondragleave = () => zona.classList.remove('ativo');
  zona.ondrop = e => { e.preventDefault(); zona.classList.remove('ativo'); adicionarPdfs([...e.dataTransfer.files]); };
  // evita que soltar um arquivo fora da área faça o navegador abrir o PDF e sair do portal
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => e.preventDefault());
})();

/* =========================================================
   LANÇAMENTO MANUAL
   ========================================================= */
let editandoHolId = null;

function novaLinha(tipo, item = {desc:'', ref:'', valor:''}){
  const div = document.createElement('div');
  div.className = 'linha-item';
  div.innerHTML = `
    <input class="i-desc" placeholder="Descrição">
    <input class="i-ref" placeholder="Ref.">
    <input class="i-valor" type="number" step="0.01" min="0" placeholder="0,00">
    <button type="button" class="btn btn-perigo btn-pequeno" title="Remover linha">✕</button>`;
  div.querySelector('.i-desc').value = item.desc;
  div.querySelector('.i-ref').value = item.ref;
  div.querySelector('.i-valor').value = item.valor;
  div.querySelector('button').onclick = () => { div.remove(); atualizarTotais(); };
  div.querySelectorAll('input').forEach(i => i.oninput = atualizarTotais);
  $(tipo === 'p' ? 'lista-proventos' : 'lista-descontos').appendChild(div);
}

function preencherLinhas(proventos, descontos){
  $('lista-proventos').innerHTML = ''; $('lista-descontos').innerHTML = '';
  (proventos.length ? proventos : [{desc:'', ref:'', valor:''}]).forEach(p => novaLinha('p', p));
  (descontos.length ? descontos : [{desc:'', ref:'', valor:''}]).forEach(d => novaLinha('d', d));
  atualizarTotais();
}

function lerLinhas(id){
  return [...document.querySelectorAll('#' + id + ' .linha-item')].map(d => ({
    desc:  d.querySelector('.i-desc').value.trim(),
    ref:   d.querySelector('.i-ref').value.trim(),
    valor: Math.round((parseFloat(d.querySelector('.i-valor').value) || 0) * 100) / 100
  })).filter(i => i.desc && i.valor > 0);
}

function atualizarTotais(){
  const tp = soma(lerLinhas('lista-proventos')), td = soma(lerLinhas('lista-descontos'));
  $('totais-lancamento').innerHTML =
    `Proventos: <b>${moeda(tp)}</b> &nbsp;·&nbsp; Descontos: <b>${moeda(td)}</b> &nbsp;·&nbsp; Líquido: <b>${moeda(tp - td)}</b>`;
}

function resetarLancamento(){
  editandoHolId = null;
  $('lanc-titulo').textContent = 'Lançar holerite manualmente';
  $('lanc-editando').classList.add('oculto');
  $('btn-salvar-hol').textContent = 'Salvar holerite';
  $('btn-cancelar-hol').classList.add('oculto');
  preencherLinhas([{desc:'Salário base', ref:'30 dias', valor:''}], [{desc:'INSS', ref:'', valor:''}]);
  const hoje = new Date();
  $('lanc-mes').value = hoje.getMonth() + 1;
  $('lanc-ano').value = hoje.getFullYear();
  $('lanc-func').value = '';
}

function editarHolerite(id){
  const h = db.holerites.find(x => x.id === id);
  if (!h || ehPdf(h)) return;
  trocarAba('aba-lancar');
  editandoHolId = id;
  const [ano, mes] = h.competencia.split('-');
  $('lanc-func').value = h.cpf;
  $('lanc-mes').value = Number(mes);
  $('lanc-ano').value = Number(ano);
  preencherLinhas(h.proventos.map(x => ({...x})), h.descontos.map(x => ({...x})));
  $('lanc-titulo').textContent = 'Editar holerite';
  $('lanc-editando').innerHTML = `Editando o holerite de <b>${esc(nomeDe(h.cpf))}</b> · ${nomeMes(h.competencia)}.` +
    (h.assinatura ? ' <b>Atenção:</b> ele já foi assinado. Se você alterar algo, a assinatura será removida e o funcionário precisará assinar de novo.' : '');
  $('lanc-editando').classList.remove('oculto');
  $('btn-salvar-hol').textContent = 'Salvar alterações';
  $('btn-cancelar-hol').classList.remove('oculto');
  $('lanc-msg').classList.add('oculto');
  window.scrollTo({top:0, behavior:'smooth'});
}

async function copiarMesAnterior(){
  const cpf = $('lanc-func').value;
  if (!cpf) return aviso('lanc-msg', 'Escolha o funcionário primeiro.');
  const comp = `${$('lanc-ano').value}-${String($('lanc-mes').value).padStart(2, '0')}`;
  const base = db.holerites
    .filter(h => h.cpf === cpf && !ehPdf(h) && h.competencia < comp && h.id !== editandoHolId)
    .sort((a, b) => b.competencia.localeCompare(a.competencia))[0];
  if (!base) return aviso('lanc-msg', `${nomeDe(cpf)} não tem holerite manual anterior a ${nomeMes(comp)}.`);
  const jaPreenchido = lerLinhas('lista-proventos').length + lerLinhas('lista-descontos').length;
  if (jaPreenchido && !(await perguntar('Substituir as linhas?',
      `As linhas que você já preencheu serão trocadas pelas de ${nomeMes(base.competencia)}.`, {botao:'Substituir'}))) return;
  preencherLinhas(base.proventos.map(x => ({...x})), base.descontos.map(x => ({...x})));
  aviso('lanc-msg', `Linhas copiadas de ${nomeMes(base.competencia)}. Confira e ajuste os valores antes de salvar.`, 'ok');
}

async function salvarHolerite(){
  const cpf = $('lanc-func').value;
  const mes = Number($('lanc-mes').value), ano = Number($('lanc-ano').value);
  if (!cpf) return aviso('lanc-msg', 'Escolha o funcionário.');
  if (!ano || ano < 2000 || ano > 2100) return aviso('lanc-msg', 'Informe um ano válido.');
  const competencia = `${ano}-${String(mes).padStart(2, '0')}`;
  const proventos = lerLinhas('lista-proventos'), descontos = lerLinhas('lista-descontos');
  if (!proventos.length) return aviso('lanc-msg', 'Informe ao menos um provento com descrição e valor.');

  const atual = editandoHolId ? db.holerites.find(h => h.id === editandoHolId) : null;
  if (atual){
    const mudou = JSON.stringify([cpf, competencia, proventos, descontos]) !==
                  JSON.stringify([atual.cpf, atual.competencia, atual.proventos, atual.descontos]);
    if (!mudou) return aviso('lanc-msg', 'Nada foi alterado.');
    if (atual.assinatura && !(await perguntar('Este holerite já foi assinado',
        `${nomeDe(atual.cpf)} assinou em ${fmtDataHora(atual.assinatura.data)}.\n\nAo salvar, a assinatura será removida e o funcionário terá que assinar de novo.`,
        {botao:'Salvar e remover assinatura', perigo:true}))) return;
  }
  const outro = db.holerites.find(h => h.cpf === cpf && h.competencia === competencia && h !== atual);
  if (outro){
    const ok = outro.assinatura
      ? await perguntar('Já existe um holerite assinado',
          `${nomeDe(cpf)} já tem um holerite de ${nomeMes(competencia)}, assinado em ${fmtDataHora(outro.assinatura.data)}.\n\nSe continuar, ele será substituído e a assinatura será perdida.`,
          {botao:'Substituir', perigo:true})
      : await perguntar('Substituir holerite?',
          `${nomeDe(cpf)} já tem um holerite de ${nomeMes(competencia)}. O anterior será trocado por este.`,
          {botao:'Substituir'});
    if (!ok) return;
    db.holerites = db.holerites.filter(h => h !== outro);
    if (outro.pdfId) arquivos.apagar(outro.pdfId).catch(() => {});
  }
  if (atual){
    atual.cpf = cpf; atual.competencia = competencia;
    atual.proventos = proventos; atual.descontos = descontos;
    delete atual.assinatura;
    atual.editadoEm = new Date().toISOString();
  } else {
    db.holerites.push({id: novoId(), cpf, competencia, proventos, descontos});
  }
  salvar(); renderLista(); resetarLancamento();
  aviso('lanc-msg', atual ? `Holerite de ${nomeMes(competencia)} atualizado!` : `Holerite de ${nomeMes(competencia)} salvo e enviado ao funcionário!`, 'ok');
}

/* =========================================================
   LISTA DE HOLERITES LANÇADOS
   ========================================================= */
function renderLista(){
  const filtro = $('filtro-status').value;
  const termo = normalizar($('busca-hol').value);
  const total = db.holerites.length;
  const assinados = db.holerites.filter(h => h.assinatura).length;
  const pendentes = total - assinados;
  $('resumo-assin').textContent = total ? `${assinados} de ${total} assinados` : '';
  $('aba-lista-btn').textContent = pendentes
    ? `Holerites lançados (${pendentes} pendente${pendentes > 1 ? 's' : ''})` : 'Holerites lançados';
  const lista = db.holerites
    .filter(h => filtro === 'todos' || (filtro === 'assinado' ? h.assinatura : !h.assinatura))
    .filter(h => !termo || normalizar(nomeDe(h.cpf)).includes(termo))
    .sort((a, b) => b.competencia.localeCompare(a.competencia) || nomeDe(a.cpf).localeCompare(nomeDe(b.cpf)));
  $('tb-holerites').innerHTML = lista.map(h => `
    <tr><td>${nomeMes(h.competencia)}</td><td>${esc(nomeDe(h.cpf))}</td>
        <td class="num">${ehPdf(h) ? '<span class="tag tag-pdf">PDF</span>' : moeda(soma(h.proventos) - soma(h.descontos))}</td>
        <td>${h.assinatura
              ? `<span class="tag tag-ok">✓ Assinado em ${fmtDataHora(h.assinatura.data)}</span>`
              : '<span class="tag tag-pend">• Pendente</span>'}</td>
        <td class="num"><span class="acoes">
          <button class="btn btn-claro btn-pequeno" onclick="verHolerite(${h.id})">Ver</button>
          ${ehPdf(h) ? '' : `<button class="btn btn-claro btn-pequeno" onclick="editarHolerite(${h.id})">Editar</button>`}
          <button class="btn btn-perigo btn-pequeno" onclick="excluirHolerite(${h.id})">Excluir</button>
        </span></td></tr>`).join('')
    || '<tr><td colspan="5" class="vazio">Nenhum holerite encontrado.</td></tr>';
}

function verHolerite(id){
  const h = db.holerites.find(h => h.id === id);
  if (!h) return;
  renderHolerite(h, $('rh-preview'));
  $('rh-preview-box').classList.remove('oculto');
  $('rh-preview-box').scrollIntoView({behavior:'smooth'});
}

function fecharPreview(){
  if (urlsPdf['rh-preview']) { URL.revokeObjectURL(urlsPdf['rh-preview']); delete urlsPdf['rh-preview']; }
  $('rh-preview-box').classList.add('oculto'); $('rh-preview').innerHTML = '';
}

async function excluirHolerite(id){
  const h = db.holerites.find(h => h.id === id);
  if (!h) return;
  const extra = h.assinatura ? '\nEste holerite JÁ FOI ASSINADO pelo funcionário.' : '';
  if (!(await perguntar('Excluir holerite?',
      `${nomeDe(h.cpf)} · ${nomeMes(h.competencia)}${ehPdf(h) ? ' (PDF)' : ''}${extra}\n\nIsso não pode ser desfeito.`,
      {botao:'Excluir', perigo:true}))) return;
  db.holerites = db.holerites.filter(x => x.id !== id);
  if (h.pdfId) arquivos.apagar(h.pdfId).catch(() => {});
  if (editandoHolId === id) resetarLancamento();
  salvar(); renderLista(); fecharPreview();
}

/* =========================================================
   FUNCIONÁRIOS: cadastro, edição, busca, senha
   ========================================================= */
let editandoCpf = null;

function renderFuncionarios(){
  const termo = normalizar($('busca-func').value), digitos = soDigitos(termo);
  const lista = [...db.usuarios]
    .filter(u => !termo || normalizar(u.nome).includes(termo) || (digitos.length >= 3 && u.cpf.includes(digitos)))
    .sort((a, b) => a.nome.localeCompare(b.nome));
  $('tb-func').innerHTML = lista.map(u => {
    const eu = u.cpf === usuarioAtual.cpf;
    const ferias = infoFerias(u);
    return `
    <tr><td>${esc(u.nome)}${u.trocarSenha ? ' <span class="tag tag-pend">aguardando 1º acesso</span>' : ''}${ferias && ferias.tipo === 'agora' ? ' <span class="tag tag-ok">🌴 de férias</span>' : ''}</td>
        <td>${formatarCPF(u.cpf)}</td><td>${esc(u.cargo) || '—'}</td>
        <td>${u.perfil === 'rh' ? '<span class="tag tag-rh">RH</span>' : '<span class="tag">Funcionário</span>'}</td>
        <td class="num"><span class="acoes">
          <button class="btn btn-claro btn-pequeno" onclick="editarFuncionario('${u.cpf}')">Editar</button>
          ${eu ? '<small>(você)</small>' : `
          <button class="btn btn-claro btn-pequeno" onclick="redefinirSenha('${u.cpf}')" title="Voltar para a senha padrão">Senha</button>
          <button class="btn btn-perigo btn-pequeno" onclick="removerFuncionario('${u.cpf}')">Remover</button>`}
        </span></td></tr>`;
  }).join('') || '<tr><td colspan="5" class="vazio">Ninguém encontrado.</td></tr>';
}

function editarFuncionario(cpf){
  const u = db.usuarios.find(x => x.cpf === cpf);
  if (!u) return;
  editandoCpf = cpf;
  $('cad-titulo').textContent = 'Editar: ' + u.nome;
  $('f-nome').value = u.nome;
  $('f-cpf').value = formatarCPF(u.cpf);
  $('f-telefone').value = formatarTelefone(u.telefone || '');
  $('f-nascimento').value = u.nascimento || '';
  $('f-cargo').value = u.cargo || '';
  $('f-setor').value = u.setor || '';
  $('f-admissao').value = u.admissao || '';
  $('f-ferias-inicio').value = u.feriasInicio || '';
  $('f-ferias-fim').value = u.feriasFim || '';
  $('f-perfil').value = u.perfil;
  $('f-perfil').disabled = (cpf === usuarioAtual.cpf);   // ninguém muda o próprio perfil
  $('f-senha-box').classList.add('oculto');
  $('btn-cad').textContent = 'Salvar alterações';
  $('btn-cad-cancelar').classList.remove('oculto');
  $('cad-msg').classList.add('oculto');
  $('aba-func').scrollIntoView({behavior:'smooth'});
}

function cancelarEdicaoFunc(){
  editandoCpf = null;
  $('form-func').reset();
  $('cad-titulo').textContent = 'Cadastrar pessoa';
  $('f-perfil').disabled = false;
  $('f-senha-box').classList.remove('oculto');
  $('btn-cad').textContent = 'Cadastrar';
  $('btn-cad-cancelar').classList.add('oculto');
}

$('form-func').addEventListener('submit', e => {
  e.preventDefault();
  const nome = $('f-nome').value.trim();
  const cpf = soDigitos($('f-cpf').value);
  const telefone = soDigitos($('f-telefone').value);
  const nascimento = $('f-nascimento').value, admissao = $('f-admissao').value;
  const feriasInicio = $('f-ferias-inicio').value, feriasFim = $('f-ferias-fim').value;

  // Validações (pegam erros de digitação comuns)
  if (!nome) return aviso('cad-msg', 'Informe o nome.');
  if (!cpfValido(cpf)) return aviso('cad-msg', 'CPF inválido.');
  if (db.usuarios.some(u => u.cpf === cpf && u.cpf !== editandoCpf)) return aviso('cad-msg', 'Já existe uma pessoa com esse CPF.');
  if (telefone && (telefone.length < 10 || telefone.length > 11)) return aviso('cad-msg', 'Telefone incompleto. Use DDD + número.');
  if (nascimento && nascimento > hojeISO()) return aviso('cad-msg', 'A data de nascimento está no futuro.');
  if (nascimento && admissao && admissao <= nascimento) return aviso('cad-msg', 'A admissão precisa ser depois do nascimento.');
  if (!!feriasInicio !== !!feriasFim) return aviso('cad-msg', 'Preencha o início e o fim das férias, ou deixe os dois em branco.');
  if (feriasInicio && feriasFim < feriasInicio) return aviso('cad-msg', 'O fim das férias precisa ser depois do início.');
  if (feriasInicio && diasEntre(dataLocal(feriasInicio), dataLocal(feriasFim)) + 1 > 30)
    return aviso('cad-msg', 'As férias passam de 30 dias. Confira as datas.');

  const dados = {nome, telefone, nascimento, admissao, feriasInicio, feriasFim,
                 cargo: $('f-cargo').value.trim(), setor: $('f-setor').value.trim()};

  if (editandoCpf){
    const u = db.usuarios.find(x => x.cpf === editandoCpf);
    Object.assign(u, dados);
    if (u !== usuarioAtual) u.perfil = $('f-perfil').value;
    if (cpf !== editandoCpf){
      // CPF corrigido: holerites e fila de importação passam a apontar para o CPF novo
      db.holerites.forEach(h => { if (h.cpf === editandoCpf) h.cpf = cpf; });
      fila.forEach(f => { if (f.cpf === editandoCpf) f.cpf = cpf; });
      if (u === usuarioAtual) { try { sessionStorage.setItem('holerite_sessao', cpf); } catch(e){} }
      u.cpf = cpf;
    }
    if (!salvar()) return;
    cancelarEdicaoFunc();
    aviso('cad-msg', 'Alterações salvas!', 'ok');
    $('rh-nome').textContent = usuarioAtual.nome;
  } else {
    db.usuarios.push({cpf, ...dados, senha: SENHA_PADRAO, perfil: $('f-perfil').value, trocarSenha: true});
    if (!salvar()) return;
    $('form-func').reset();
    aviso('cad-msg', `Cadastro realizado! No primeiro acesso, ${nome.split(' ')[0]} entra com o CPF e a senha padrão "${SENHA_PADRAO}", e cria a senha pessoal.`, 'ok');
  }
  renderFuncionarios(); preencherSelectFuncionarios(); renderLista(); renderFila();
});

async function redefinirSenha(cpf){
  const u = db.usuarios.find(x => x.cpf === cpf);
  if (!u) return;
  if (!(await perguntar('Voltar para a senha padrão?',
      `A senha atual de ${u.nome} deixará de funcionar.\nNo próximo acesso, a pessoa entra com a senha padrão e cria uma nova senha pessoal.`,
      {botao:'Redefinir senha'}))) return;
  u.senha = SENHA_PADRAO;
  u.trocarSenha = true;
  if (!salvar()) return;
  renderFuncionarios();
  avisar('Senha redefinida',
    `${u.nome} já pode entrar com o CPF e a senha padrão abaixo.\nNo acesso, o sistema vai pedir para criar uma senha pessoal.`,
    'sucesso', {codigo: SENHA_PADRAO});
}

async function removerFuncionario(cpf){
  const u = db.usuarios.find(u => u.cpf === cpf);
  if (!u) return;
  const deles = db.holerites.filter(h => h.cpf === cpf);
  const extra = deles.length ? `\nOs ${deles.length} holerite(s) dessa pessoa também serão apagados, inclusive os assinados e os PDFs.` : '';
  if (!(await perguntar('Remover funcionário?',
      `${u.nome} será removido(a) do sistema.${extra}\n\nIsso não pode ser desfeito.`,
      {botao:'Remover', perigo:true}))) return;
  deles.forEach(h => { if (h.pdfId) arquivos.apagar(h.pdfId).catch(() => {}); });
  db.usuarios = db.usuarios.filter(x => x.cpf !== cpf);
  db.holerites = db.holerites.filter(h => h.cpf !== cpf);
  fila.forEach(f => { if (f.cpf === cpf) f.cpf = ''; });
  if (editandoCpf === cpf) cancelarEdicaoFunc();
  if (editandoHolId && !db.holerites.some(h => h.id === editandoHolId)) resetarLancamento();
  salvar(); renderFuncionarios(); preencherSelectFuncionarios(); renderLista(); renderFila(); fecharPreview();
}

async function restaurarExemplo(){
  if (!(await perguntar('Apagar tudo e restaurar o exemplo?',
      'Todos os funcionários, holerites, PDFs e assinaturas cadastrados serão APAGADOS e substituídos pelos dados de exemplo.\n\nIsso não pode ser desfeito.',
      {botao:'Apagar e restaurar', perigo:true}))) return;
  try { await arquivos.limpar(); } catch(e){}
  db = dadosExemplo(); salvar();
  fila = [];
  const eu = db.usuarios.find(u => u.cpf === usuarioAtual.cpf);
  eu ? entrar(eu) : sair();
}
/* =========================================================
   TELA DO FUNCIONÁRIO + ASSINATURA
   ========================================================= */
let holeriteAberto = null;

function iniciarFunc(idParaMostrar){
  $('func-nome').textContent = usuarioAtual.nome;
  const meus = db.holerites
    .filter(h => h.cpf === usuarioAtual.cpf)
    .sort((a, b) => b.competencia.localeCompare(a.competencia));
  const sel = $('func-competencia'), area = $('func-holerite');

  const pendentes = meus.filter(h => !h.assinatura).length;
  $('func-pendentes').classList.toggle('oculto', !pendentes);
  $('func-pendentes').innerHTML = pendentes
    ? `✍️ Você tem <b>${pendentes} holerite${pendentes > 1 ? 's' : ''}</b> aguardando sua assinatura.` : '';

  renderHistorico(meus);

  if (!meus.length){
    sel.innerHTML = '<option>Nenhum holerite disponível</option>';
    sel.disabled = true; $('func-imprimir').disabled = true;
    $('func-assinar').classList.add('oculto'); $('func-status').innerHTML = '';
    area.innerHTML = '<p class="vazio">Ainda não há holerites lançados para você.</p>';
    return;
  }
  sel.disabled = false; $('func-imprimir').disabled = false;
  sel.innerHTML = meus.map(h =>
    `<option value="${h.id}">${nomeMes(h.competencia)} ${h.assinatura ? '✓ assinado' : '• pendente'}</option>`).join('');
  if (idParaMostrar) sel.value = idParaMostrar;

  const mostrar = () => {
    holeriteAberto = meus.find(h => String(h.id) === sel.value);
    renderHolerite(holeriteAberto, area);
    const a = holeriteAberto.assinatura;
    $('func-assinar').classList.toggle('oculto', !!a);
    $('func-status').innerHTML = a ? `<span class="tag tag-ok">✓ Assinado em ${fmtDataHora(a.data)}</span>` : '';
    $('func-imprimir').textContent = ehPdf(holeriteAberto) ? '🖨️ Imprimir comprovante' : '🖨️ Imprimir / Salvar PDF';
  };
  sel.onchange = mostrar;
  mostrar();
}

function renderHistorico(meus){
  $('tb-historico').innerHTML = meus.map(h => {
    const pdf = ehPdf(h), tp = soma(h.proventos), td = soma(h.descontos);
    return `<tr><td>${nomeMes(h.competencia)}</td>
      <td class="num">${pdf ? '—' : moeda(tp)}</td><td class="num">${pdf ? '—' : moeda(td)}</td>
      <td class="num">${pdf ? '<span class="tag tag-pdf">PDF</span>' : `<b>${moeda(tp - td)}</b>`}</td>
      <td>${h.assinatura ? '<span class="tag tag-ok">✓ Assinado</span>' : '<span class="tag tag-pend">• Pendente</span>'}</td>
      <td class="num"><button class="btn btn-claro btn-pequeno" onclick="abrirDoHistorico(${h.id})">Ver</button></td></tr>`;
  }).join('') || '<tr><td colspan="6" class="vazio">Nenhum holerite ainda.</td></tr>';
}

function abrirDoHistorico(id){
  $('func-competencia').value = id;
  $('func-competencia').onchange();
  window.scrollTo({top:0, behavior:'smooth'});
}

/* ---- Quadro de desenho da assinatura ---- */
const canvas = $('assin-canvas');
const ctx = canvas.getContext('2d');
let desenhando = false, temTraco = false;

function prepararCanvas(){
  const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  canvas.width = r.width * dpr; canvas.height = r.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#06104a';
  temTraco = false;
}
function posicao(e){ const r = canvas.getBoundingClientRect(); return {x: e.clientX - r.left, y: e.clientY - r.top}; }

canvas.addEventListener('pointerdown', e => {
  desenhando = true; canvas.setPointerCapture(e.pointerId);
  const p = posicao(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
});
canvas.addEventListener('pointermove', e => {
  if (!desenhando) return;
  const p = posicao(e); ctx.lineTo(p.x, p.y); ctx.stroke(); temTraco = true;
});
['pointerup','pointercancel'].forEach(ev => canvas.addEventListener(ev, () => desenhando = false));

function limparAssinatura(){ prepararCanvas(); }

function abrirModalAssinar(){
  if (!holeriteAberto || holeriteAberto.assinatura) return;
  $('assin-desc').textContent = nomeMes(holeriteAberto.competencia) + ' · ' + (ehPdf(holeriteAberto)
    ? 'Holerite em PDF. Confira o arquivo antes de assinar.'
    : 'Líquido: ' + moeda(soma(holeriteAberto.proventos) - soma(holeriteAberto.descontos)));
  $('assin-ok').checked = false; $('assin-senha').value = '';
  $('assin-msg').classList.add('oculto');
  $('modal-assinar').classList.remove('oculto');
  prepararCanvas();   // precisa estar visível para medir o tamanho
}
function fecharModalAssinar(){ $('modal-assinar').classList.add('oculto'); }

function confirmarAssinatura(){
  if (!$('assin-ok').checked) return aviso('assin-msg', 'Marque a declaração de recebimento.');
  if (!temTraco) return aviso('assin-msg', 'Desenhe sua assinatura no quadro.');
  if ($('assin-senha').value !== usuarioAtual.senha) return aviso('assin-msg', 'Senha incorreta.');
  const h = db.holerites.find(x => x.id === holeriteAberto.id);
  h.assinatura = {
    data: new Date().toISOString(),
    imagem: canvas.toDataURL('image/png'),
    nome: usuarioAtual.nome,
    cpf: usuarioAtual.cpf,
    dispositivo: navigator.userAgent
  };
  if (!salvar()) { delete h.assinatura; return; }
  fecharModalAssinar();
  iniciarFunc(h.id);
  avisar('Holerite assinado', `Sua assinatura de ${nomeMes(h.competencia)} foi registrada e enviada ao RH.`, 'sucesso');
}
/* =========================================================
   MODELO VISUAL DO HOLERITE (usado pelo funcionário e pelo RH)
   ========================================================= */
function htmlCabecalho(h){
  const f = dadosFuncionario(h.cpf);
  return `
    <div class="hol-cab">
      <div><div class="hol-marca">IMPAKTO</div><small>Higiene, Limpeza e Descartáveis</small></div>
      <div style="text-align:right"><b>Recibo de Pagamento de Salário</b><br>
        <small>Competência: ${nomeMes(h.competencia)}</small></div>
    </div>
    <div class="hol-info">
      <div><small>Funcionário</small>${esc(f.nome)}</div>
      <div><small>CPF</small>${formatarCPF(f.cpf)}</div>
      <div><small>Cargo</small>${esc(f.cargo) || '—'}</div>
      <div><small>Setor</small>${esc(f.setor) || '—'}</div>
      <div><small>Admissão</small>${fmtData(f.admissao)}</div>
    </div>`;
}

function htmlAssinatura(h){
  const a = h.assinatura;
  const imgOk = a && typeof a.imagem === 'string' && a.imagem.startsWith('data:image/png');
  return `
    <div class="assinatura">
      <div><div class="assin-area">${a ? fmtDataHora(a.data) : ''}</div><div class="assin-linha">Data</div></div>
      <div><div class="assin-area">${a ? (imgOk ? `<img src="${a.imagem}" alt="Assinatura">` : `<i>${esc(a.nome)}</i>`) : ''}</div>
           <div class="assin-linha">Assinatura do funcionário</div></div>
    </div>
    ${a ? `<div class="selo">✓ Assinado eletronicamente por ${esc(a.nome)} (CPF ${formatarCPF(a.cpf)}) em ${fmtDataHora(a.data)}.</div>` : ''}`;
}

// Holerite lançado manualmente (tabela com proventos e descontos)
function htmlHolerite(h){
  const tp = soma(h.proventos), td = soma(h.descontos);
  const linhas = [...h.proventos.map(p => ({...p, tipo:'p'})), ...h.descontos.map(p => ({...p, tipo:'d'}))];
  return `
  <div class="holerite">
    ${htmlCabecalho(h)}
    <table>
      <thead><tr><th>Descrição</th><th>Referência</th><th class="num">Vencimentos</th><th class="num">Descontos</th></tr></thead>
      <tbody>${linhas.map(l => `
        <tr><td>${esc(l.desc)}</td><td>${esc(l.ref)}</td>
            <td class="num">${l.tipo === 'p' ? num(l.valor) : ''}</td>
            <td class="num">${l.tipo === 'd' ? num(l.valor) : ''}</td></tr>`).join('')}
      </tbody>
      <tfoot><tr><td colspan="2">Totais</td><td class="num">${num(tp)}</td><td class="num">${num(td)}</td></tr></tfoot>
    </table>
    <div class="liquido"><span>Valor líquido a receber</span><b>${moeda(tp - td)}</b></div>
    <div class="hol-rodape">Declaro ter recebido a importância líquida discriminada neste recibo.${htmlAssinatura(h)}</div>
  </div>`;
}

function nomeDownload(h){
  const f = dadosFuncionario(h.cpf);
  const nome = normalizar(f.nome).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `holerite_${nome || 'funcionario'}_${h.competencia}.pdf`;
}

// Holerite importado em PDF
function htmlPdf(h, url){
  return `
  <div class="holerite">
    ${htmlCabecalho(h)}
    <div class="pdf-barra nao-imprimir">
      <span>📄 ${esc(h.arquivo || 'holerite.pdf')}${h.tamanho ? ' · ' + tamanhoLegivel(h.tamanho) : ''}</span>
      ${url ? `<span class="acoes">
        <a class="btn btn-claro btn-pequeno" href="${url}" target="_blank" rel="noopener">Abrir em nova aba</a>
        <a class="btn btn-amarelo btn-pequeno" href="${url}" download="${esc(nomeDownload(h))}">⬇ Baixar PDF</a></span>` : ''}
    </div>
    ${url
      ? `<iframe class="pdf-frame nao-imprimir" src="${url}" title="Holerite em PDF"></iframe>`
      : '<p class="vazio nao-imprimir">Não foi possível carregar o PDF deste holerite neste navegador.</p>'}
    <div class="hol-rodape">Declaro ter recebido a importância líquida discriminada no holerite em PDF referente a esta competência.${htmlAssinatura(h)}</div>
  </div>`;
}

// Mostra o holerite (manual ou PDF) dentro de um elemento da página
const urlsPdf = {};
async function renderHolerite(h, el){
  if (urlsPdf[el.id]) { URL.revokeObjectURL(urlsPdf[el.id]); delete urlsPdf[el.id]; }
  if (!ehPdf(h)) { el.innerHTML = htmlHolerite(h); return; }
  const marca = h.id + '_' + Date.now();
  el.dataset.marca = marca;
  el.innerHTML = `<div class="holerite">${htmlCabecalho(h)}<p class="vazio">Carregando PDF…</p></div>`;
  let dados = null;
  try { dados = await arquivos.ler(h.pdfId); } catch(e){}
  if (el.dataset.marca !== marca) return;          // a pessoa já trocou de holerite enquanto carregava
  if (!dados) { el.innerHTML = htmlPdf(h, null); return; }
  const url = URL.createObjectURL(new Blob([dados], {type:'application/pdf'}));
  urlsPdf[el.id] = url;
  el.innerHTML = htmlPdf(h, url);
}
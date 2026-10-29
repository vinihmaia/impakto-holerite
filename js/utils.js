/* =========================================================
   FERRAMENTAS GERAIS: CPF, dinheiro, datas, textos e janelas de aviso
   ========================================================= */
const $ = id => document.getElementById(id);
const soDigitos = s => (s || '').replace(/\D/g, '');
const novoId = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);

function formatarCPF(v){
  const d = soDigitos(v).slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

// Confere os 2 dígitos verificadores do CPF (a "conta" da Receita)
function cpfValido(cpf){
  const d = soDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = n => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

const moeda = v => (Number(v) || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
const num   = v => (Number(v) || 0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
const soma  = lista => (lista || []).reduce((t, i) => t + (Number(i.valor) || 0), 0);
const nomeMes = comp => { const [a, m] = comp.split('-'); return MESES[Number(m) - 1] + '/' + a; };
const fmtData = s => s ? s.split('-').reverse().join('/') : '—';
const fmtDataHora = iso => new Date(iso).toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'});
// Impede que um texto digitado vire código na página
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Minúsculo e sem acentos: faz a busca achar "joao" em "João"
const normalizar = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const ehPdf = h => h && h.tipo === 'pdf';
const tamanhoLegivel = b => b < 1024 * 1024
  ? Math.max(1, Math.round(b / 1024)) + ' KB'
  : (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';

// Mensagem pequena dentro de um formulário (vermelha = erro, verde = ok)
function aviso(id, texto, tipo){
  const el = $(id);
  el.className = tipo === 'ok' ? 'sucesso' : 'erro';
  el.textContent = texto;
  if (tipo === 'ok') setTimeout(() => el.classList.add('oculto'), 4000);
}

/* ---------------------------------------------------------
   Janela de aviso/confirmação no visual da Impakto
   - avisar(titulo, mensagem, tipo)               → só botão OK
   - perguntar(titulo, mensagem, {botao, perigo}) → true (confirmou) / false (cancelou)
   --------------------------------------------------------- */
let resolverDialogo = null;

function dialogo({titulo, mensagem = '', tipo = 'info', botaoOk = 'OK', botaoCancelar = null, perigo = false, codigo = null}){
  return new Promise(resolve => {
    if (resolverDialogo) resolverDialogo(false);
    resolverDialogo = resolve;
    const icone = $('dlg-icone');
    icone.className = 'dlg-icone dlg-' + tipo;
    icone.textContent = {info:'i', aviso:'!', perigo:'!', sucesso:'✓'}[tipo] || 'i';
    $('dlg-titulo').textContent = titulo;
    $('dlg-msg').textContent = mensagem;
    $('dlg-msg').classList.toggle('oculto', !mensagem);
    $('dlg-codigo').classList.toggle('oculto', !codigo);
    if (codigo){ $('dlg-codigo-valor').textContent = codigo; $('dlg-copiar').textContent = 'Copiar'; }
    $('dlg-cancelar').textContent = botaoCancelar || '';
    $('dlg-cancelar').classList.toggle('oculto', !botaoCancelar);
    $('dlg-ok').textContent = botaoOk;
    $('dlg-ok').className = 'btn ' + (perigo ? 'btn-perigo-forte' : 'btn-primario');
    $('modal-dialogo').classList.remove('oculto');
    setTimeout(() => $('dlg-ok').focus(), 30);
  });
}

function fecharDialogo(valor){
  $('modal-dialogo').classList.add('oculto');
  const r = resolverDialogo; resolverDialogo = null;
  if (r) r(valor);
}

const avisar = (titulo, mensagem, tipo = 'info', extra = {}) =>
  dialogo({titulo, mensagem, tipo, botaoOk: 'OK', ...extra});

const perguntar = (titulo, mensagem, opcoes = {}) =>
  dialogo({titulo, mensagem, tipo: opcoes.perigo ? 'perigo' : 'aviso',
           botaoOk: opcoes.botao || 'Continuar', botaoCancelar: 'Cancelar', perigo: !!opcoes.perigo});

$('dlg-ok').onclick = () => fecharDialogo(true);
$('dlg-cancelar').onclick = () => fecharDialogo(false);
$('modal-dialogo').addEventListener('click', e => {
  if (e.target.id === 'modal-dialogo' && !$('dlg-cancelar').classList.contains('oculto')) fecharDialogo(false);
});
document.addEventListener('keydown', e => {
  if ($('modal-dialogo').classList.contains('oculto')) return;
  if (e.key === 'Escape') fecharDialogo($('dlg-cancelar').classList.contains('oculto'));
});
$('dlg-copiar').onclick = async () => {
  try { await navigator.clipboard.writeText($('dlg-codigo-valor').textContent); $('dlg-copiar').textContent = 'Copiado ✓'; }
  catch(e){ $('dlg-copiar').textContent = 'Selecione e copie'; }
};

/* Se o logo.png não for encontrado, mostra o texto "IMPAKTO" no lugar */
(function(){
  const teste = new Image();
  teste.onerror = () => $('logo-recorte').classList.add('sem-imagem');
  teste.src = 'logo.png';
})();
/* =========================================================
   TEMA CLARO / ESCURO
   - Lembra a escolha neste navegador
   - Na primeira vez, segue o tema do computador
   - Na impressão, usa sempre o tema claro
   ========================================================= */
const TEMA_CHAVE = 'holerite_tema';

function aplicarTema(tema){
  document.documentElement.dataset.tema = tema;
  document.querySelectorAll('.btn-tema').forEach(b => {
    b.textContent = tema === 'escuro' ? '🌙 Escuro' : '☀️ Claro';
    b.title = tema === 'escuro' ? 'Tema escuro ativo. Clique para mudar para o claro.'
                                : 'Tema claro ativo. Clique para mudar para o escuro.';
  });
}

function alternarTema(){
  const novo = document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro';
  aplicarTema(novo);
  try { localStorage.setItem(TEMA_CHAVE, novo); } catch(e){}
}

(function(){
  let tema = null;
  try { tema = localStorage.getItem(TEMA_CHAVE); } catch(e){}
  if (!tema) tema = matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
  aplicarTema(tema);
})();

let temaAntesDeImprimir = null;
window.addEventListener('beforeprint', () => {
  temaAntesDeImprimir = document.documentElement.dataset.tema;
  document.documentElement.dataset.tema = 'claro';
});
window.addEventListener('afterprint', () => {
  if (temaAntesDeImprimir) document.documentElement.dataset.tema = temaAntesDeImprimir;
});
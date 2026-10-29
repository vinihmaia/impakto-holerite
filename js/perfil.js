/* =========================================================
   MEU PERFIL: dados do funcionário, tempo de empresa e férias
   ========================================================= */

/* ---- Datas (sempre no horário local, sem problema de fuso) ---- */
function dataLocal(iso){ const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); }
function hojeLocal(){ const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), h.getDate()); }
function hojeISO(){
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
}
const diasEntre = (a, b) => Math.round((b - a) / 86400000);
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Quanto tempo passou desde uma data: anos, meses, dias e total de dias
function tempoDecorrido(iso){
  const ini = dataLocal(iso), hoje = hojeLocal();
  if (ini > hoje) return null;
  let anos = hoje.getFullYear() - ini.getFullYear();
  let meses = hoje.getMonth() - ini.getMonth();
  let dias = hoje.getDate() - ini.getDate();
  if (dias < 0) { meses--; dias += new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate(); }
  if (meses < 0) { anos--; meses += 12; }
  return {anos, meses, dias, total: diasEntre(ini, hoje)};
}

// Situação das férias: futuras, acontecendo agora ou já concluídas
function infoFerias(u){
  if (!u || !u.feriasInicio || !u.feriasFim) return null;
  const ini = dataLocal(u.feriasInicio), fim = dataLocal(u.feriasFim), hoje = hojeLocal();
  const periodo = `${fmtData(u.feriasInicio)} a ${fmtData(u.feriasFim)} (${plural(diasEntre(ini, fim) + 1, 'dia', 'dias')})`;
  if (hoje < ini) return {tipo:'futuro', periodo, faltam: diasEntre(hoje, ini)};
  if (hoje <= fim) {
    const retorno = new Date(fim); retorno.setDate(retorno.getDate() + 1);
    return {tipo:'agora', periodo, retorno: retorno.toLocaleDateString('pt-BR')};
  }
  return {tipo:'passado', periodo};
}

// (11) 91234-5678 ou (11) 3456-7890
function formatarTelefone(v){
  const d = soDigitos(v).slice(0, 11);
  if (!d.length) return '';
  if (d.length <= 2) return '(' + d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function iniciais(nome){
  const p = (nome || '').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

/* ---- Janela "Meu perfil" ---- */
function abrirPerfil(){
  const u = usuarioAtual;
  if (!u) return;
  $('perfil-avatar').textContent = iniciais(u.nome);
  $('perfil-nome').textContent = u.nome;
  $('perfil-cargo').textContent = [u.cargo, u.setor].filter(Boolean).join(' · ') || 'Cargo e setor não informados';

  const t = u.admissao ? tempoDecorrido(u.admissao) : null;
  const f = infoFerias(u);

  const destaques = [
    t ? {r:'Dias na empresa', v: t.total.toLocaleString('pt-BR'), s: `desde ${fmtData(u.admissao)}`}
      : {r:'Dias na empresa', v:'—', s: u.admissao ? `começa em ${fmtData(u.admissao)}` : 'admissão não informada'},
    t ? {r:'Tempo de casa', v: plural(t.anos, 'ano', 'anos'), s: `e ${plural(t.meses, 'mês', 'meses')}`}
      : {r:'Tempo de casa', v:'—', s:''},
    f && f.tipo === 'futuro'
      ? {r:'Próximas férias', v: f.faltam === 1 ? 'Amanhã' : plural(f.faltam, 'dia', 'dias'), s: f.faltam === 1 ? 'as férias começam' : 'para as férias'}
      : f && f.tipo === 'agora'
        ? {r:'Férias', v:'Agora 🌴', s:`retorno em ${f.retorno}`}
        : {r:'Próximas férias', v:'—', s:'nenhuma programada'}
  ];
  $('perfil-destaques').innerHTML = destaques.map(d =>
    `<div class="destaque"><small>${d.r}</small><b>${esc(d.v)}</b><span>${esc(d.s)}</span></div>`).join('');

  const faixa = $('perfil-ferias');
  if (f && f.tipo !== 'passado') {
    faixa.className = 'perfil-ferias ' + f.tipo;
    faixa.textContent = f.tipo === 'agora'
      ? `🌴 Você está de férias: ${f.periodo}. Bom descanso!`
      : `🗓️ Férias programadas: ${f.periodo}.`;
  } else {
    faixa.className = 'perfil-ferias oculto';
  }

  const idade = u.nascimento ? tempoDecorrido(u.nascimento) : null;
  const itens = [
    ['CPF', formatarCPF(u.cpf)],
    ['Data de nascimento', u.nascimento ? fmtData(u.nascimento) + (idade ? ` (${plural(idade.anos, 'ano', 'anos')})` : '') : '—'],
    ['Cargo', u.cargo || '—'],
    ['Setor', u.setor || '—'],
    ['Admissão', fmtData(u.admissao)],
    ['Férias programadas', f ? f.periodo + (f.tipo === 'passado' ? ' · concluídas' : '') : 'Nenhuma']
  ];
  $('perfil-dados').innerHTML = itens.map(([r, v]) =>
    `<div class="perfil-item"><small>${r}</small><b>${esc(v)}</b></div>`).join('');

  $('perfil-telefone').value = formatarTelefone(u.telefone || '');
  $('perfil-msg').classList.add('oculto');
  $('modal-perfil').classList.remove('oculto');
}

function fecharPerfil(){ $('modal-perfil').classList.add('oculto'); }

function salvarTelefone(){
  const d = soDigitos($('perfil-telefone').value);
  if (d && (d.length < 10 || d.length > 11)) return aviso('perfil-msg', 'Telefone incompleto. Use DDD + número.');
  usuarioAtual.telefone = d;
  if (!salvar()) return;
  $('perfil-telefone').value = formatarTelefone(d);
  aviso('perfil-msg', d ? 'Telefone atualizado!' : 'Telefone removido.', 'ok');
}

$('perfil-telefone').addEventListener('input', e => e.target.value = formatarTelefone(e.target.value));
$('perfil-telefone').addEventListener('keydown', e => { if (e.key === 'Enter') salvarTelefone(); });
$('modal-perfil').addEventListener('click', e => { if (e.target.id === 'modal-perfil') fecharPerfil(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('modal-perfil').classList.contains('oculto')
      && $('modal-dialogo').classList.contains('oculto')) fecharPerfil();
});
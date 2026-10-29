/* =========================================================
   LOGIN, LOGOUT E SENHAS
   ========================================================= */
function mostrarTela(id){
  ['tela-login','tela-func','tela-rh'].forEach(t => $(t).classList.toggle('oculto', t !== id));
  if (id === 'tela-login') esteira.iniciar(); else esteira.parar();
  window.scrollTo(0, 0);
}

function msgLogin(texto, campoComErro, tipo){
  const el = $('login-msg');
  el.textContent = texto || '';
  el.style.color = tipo === 'info' ? 'var(--lg-info)' : 'var(--lg-erro)';
  ['login-cpf','login-senha'].forEach(c => $(c).classList.toggle('ruim', c === campoComErro));
}

function esqueciSenha(){ msgLogin('Procure o RH da Impakto para redefinir sua senha.', null, 'info'); }

$('login-cpf').addEventListener('input', e => { e.target.value = formatarCPF(e.target.value); msgLogin(''); });
$('login-senha').addEventListener('input', () => msgLogin(''));

$('form-login').addEventListener('submit', e => {
  e.preventDefault();
  const cpf = soDigitos($('login-cpf').value);
  const senha = $('login-senha').value;
  if (!cpf) return msgLogin('Digite seu CPF.', 'login-cpf');
  if (!cpfValido(cpf)) return msgLogin('CPF inválido. Confira os números.', 'login-cpf');
  if (!senha) return msgLogin('Digite sua senha.', 'login-senha');
  const u = db.usuarios.find(u => u.cpf === cpf && u.senha === senha);
  if (!u) return msgLogin('CPF ou senha incorretos.');
  msgLogin('');
  entrar(u);
});

function entrar(u){
  usuarioAtual = u;
  try { sessionStorage.setItem('holerite_sessao', u.cpf); } catch(e){}
  if (u.perfil === 'rh') { mostrarTela('tela-rh'); iniciarRH(); }
  else { mostrarTela('tela-func'); iniciarFunc(); }
  if (u.trocarSenha) abrirModalSenha(true);   // primeiro acesso (senha padrão) ou senha redefinida pelo RH
}

function sair(){
  usuarioAtual = null;
  try { sessionStorage.removeItem('holerite_sessao'); } catch(e){}
  $('form-login').reset();
  msgLogin('');
  fecharModalAssinar();
  senhaObrigatoria = false;
  $('modal-senha').classList.add('oculto');
  if (resolverDialogo) fecharDialogo(false);
  fila = []; renderFila();
  Object.keys(urlsPdf).forEach(k => { URL.revokeObjectURL(urlsPdf[k]); delete urlsPdf[k]; });
  $('func-holerite').innerHTML = ''; $('rh-preview').innerHTML = '';
  mostrarTela('tela-login');
}

/* ---- Janela de troca de senha ---- */
let senhaObrigatoria = false;

function abrirModalSenha(obrigatoria){
  senhaObrigatoria = !!obrigatoria;
  $('senha-titulo').textContent = obrigatoria ? 'Crie sua senha pessoal' : 'Trocar senha';
  $('senha-desc').textContent = obrigatoria
    ? 'Você entrou com a senha padrão. Para continuar, crie agora uma senha só sua, com pelo menos 6 caracteres.'
    : 'Escolha uma senha nova com pelo menos 6 caracteres.';
  $('senha-atual-box').classList.toggle('oculto', obrigatoria);
  $('senha-cancelar').classList.toggle('oculto', obrigatoria);
  $('senha-sair').classList.toggle('oculto', !obrigatoria);
  ['senha-atual','senha-nova','senha-conf'].forEach(id => $(id).value = '');
  $('senha-msg').classList.add('oculto');
  $('modal-senha').classList.remove('oculto');
  $(obrigatoria ? 'senha-nova' : 'senha-atual').focus();
}

function fecharModalSenha(){ if (!senhaObrigatoria) $('modal-senha').classList.add('oculto'); }

function salvarNovaSenha(){
  const atual = $('senha-atual').value, nova = $('senha-nova').value, conf = $('senha-conf').value;
  if (!senhaObrigatoria && atual !== usuarioAtual.senha) return aviso('senha-msg', 'Senha atual incorreta.');
  if (nova.length < 6) return aviso('senha-msg', 'A nova senha precisa ter pelo menos 6 caracteres.');
  if (nova !== conf) return aviso('senha-msg', 'As duas senhas digitadas não são iguais.');
  if (nova.toLowerCase() === SENHA_PADRAO.toLowerCase()) return aviso('senha-msg', 'Escolha uma senha pessoal, diferente da senha padrão.');
  if (nova === usuarioAtual.senha) return aviso('senha-msg', 'A nova senha precisa ser diferente da atual.');
  if (soDigitos(nova) === usuarioAtual.cpf) return aviso('senha-msg', 'Não use o seu CPF como senha.');
  usuarioAtual.senha = nova;
  usuarioAtual.trocarSenha = false;
  if (!salvar()) return;
  senhaObrigatoria = false;
  $('modal-senha').classList.add('oculto');
  avisar('Senha criada', 'Pronto! A partir de agora, entre com o seu CPF e a sua senha pessoal.', 'sucesso');
}
$('senha-conf').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); salvarNovaSenha(); } });
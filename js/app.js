/* =========================================================
   INÍCIO: roda por último, quando todos os outros arquivos já carregaram
   Se a pessoa já estava logada nesta aba, continua logada; senão, mostra o login.
   ========================================================= */
(function(){
  let cpf = null;
  try { cpf = sessionStorage.getItem('holerite_sessao'); } catch(e){}
  const u = cpf && db.usuarios.find(u => u.cpf === cpf);
  if (u) entrar(u); else mostrarTela('tela-login');
})();
/* =========================================================
   MENU "⋮" DO TOPO (só aparece no celular)
   ========================================================= */
function alternarMenu(botao){
  const menu = botao.nextElementSibling;
  const abrir = !menu.classList.contains('aberto');
  fecharMenus();
  if (abrir){
    // mostra o nome da pessoa no alto do menu
    const nome = botao.parentElement.querySelector('.nome-usuario');
    const titulo = menu.querySelector('.menu-nome');
    if (nome && titulo) titulo.textContent = nome.textContent;
    menu.classList.add('aberto');
    botao.setAttribute('aria-expanded', 'true');
  }
}

function fecharMenus(){
  document.querySelectorAll('.menu-topo.aberto').forEach(m => m.classList.remove('aberto'));
  document.querySelectorAll('.btn-menu').forEach(b => b.setAttribute('aria-expanded', 'false'));
}

// Fecha ao escolher uma opção, ao tocar fora, ao apertar Esc ou se a tela ficar grande
document.addEventListener('click', e => {
  if (e.target.closest('.btn-menu')) return;
  if (e.target.closest('.menu-topo button')) { fecharMenus(); return; }
  if (!e.target.closest('.menu-topo')) fecharMenus();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharMenus(); });
window.addEventListener('resize', () => { if (window.innerWidth > 700) fecharMenus(); });
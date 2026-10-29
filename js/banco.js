/* =========================================================
   BANCO DE DADOS (versão de teste, dentro do navegador)
   - Dados (funcionários, holerites, assinaturas): localStorage
   - Arquivos PDF: IndexedDB (cabe muito mais)
   Quando formos para o Supabase, a maior parte da troca acontece AQUI.
   ========================================================= */

function dadosExemplo(){
  return {
    usuarios: [
      {cpf:'11144477735', nome:'Ana Paula Ribeiro', senha:'rh123', perfil:'rh',
       cargo:'Analista de RH', setor:'Recursos Humanos', admissao:'2015-03-02'},
      {cpf:'52998224725', nome:'João da Silva', senha:'1234', perfil:'func',
       cargo:'Auxiliar de Logística', setor:'Expedição', admissao:'2019-08-12'},
      {cpf:'12345678909', nome:'Maria Souza', senha:'1234', perfil:'func',
       cargo:'Assistente Comercial', setor:'Vendas', admissao:'2021-01-18'}
    ],
    holerites: [
      {id:1, cpf:'52998224725', competencia:'2026-09',
       proventos:[{desc:'Salário base',ref:'30 dias',valor:2400},{desc:'Horas extras 50%',ref:'10h',valor:163.64}],
       descontos:[{desc:'INSS',ref:'',valor:205.73},{desc:'Vale-transporte',ref:'6%',valor:144}],
       assinatura:{data:'2026-10-05T11:32:00-03:00', imagem:null, nome:'João da Silva', cpf:'52998224725'}},
      {id:2, cpf:'52998224725', competencia:'2026-10',
       proventos:[{desc:'Salário base',ref:'30 dias',valor:2400}],
       descontos:[{desc:'INSS',ref:'',valor:192},{desc:'Vale-transporte',ref:'6%',valor:144},{desc:'Adiantamento',ref:'40%',valor:960}]},
      {id:3, cpf:'12345678909', competencia:'2026-10',
       proventos:[{desc:'Salário base',ref:'30 dias',valor:3100},{desc:'Comissão sobre vendas',ref:'',valor:450}],
       descontos:[{desc:'INSS',ref:'',valor:300.5},{desc:'Vale-transporte',ref:'6%',valor:186},{desc:'Plano odontológico',ref:'',valor:39.9}]}
    ]
  };
}

function carregar(){
  try { const d = JSON.parse(localStorage.getItem(CHAVE)); if (d && d.usuarios) return d; } catch(e){}
  return dadosExemplo();
}

function salvar(){
  try { localStorage.setItem(CHAVE, JSON.stringify(db)); return true; }
  catch(e){
    avisar('Não foi possível salvar', 'O navegador não deixou gravar os dados.\nPode ser falta de espaço ou um bloqueio do navegador.', 'perigo');
    return false;
  }
}

let db = carregar();          // todos os dados em memória
let usuarioAtual = null;      // quem está logado agora

// Atalhos para buscar informações de um funcionário pelo CPF
const nomeDe = cpf => (db.usuarios.find(u => u.cpf === cpf) || {nome:'(removido)'}).nome;
function dadosFuncionario(cpf){
  return db.usuarios.find(u => u.cpf === cpf) ||
         {nome:'(funcionário removido)', cpf, cargo:'', setor:'', admissao:''};
}

/* ---- "Armário" de PDFs (IndexedDB) ---- */
const arquivos = (() => {
  let conexao = null;
  function abrir(){
    if (!conexao) conexao = new Promise((ok, falha) => {
      if (!window.indexedDB) return falha(new Error('Navegador sem IndexedDB'));
      const r = indexedDB.open('holerite_arquivos', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('pdfs');
      r.onsuccess = () => ok(r.result);
      r.onerror = () => falha(r.error);
    });
    return conexao;
  }
  async function operar(modo, fn){
    const base = await abrir();
    return new Promise((ok, falha) => {
      const tx = base.transaction('pdfs', modo);
      const pedido = fn(tx.objectStore('pdfs'));
      tx.oncomplete = () => ok(pedido ? pedido.result : undefined);
      tx.onerror = () => falha(tx.error);
      tx.onabort = () => falha(tx.error);
    });
  }
  return {
    salvar: (id, dados) => operar('readwrite', s => s.put(dados, id)),
    ler:    id => operar('readonly', s => s.get(id)),
    apagar: id => operar('readwrite', s => s.delete(id)),
    limpar: () => operar('readwrite', s => s.clear())
  };
})();
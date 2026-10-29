# Portal do Holerite · Impakto

Portal web para os funcionários da **Impakto – Higiene, Limpeza e Descartáveis** consultarem, baixarem e **assinarem eletronicamente** seus holerites. O RH importa os PDFs gerados pelo sistema de folha (ou lança manualmente) e acompanha quem já assinou.

> ⚠️ **Status: protótipo.** Os dados ficam guardados **apenas no navegador** do computador onde o sistema foi usado. Use **somente dados de teste** até a migração para um banco de dados real (veja [Limitações](#️-limitações-e-segurança)).

---

## ✨ Funcionalidades

### Tela de login
- Login com **CPF + senha** (o CPF é validado e formatado automaticamente)
- Esteira animada "papel → scanner → digital" com contador de papel economizado
- **Primeiro acesso** com senha padrão e troca obrigatória para senha pessoal
- Link "Esqueci minha senha" (orienta a procurar o RH)
- Tema **claro / escuro**

### Funcionário
- Ver holerites (lançados manualmente ou em **PDF**), mês a mês
- **Assinar** o holerite: declaração + assinatura desenhada + confirmação de senha
- Histórico com todos os meses e status (assinado / pendente)
- Imprimir / salvar em PDF; baixar o PDF original
- **Meu perfil**: dias na empresa, tempo de casa, idade, férias programadas, editar telefone
- Trocar a própria senha

### RH
- **Importar PDFs** (vários de uma vez), com detecção automática de funcionário e mês pelo nome do arquivo
- Lançar, editar e excluir holerites manualmente; **copiar o mês anterior**
- Acompanhar assinaturas (filtro pendentes / assinados + busca por nome)
- Cadastrar, editar e remover funcionários (telefone, nascimento, cargo, setor, admissão, férias)
- **Redefinir senha** de um funcionário (volta para a senha padrão)

### Geral
- Janelas de aviso no visual da Impakto (no lugar das janelas cinzas do navegador)
- Tema claro/escuro lembrado por navegador
- **Celular:** menu "⋮" no topo para economizar espaço

---

## 🚀 Como rodar

Não precisa instalar nada.

1. Baixe/copie a pasta `holerite-portal` para o computador
2. Confira se o arquivo **`logo.png`** está na pasta principal
3. Dê **dois cliques** no `index.html` (abre no navegador)

Navegadores recomendados: **Google Chrome** ou **Microsoft Edge** atualizados.

---

## 🔑 Usuários de teste

| Perfil | Nome | CPF | Senha |
|---|---|---|---|
| RH | Ana Paula Ribeiro | `111.444.777-35` | `rh123` |
| Funcionário | João da Silva | `529.982.247-25` | `1234` |
| Funcionária | Maria Souza | `123.456.789-09` | `1234` |

- Pessoas cadastradas pelo RH entram pela primeira vez com a senha padrão **`Database`** (com **D** maiúsculo).
- Para voltar aos dados originais: entre como RH → **Funcionários → Restaurar dados de exemplo** (⚠️ apaga tudo o que foi cadastrado).

---

## 📁 Estrutura de pastas

```
holerite-portal/
├── index.html            ← estrutura de todas as telas
├── logo.png              ← logo com fundo transparente
├── README.md             ← este arquivo
├── CHANGELOG.md          ← histórico de versões
├── .gitignore            ← arquivos que o Git deve ignorar
├── css/
│   ├── base.css          ← cores (tema claro/escuro), botões, formulários, tabelas, janelas
│   ├── login.css         ← tela de login e esteira animada
│   └── paineis.css       ← telas do funcionário e do RH, holerite, perfil, menu do celular
└── js/
    ├── config.js         ← ⚙️ configurações (senha padrão, limite de PDF...)
    ├── utils.js          ← ferramentas: CPF, dinheiro, datas, janelas de aviso, tema
    ├── banco.js          ← onde os dados são guardados e lidos
    ├── holerite.js       ← "desenho" do holerite (manual e PDF)
    ├── esteira.js        ← animação da tela de login
    ├── login.js          ← entrar, sair, trocar senha
    ├── perfil.js         ← "Meu perfil", tempo de empresa, férias
    ├── menu.js           ← menu "⋮" do celular
    ├── funcionario.js    ← tela do funcionário e assinatura
    ├── rh.js             ← painel do RH
    └── app.js            ← liga tudo quando a página abre
```

> **A ordem dos `<script>` no `index.html` importa:** cada arquivo usa funções dos anteriores. Não mude a ordem.

---

## ⚙️ Configurações

Ficam em **`js/config.js`**:

| Configuração | Padrão | O que faz |
|---|---|---|
| `SENHA_PADRAO` | `'Database'` | Senha do primeiro acesso e da redefinição pelo RH |
| `LIMITE_PDF` | `10 MB` | Tamanho máximo de cada PDF importado |
| `CHAVE` | `'holerite_dados_v1'` | Nome da "gaveta" de dados no navegador (**não mude** sem motivo: os dados atuais ficariam "perdidos") |

---

## 📄 Importando PDFs (RH)

- Um arquivo **por funcionário**
- Se o nome do arquivo tiver o **CPF** (ou o nome) e o **mês**, o sistema preenche sozinho. Exemplos:
  - `52998224725_2026-10.pdf`
  - `Joao da Silva - outubro 2026.pdf`
- Linhas em **amarelo** = falta escolher o funcionário
- Só aceita PDF verdadeiro, até 10 MB

---

## 💾 Onde os dados ficam

| O quê | Onde |
|---|---|
| Funcionários, holerites, assinaturas | `localStorage` do navegador (limite de ~5 MB) |
| Arquivos PDF | `IndexedDB` do navegador (bem maior) |
| Tema escolhido | `localStorage` |
| Sessão (quem está logado) | `sessionStorage` (some ao fechar a aba) |

Tudo isso fica **só no navegador e no computador** onde o portal foi usado.

---

## ⚠️ Limitações e segurança

Este é um **protótipo**. Antes de usar com dados reais:

- **Os dados não são compartilhados:** o que o RH lança num computador não aparece no celular do funcionário.
- **As senhas não são protegidas:** quem abrir as ferramentas do navegador (F12) consegue vê-las.
- **Dados podem sumir:** limpar o histórico ou os dados de navegação apaga tudo.
- **Espaço limitado:** com muitas assinaturas, o `localStorage` enche.
- **Senha padrão comum:** quem souber o CPF de um colega pode fazer o primeiro acesso no lugar dele. Peça para cada funcionário entrar logo após o cadastro.
- **LGPD:** CPF e salário são dados pessoais. A versão real precisa da aprovação da TI/diretoria da Impakto.
- **Assinatura eletrônica simples:** para ter força como prova, a versão real deve registrar IP, manter histórico que não pode ser apagado e garantir que o documento não foi alterado. Confirme com o contador/advogado trabalhista.

---

## 🛠️ Solução de problemas

| Sintoma | Causa provável | Solução |
|---|---|---|
| Página sem cores / com letras "Times" | Um arquivo `.css` não foi encontrado | Confira nomes e pastas (veja abaixo) |
| Nada funciona (login não entra) | Um arquivo `.js` não foi encontrado ou está incompleto | Aperte **F12 → Console** e veja a linha vermelha |
| Aparece o texto "IMPAKTO" no lugar do logo | `logo.png` não está na pasta principal | Coloque o arquivo com esse nome exato |
| Mudança no código não aparece | O navegador usou uma cópia antiga | Salve o arquivo (**Ctrl+S**) e recarregue com **Ctrl+F5** |

**Dica para conferir os nomes reais dos arquivos:** cole o caminho da pasta na barra do Chrome, por exemplo
`C:/Users/SEU_USUARIO/Desktop/holerite-portal/css/`. Ele lista os arquivos sem esconder extensões (ex.: `login.css.txt` ❌).

---

## 🧪 Testar como celular no computador

1. Abra o portal no Chrome e aperte **F12**
2. Aperte **Ctrl+Shift+M** e escolha um aparelho (ex.: iPhone 12 Pro)

---

## 🗺️ Próximos passos

- [ ] **Backup**: exportar e importar todos os dados num arquivo
- [ ] **Importação em lote**: separar automaticamente um PDF único com todos os funcionários
- [ ] **Banco de dados real (Supabase)**: acesso pelo celular, senhas protegidas, sem limite de espaço
- [ ] Publicar o site com HTTPS
- [ ] Bloqueio após várias senhas erradas e saída automática por inatividade
- [ ] Aprovação da TI/diretoria (LGPD)

---

## 🧰 Tecnologias

HTML, CSS e JavaScript puros (sem frameworks), fontes Poppins, Montserrat e IBM Plex Mono (Google Fonts).

---

## 📝 Licença

Projeto **privado**, de uso interno. Logo e marca pertencem à Impakto – Higiene, Limpeza e Descartáveis.
/* =========================================================
   ESTEIRA ANIMADA DA TELA DE LOGIN (papel → scanner → digital)
   ========================================================= */
const esteira = (() => {
  const tela = $('tela-login'), topoEl = tela.querySelector('.topo-login'), belt = tela.querySelector('.belt');
  const cv = belt.querySelector('canvas'), fx = cv.getContext('2d'), scan = belt.querySelector('.scan');
  const cardsEl = belt.querySelector('.cards'), codesEl = belt.querySelector('.codes');
  const nEl = belt.querySelector('.pill .n'), kEl = belt.querySelector('.pill .k');

  // Cores das faíscas: amarelos claros no tema escuro, dourados no tema claro
  const PAL_ESCURO = ['#B89A00','#D6B814','#F1E15B','#F5E97F','#FAF2B8','#FFFBE6','#FFFFFF'];
  const PAL_CLARO  = ['#7a5c00','#9c7a00','#c29a00','#d9b300','#e8c53a','#f1d660','#f6e48c'];
  const temaClaro = () => document.documentElement.dataset.tema === 'claro';

  // Documentos de demonstração (f = folhas de papel por ano, estimativa ilustrativa)
  const DOCS = [
    {t:'Holerite mensal', n:'João da Silva', c:'Outubro/2026', lb:'Líquido a receber', l:'R$ 2.213,91', f:2880,
     r:[['Salário base','2.400,00'],['Horas extras 50%','163,64'],['INSS','-205,73'],['Vale-transporte','-144,00']],
     code:'{\n  "doc": "holerite",\n  "competencia": "2026-10",\n  "funcionario": "João da Silva",\n  "proventos": 2563.64,\n  "descontos": 349.73,\n  "liquido": 2213.91,\n  "entregue": "app · 2 min",\n  "assinado": "05/11 14:32 ✓"\n}'},
    {t:'Adiantamento', n:'Maria Souza', c:'Outubro/2026', lb:'Líquido a receber', l:'R$ 1.240,00', f:2880,
     r:[['Adiantamento 40%','1.240,00'],['Descontos','0,00']],
     code:'{\n  "doc": "adiantamento",\n  "competencia": "2026-10",\n  "funcionario": "Maria Souza",\n  "valor": 1240.00,\n  "entregue": "app · 1 min",\n  "assinado": "20/10 09:05 ✓"\n}'},
    {t:'Recibo de férias', n:'Carlos Lima', c:'Novembro/2026', lb:'Líquido a receber', l:'R$ 3.580,00', f:240,
     r:[['Férias 30 dias','3.000,00'],['1/3 constitucional','1.000,00'],['INSS','-420,00']],
     code:'{\n  "doc": "ferias",\n  "periodo": "02/11 → 01/12",\n  "funcionario": "Carlos Lima",\n  "bruto": 4000.00,\n  "liquido": 3580.00,\n  "aviso": "enviado 30 dias antes",\n  "assinado": "03/10 16:20 ✓"\n}'},
    {t:'13º · 1ª parcela', n:'Ana Ribeiro', c:'Novembro/2026', lb:'Líquido a receber', l:'R$ 1.550,00', f:240,
     r:[['13º salário 1ª parcela','1.550,00'],['Descontos','0,00']],
     code:'{\n  "doc": "13_salario",\n  "parcela": 1,\n  "funcionario": "Ana Ribeiro",\n  "valor": 1550.00,\n  "pago_em": "2026-11-30",\n  "assinado": "pendente"\n}'},
    {t:'Informe de rendimentos', n:'João da Silva', c:'Ano-base 2025', lb:'Total do ano', l:'R$ 31.200,00', f:240,
     r:[['Rendimentos tributáveis','31.200,00'],['Contribuição INSS','2.940,00'],['IRRF retido','0,00']],
     code:'{\n  "doc": "informe_rendimentos",\n  "ano_base": 2025,\n  "funcionario": "João da Silva",\n  "tributavel": 31200.00,\n  "inss": 2940.00,\n  "irrf": 0.00,\n  "formato": "PDF para a Receita"\n}'},
    {t:'Vale-transporte', n:'Maria Souza', c:'Outubro/2026', lb:'Valor recebido', l:'R$ 220,00', f:2880,
     r:[['Dias úteis','22'],['Passagens','44 × 5,00'],['Desconto em folha 6%','-144,00']],
     code:'{\n  "doc": "vale_transporte",\n  "competencia": "2026-10",\n  "funcionario": "Maria Souza",\n  "dias_uteis": 22,\n  "valor": 220.00,\n  "assinado": "01/10 08:47 ✓"\n}'}
  ];

  const N = DOCS.length, cards = [], codes = [];
  DOCS.forEach(d => {
    const c = document.createElement('div'); c.className = 'pp';
    c.innerHTML = '<div class="pi"><div class="ph"><b>IMPAKTO</b><span>' + d.t + '</span></div>' +
      '<div class="pm">' + d.n + ' · ' + d.c + '</div>' +
      d.r.map(([a, b]) => '<div class="pr"><span>' + a + '</span><span class="' + (b[0] === '-' ? 'neg' : '') + '">' +
        b.replace('-', '−') + '</span></div>').join('') +
      '<div class="pl"><span>' + d.lb + '</span><b>' + d.l + '</b></div>' +
      '<div class="ps">Assinatura do funcionário ______________</div></div>';
    cardsEl.appendChild(c); cards.push(c);
    const k = document.createElement('div'); k.className = 'cd';
    const pre = document.createElement('pre'), cm = document.createElement('span');
    cm.className = 'cm'; cm.textContent = '// papel → digital · 2 vias → 0\n';
    pre.appendChild(cm); pre.appendChild(document.createTextNode(d.code));
    k.appendChild(pre); codesEl.appendChild(k); codes.push(k);
  });

  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W, H, cw, ch, gap, Lx, dpr, BH, rad, off = null, vel = 0, hover = 0, hov = false, drag = false,
      lx = 0, lt = 0, shown = 0, curI = -1, sparks = [], last = 0, rodando = false;
  const mod = (a, n) => ((a % n) + n) % n;

  // "Sorteio" fixo: o mesmo ponto sempre dá o mesmo resultado (deixa os pixels estáveis)
  function hash(a, b, c){
    let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 2147483647)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function medir(){
    W = tela.clientWidth; H = tela.clientHeight;
    const alturaTopo = topoEl.offsetHeight + 10;
    let ideal = W < 768 ? W * .72 : Math.min(520, Math.max(300, W * .4));
    const cabeAltura = (H - alturaTopo - 116 - 16) / .64;
    cw = Math.round(Math.max(220, Math.min(ideal, cabeAltura)));
    ch = Math.round(cw * .64); gap = Math.round(Math.max(24, W * .05)); Lx = W / 2; rad = cw * .032;
    belt.style.setProperty('--cw', cw + 'px'); belt.style.setProperty('--ch', ch + 'px');
    BH = ch + 116;
    belt.style.top = (alturaTopo + Math.max(0, (H - alturaTopo - BH) / 2)) + 'px';
    belt.style.height = BH + 'px';
    scan.style.height = (ch + 34) + 'px';
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = BH * dpr; cv.style.width = W + 'px'; cv.style.height = BH + 'px';
    if (off === null) off = Lx - .62 * cw;
  }

  function desenharEfeito(x, i, t, cut, pal, brilho){
    const top = 58, larg = Math.min(150, x + cw - Lx);
    if (larg > 0){
      const g = fx.createLinearGradient(Lx, 0, Lx + 150, 0);
      g.addColorStop(0, 'rgba(' + brilho + ',.38)'); g.addColorStop(1, 'rgba(' + brilho + ',0)');
      fx.fillStyle = g; fx.fillRect(Lx, top, larg, ch);
    }
    const R = .3 * cw, cel = 3, linhas = Math.ceil(ch / cel), tw = reduzir ? 0 : Math.floor(t * 9);
    const g0 = Math.floor(cut / cel), g1 = Math.min(Math.ceil(cw / cel), Math.ceil((cut + R) / cel));
    for (let gx = g0; gx < g1; gx++){
      const sx = x + gx * cel, d = sx - Lx;
      if (d < 0 || d > R) continue;
      const p = Math.pow(1 - d / R, 1.7);
      for (let r = -5; r < linhas + 5; r++){
        const dentro = r >= 0 && r < linhas, dist = r < 0 ? -r : r - linhas + 1;
        const lim = dentro ? p * .92 : p * .16 * (1 - dist / 6);
        if (lim <= 0 || hash(gx, r, i) >= lim) continue;
        if (!reduzir && hash(gx, r, tw + 97) < .22) continue;
        const h2 = hash(r, gx, i + 31);
        fx.fillStyle = d < 10 ? pal[4 + Math.floor(h2 * 3)] : pal[Math.floor(h2 * h2 * 7)];
        const s = 1.1 + h2 * 1.7;
        const jx = reduzir ? 0 : (hash(gx, r, i + 7) - .5) * 1.6, jy = reduzir ? 0 : (hash(r, gx, i + 11) - .5) * 1.6;
        fx.fillRect(sx + jx, top + r * cel + jy, s, s);
      }
    }
  }

  function quadro(agora){
    if (!rodando) return;
    const dt = Math.min(.05, (agora - last) / 1000); last = agora;
    const claro = temaClaro();
    const pal = claro ? PAL_CLARO : PAL_ESCURO;
    const brilho = claro ? '217,164,0' : '241,225,91';

    hover += ((hov ? 1 : 0) - hover) * Math.min(1, dt * 4);
    if (!drag){
      const alvo = (reduzir ? 0 : -0.09 * W) * (1 - .65 * hover);
      vel += (alvo - vel) * (1 - Math.exp(-2.2 * dt));
      off += vel * dt;
    }
    const span = cw + gap, periodo = span * N;
    fx.setTransform(dpr, 0, 0, dpr, 0, 0); fx.clearRect(0, 0, W, BH);
    let cruzando = -1, prog = 0;

    for (let i = 0; i < N; i++){
      const x = mod(off + i * span + span, periodo) - span;
      const cut = Math.max(0, Math.min(cw, Lx - x));
      const c = cards[i], k = codes[i], tr = 'translate3d(' + x + 'px,0,0)';
      c.style.transform = tr; k.style.transform = tr;
      if (cut > 0){
        c.style.visibility = cut >= cw ? 'hidden' : 'visible';
        c.style.clipPath = 'inset(0 0 0 ' + cut + 'px round 0 ' + rad + 'px ' + rad + 'px 0)';
        c.style.webkitMaskImage = c.style.maskImage =
          'linear-gradient(90deg,transparent ' + cut + 'px,#000 ' + (cut + 26) + 'px)';
        k.style.visibility = 'visible'; k.style.clipPath = 'inset(0 ' + (cw - cut) + 'px 0 0)';
      } else {
        c.style.visibility = 'visible'; c.style.clipPath = '';
        c.style.webkitMaskImage = c.style.maskImage = ''; k.style.visibility = 'hidden';
      }
      if (cut > 0 && cut < cw){ cruzando = i; prog = cut / cw; }
      if (cut > 0 && x + cw > Lx) desenharEfeito(x, i, agora / 1000, cut, pal, brilho);
    }

    if (!reduzir && cruzando >= 0){
      for (let s = 0; s < 3; s++) if (Math.random() < .7) sparks.push({
        x: Lx + Math.random() * 30, y: 48 + Math.random() * (ch + 20),
        vx: -30 + Math.random() * 70 + vel * .6, vy: (Math.random() - .5) * 50,
        s: .8 + Math.random() * 1.8, c: pal[Math.floor(Math.random() * 7)], l: .3 + Math.random() * .8
      });
    }
    sparks = sparks.filter(p => (p.l -= dt) > 0);
    for (const p of sparks){
      p.x += p.vx * dt; p.y += p.vy * dt;
      fx.globalAlpha = Math.min(1, p.l * 2.2); fx.fillStyle = p.c; fx.fillRect(p.x, p.y, p.s, p.s);
    }
    fx.globalAlpha = 1;

    if (cruzando >= 0){
      const f = DOCS[cruzando].f;
      if (cruzando !== curI){
        curI = cruzando; shown = f * prog;
        kEl.textContent = '≈ ' + (f * .0047).toLocaleString('pt-BR', {minimumFractionDigits:1, maximumFractionDigits:1}) + ' kg';
      }
      shown += (f * prog - shown) * Math.min(1, dt * 14);
      nEl.textContent = '−' + Math.round(shown).toLocaleString('pt-BR') + ' folhas';
    }
    requestAnimationFrame(quadro);
  }

  // Mouse em cima desacelera; arrastar move a esteira com inércia
  belt.addEventListener('pointerenter', () => hov = true);
  belt.addEventListener('pointerleave', () => hov = false);
  belt.addEventListener('pointerdown', e => {
    drag = true; belt.setPointerCapture(e.pointerId); lx = e.clientX; lt = performance.now(); belt.style.cursor = 'grabbing';
  });
  belt.addEventListener('pointermove', e => {
    if (!drag) return;
    const n = performance.now(), dx = e.clientX - lx;
    off += dx; vel = dx / Math.max(8, n - lt) * 1000 * .8 + vel * .2; lx = e.clientX; lt = n;
  });
  const soltar = () => { drag = false; belt.style.cursor = 'grab'; };
  belt.addEventListener('pointerup', soltar); belt.addEventListener('pointercancel', soltar);
  belt.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)){ vel += -e.deltaX * 6; e.preventDefault(); }
  }, {passive:false});
  window.addEventListener('resize', () => { if (rodando) medir(); });
  if (document.fonts) document.fonts.ready.then(() => { if (rodando) medir(); });

  return {
    iniciar(){ if (rodando) return; rodando = true; medir(); last = performance.now(); requestAnimationFrame(quadro); },
    parar(){ rodando = false; drag = false; }   // economiza bateria quando o login não está na tela
  };
})();
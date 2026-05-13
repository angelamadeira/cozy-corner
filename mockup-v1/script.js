// =====================================================
// Mockup script — switcher de telas + scroll da intro
// =====================================================

const screens = document.querySelectorAll('.screen');
const buttons = document.querySelectorAll('.mockup-nav button[data-screen]');
const frameLabel = document.getElementById('frame-label');

const titles = {
  intro: 'Intro (cover escura)',
  hero: 'Hero (logo revelado)',
  cozinha: 'Cozinha (hub, 8 hotspots)',
  categoria: 'Categoria (drawer)',
  receita: 'Receita individual',
  'modo-cozinha': 'Modo Cozinha',
  recado: 'Recado (modal)',
  busca: 'Busca global',
  empty: 'Empty / 404'
};

function showScreen(name) {
  screens.forEach(s => s.classList.remove('active'));
  const target = document.getElementById(name);
  if (target) target.classList.add('active');
  buttons.forEach(b => b.classList.toggle('active', b.dataset.screen === name));
  if (frameLabel) frameLabel.textContent = titles[name] || name;
  window.scrollTo(0, 0);

  // Re-init intro scroll behavior se entrou na intro
  if (name === 'intro') initIntroScroll();
}

buttons.forEach(b => {
  b.addEventListener('click', () => showScreen(b.dataset.screen));
});

// Hotspots da cozinha:
// - post-it abre o modal de recado
// - interruptor (lâmpada) liga/desliga dark mode
// - resto abre a tela de categoria
document.querySelectorAll('#cozinha .hotspot').forEach(h => {
  h.addEventListener('click', () => {
    const action = h.dataset.action;
    if (action === 'recado') showScreen('recado');
    else if (action === 'dark-mode') document.body.classList.toggle('dark-mode');
    else showScreen('categoria');
  });
});

// Cards de receita → tela individual
document.querySelectorAll('#categoria .recipe-card').forEach(c => {
  c.addEventListener('click', () => showScreen('receita'));
});

// Botão "modo cozinha" → tela modo cozinha
const btnCook = document.querySelector('#receita .btn-cook');
if (btnCook) btnCook.addEventListener('click', () => showScreen('modo-cozinha'));

// =====================================================
// Intro scroll behavior
// 3 frases sticky, controladas por scroll dentro da intro
// =====================================================
function initIntroScroll() {
  const intro = document.getElementById('intro');
  if (!intro) return;
  const phrases = intro.querySelectorAll('.phrase');
  const scrollContainer = intro.querySelector('.intro-scroll');
  if (!phrases.length || !scrollContainer) return;

  function updatePhrases() {
    const rect = scrollContainer.getBoundingClientRect();
    const total = scrollContainer.offsetHeight - window.innerHeight;
    const scrolled = Math.max(0, Math.min(-rect.top, total));
    const progress = total > 0 ? scrolled / total : 0;

    // Divide o scroll em 2 segmentos pras 2 frases
    let activeIdx = 0;
    if (progress > 0.5) activeIdx = 1;

    phrases.forEach((p, i) => {
      p.classList.toggle('visible', i === activeIdx);
    });
  }

  // remove listeners antigos antes de re-adicionar
  window.removeEventListener('scroll', updatePhrases);
  window.addEventListener('scroll', updatePhrases, { passive: true });
  // mostra a primeira frase de cara
  phrases[0].classList.add('visible');
  updatePhrases();
}

// Inicia
initIntroScroll();

// js/home.js — Logique de la page d'accueil

// ── Icônes par catégorie de prestation ───────────────────
const SERVICE_ICONS = {
  default: '✂️',
  coupe:   '✂️',
  color:   '🎨',
  balay:   '✨',
  brush:   '💨',
  soin:    '🌿',
  barbe:   '🪒',
};

function getIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('color') || n.includes('teinture')) return SERVICE_ICONS.color;
  if (n.includes('balay'))  return SERVICE_ICONS.balay;
  if (n.includes('brush'))  return SERVICE_ICONS.brush;
  if (n.includes('soin'))   return SERVICE_ICONS.soin;
  if (n.includes('barbe'))  return SERVICE_ICONS.barbe;
  return SERVICE_ICONS.coupe;
}

// ── Chargement des services depuis l'API ─────────────────
async function loadServices() {
  const grid = document.getElementById('servicesGrid');
  if (!grid) return;

  try {
    const services = await apiRequest('/services');
    const displayed = services.slice(0, 6); // max 6 sur l'accueil

    grid.innerHTML = displayed.map(s => `
      <article class="service-card" data-id="${s.id}" role="button" tabindex="0"
               aria-label="${s.name} — ${s.price}€">
        <div class="service-card__icon" aria-hidden="true">${getIcon(s.name)}</div>
        <h3 class="service-card__name">${s.name}</h3>
        <p class="service-card__duration">⏱ ${s.duration_minutes} min</p>
        <p class="service-card__price">${parseFloat(s.price).toFixed(2)} €</p>
      </article>
    `).join('');

    // Clic sur une carte → aller réserver
    grid.querySelectorAll('.service-card').forEach(card => {
      const go = () => {
        const id = card.dataset.id;
        window.location.href = `pages/reserver.html?serviceId=${id}`;
      };
      card.addEventListener('click', go);
      card.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    });

  } catch (err) {
    grid.innerHTML = `<p class="service-card__error">
      Impossible de charger les prestations. Vérifiez que le serveur est démarré.
    </p>`;
    console.error(err);
  }
}

// ── Compteur animé ────────────────────────────────────────
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    const duration = 1200;
    const step = target / (duration / 16);
    let current = 0;

    const update = () => {
      current = Math.min(current + step, target);
      el.textContent = Math.floor(current) + (el.dataset.suffix || '');
      if (current < target) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  });
}

// ── Intersection observer pour déclencher les animations ─
function initAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        if (e.target.classList.contains('stats')) animateCounters();
        observer.unobserve(e.target);
      }
    });
  }, { threshold: .2 });

  document.querySelectorAll('.stats, .step, .service-card').forEach(el =>
    observer.observe(el)
  );
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadServices();
  initAnimations();
});
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

    grid.replaceChildren(...displayed.map(renderServiceCard));

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

// Construit une carte prestation en évitant toute injection HTML (nom venant de l'API)
function renderServiceCard(s) {
  const article = document.createElement('article');
  article.className = 'service-card';
  article.dataset.id = s.id;
  article.setAttribute('role', 'button');
  article.setAttribute('tabindex', '0');
  article.setAttribute('aria-label', `${s.name} — ${s.price}€`);

  const icon = document.createElement('div');
  icon.className = 'service-card__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = getIcon(s.name);

  const name = document.createElement('h3');
  name.className = 'service-card__name';
  name.textContent = s.name;

  const duration = document.createElement('p');
  duration.className = 'service-card__duration';
  duration.textContent = `⏱ ${s.duration_minutes} min`;

  const price = document.createElement('p');
  price.className = 'service-card__price';
  price.textContent = `${parseFloat(s.price).toFixed(2)} €`;

  article.append(icon, name, duration, price);
  return article;
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
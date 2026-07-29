// js/reviews.js — Section avis clients (page d'accueil, publique)

// ── Chargement des avis publics depuis l'API ──────────────
async function loadPublicReviews() {
  const grid = document.getElementById('reviewsGrid');
  if (!grid) return;

  try {
    const reviews = await apiRequest('/reviews');

    if (!reviews.length) {
      const p = document.createElement('p');
      p.className = 'reviews__empty';
      p.textContent = 'Aucun avis pour le moment.';
      grid.replaceChildren(p);
      return;
    }

    grid.replaceChildren(...reviews.map(renderReviewCard));
  } catch (err) {
    const p = document.createElement('p');
    p.className = 'reviews__error';
    p.textContent = 'Impossible de charger les avis pour le moment.';
    grid.replaceChildren(p);
    console.error(err);
  } finally {
    grid.setAttribute('aria-busy', 'false');
  }
}

// Construit une carte avis en évitant toute injection HTML (prénom et
// commentaire venant de l'API) : createElement + textContent uniquement,
// jamais innerHTML avec des données de l'API.
function renderReviewCard(review) {
  const article = document.createElement('article');
  article.className = 'review-card';
  article.setAttribute('role', 'listitem');

  const stars = document.createElement('p');
  stars.className = 'review-card__stars';
  stars.setAttribute('aria-label', `Note : ${review.rating} sur 5`);
  stars.textContent = '★'.repeat(review.rating);

  const comment = document.createElement('p');
  comment.className = 'review-card__comment';
  comment.textContent = review.comment;

  const footer = document.createElement('p');
  footer.className = 'review-card__author';
  const date = new Date(review.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  footer.textContent = `${review.first_name} — ${date}`;

  article.append(stars, comment, footer);
  return article;
}

// ── Badge note moyenne (hero) ─────────────────────────────
async function loadReviewStats() {
  const badge = document.getElementById('heroBadge');
  if (!badge) return;

  try {
    const stats = await apiRequest('/reviews/stats');

    if (stats.count === 0) {
      badge.classList.add('hidden');
      return;
    }

    const average = stats.average.toLocaleString('fr-FR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    document.getElementById('heroRatingValue').textContent = average;
    document.getElementById('heroRatingCount').textContent =
      `${stats.count} avis`;
    badge.classList.remove('hidden');
  } catch (err) {
    // Pas de fausse donnée affichée en cas d'erreur réseau
    badge.classList.add('hidden');
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadPublicReviews();
  loadReviewStats();
});

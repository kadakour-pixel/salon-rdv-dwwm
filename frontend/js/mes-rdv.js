// js/mes-rdv.js — Espace client, liste des rendez-vous

const MONTHS = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];

let allRdv = [];
let currentFilter = 'all';
let rdvToCancel   = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLogged()) { window.location.href = 'login.html'; return; }
  await loadRdv();
});

// ── Chargement ────────────────────────────────────────────
async function loadRdv() {
  const list = document.getElementById('rdvList');
  list.setAttribute('aria-busy', 'true');
  list.innerHTML = '<div class="loader"><div class="spinner"></div> Chargement de vos rendez-vous…</div>';
  try {
    allRdv = await apiRequest('/appointments/me');
    renderList();
  } catch (err) {
    list.innerHTML = `<p style="color:var(--error);padding:2rem 0;">${err.message}</p>`;
  } finally {
    list.setAttribute('aria-busy', 'false');
  }
}

// ── Rendu de la liste ─────────────────────────────────────
function renderList() {
  const list = document.getElementById('rdvList');

  let filtered = allRdv;
  if (currentFilter === 'confirmed') filtered = allRdv.filter(r => r.status !== 'cancelled' && new Date(r.start_at) >= new Date());
  if (currentFilter === 'cancelled') filtered = allRdv.filter(r => r.status === 'cancelled');

  if (!filtered.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📅</div>
        <h3>Aucun rendez-vous</h3>
        <p>${currentFilter === 'cancelled' ? 'Vous n\'avez aucun rendez-vous annulé.' : 'Vous n\'avez pas encore de rendez-vous.'}</p>
        <a href="reserver.html" class="btn btn-accent">Prendre un RDV</a>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(rdv => {
    const start  = new Date(rdv.start_at);
    const day    = start.getDate();
    const month  = MONTHS[start.getMonth()];
    const time   = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    // Annulation possible si le RDV est aujourd'hui ou dans le futur (pas encore passé de plus d'un jour)
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const isFuture = start >= today && rdv.status !== 'cancelled';
    const statusLabel = rdv.status === 'cancelled' ? 'Annulé' : rdv.status === 'confirmed' ? 'Confirmé' : 'En attente';

    return `
      <div class="rdv-card ${rdv.status === 'cancelled' ? 'rdv-card--cancelled' : ''}" role="listitem">
        <div class="rdv-card__date" aria-hidden="true">
          <div class="rdv-card__date-day">${day}</div>
          <div class="rdv-card__date-month">${month}</div>
        </div>
        <div class="rdv-card__info">
          <p class="rdv-card__service">${rdv.service_name}</p>
          <p class="rdv-card__meta">${time} · ${rdv.price} €</p>
        </div>
        <div class="rdv-card__actions">
          <span class="badge badge--${rdv.status}">${statusLabel}</span>
          ${isFuture ? `<button class="btn-cancel" data-id="${rdv.id}" data-name="${rdv.service_name}" data-time="${time}" aria-label="Annuler ce rendez-vous">Annuler</button>` : ''}
        </div>
      </div>`;
  }).join('');

  // Boutons annulation
  list.querySelectorAll('.btn-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      rdvToCancel = btn.dataset.id;
      const day = btn.closest('.rdv-card').querySelector('.rdv-card__date-day').textContent;
      document.getElementById('modalBody').textContent =
        `${btn.dataset.name} le ${day} à ${btn.dataset.time}. Cette action est irréversible.`;
      document.getElementById('cancelModal').classList.remove('hidden');
    });
  });
}

// ── Filtres ───────────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderList();
  });
});

// ── Modal annulation ──────────────────────────────────────
document.getElementById('modalCancel').addEventListener('click', () => {
  document.getElementById('cancelModal').classList.add('hidden');
  rdvToCancel = null;
});

document.getElementById('cancelModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) {
    document.getElementById('cancelModal').classList.add('hidden');
  }
});

document.getElementById('modalConfirm').addEventListener('click', async () => {
  const btn = document.getElementById('modalConfirm');
  btn.disabled = true;
  btn.textContent = 'Annulation…';
  try {
    await apiRequest(`/appointments/${rdvToCancel}`, { method: 'DELETE' });
    document.getElementById('cancelModal').classList.add('hidden');
    showToast('Rendez-vous annulé avec succès.');
    await loadRdv();
  } catch (err) {
    showToast(err.message || 'Erreur lors de l\'annulation.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Oui, annuler';
    rdvToCancel = null;
  }
});
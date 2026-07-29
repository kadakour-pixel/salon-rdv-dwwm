// js/mes-rdv.js — Espace client, liste des rendez-vous

const MONTHS = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];

let allRdv = [];
let currentFilter = 'all';
let rdvToCancel   = null;

let reviewableAppointments = [];
let appointmentToReview    = null;
let selectedRating         = 0;

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLogged()) { window.location.href = 'login.html'; return; }
  await loadRdv();
  await loadReviewable();
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
    const p = document.createElement('p');
    p.style.cssText = 'color:var(--error);padding:2rem 0;';
    p.textContent = err.message;
    list.replaceChildren(p);
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

  list.replaceChildren(...filtered.map(renderRdvCard));

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

// Construit une carte RDV en évitant toute injection HTML (service_name venant de l'API)
function renderRdvCard(rdv) {
  const start  = new Date(rdv.start_at);
  const day    = start.getDate();
  const month  = MONTHS[start.getMonth()];
  const time   = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  // Annulation possible si le RDV est aujourd'hui ou dans le futur (pas encore passé de plus d'un jour)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isFuture = start >= today && rdv.status !== 'cancelled';
  const statusLabel = rdv.status === 'cancelled' ? 'Annulé' : rdv.status === 'confirmed' ? 'Confirmé' : 'En attente';

  const card = document.createElement('div');
  card.className = `rdv-card ${rdv.status === 'cancelled' ? 'rdv-card--cancelled' : ''}`;
  card.setAttribute('role', 'listitem');

  const dateDiv = document.createElement('div');
  dateDiv.className = 'rdv-card__date';
  dateDiv.setAttribute('aria-hidden', 'true');
  const dayDiv = document.createElement('div');
  dayDiv.className = 'rdv-card__date-day';
  dayDiv.textContent = day;
  const monthDiv = document.createElement('div');
  monthDiv.className = 'rdv-card__date-month';
  monthDiv.textContent = month;
  dateDiv.append(dayDiv, monthDiv);

  const infoDiv = document.createElement('div');
  infoDiv.className = 'rdv-card__info';
  const serviceP = document.createElement('p');
  serviceP.className = 'rdv-card__service';
  serviceP.textContent = rdv.service_name;
  const metaP = document.createElement('p');
  metaP.className = 'rdv-card__meta';
  // stylist_name peut être absent (LEFT JOIN côté API si le coiffeur a été désactivé)
  const stylistPart = rdv.stylist_name ? ` · avec ${rdv.stylist_name}` : '';
  metaP.textContent = `${time}${stylistPart} · ${rdv.price} €`;
  infoDiv.append(serviceP, metaP);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'rdv-card__actions';
  const badge = document.createElement('span');
  badge.className = `badge badge--${rdv.status}`;
  badge.textContent = statusLabel;
  actionsDiv.appendChild(badge);

  if (isFuture) {
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-cancel';
    cancelBtn.dataset.id = rdv.id;
    cancelBtn.dataset.name = rdv.service_name;
    cancelBtn.dataset.time = time;
    cancelBtn.setAttribute('aria-label', 'Annuler ce rendez-vous');
    cancelBtn.textContent = 'Annuler';
    actionsDiv.appendChild(cancelBtn);
  }

  card.append(dateDiv, infoDiv, actionsDiv);
  return card;
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

// ── Avis à laisser ────────────────────────────────────────
async function loadReviewable() {
  try {
    reviewableAppointments = await apiRequest('/reviews/reviewable');
    renderReviewable();
  } catch (err) {
    // Ne bloque pas l'affichage des RDV si cet appel échoue
    console.error(err);
  }
}

function renderReviewable() {
  const section = document.getElementById('reviewableSection');
  const list    = document.getElementById('reviewableList');

  if (!reviewableAppointments.length) {
    section.classList.add('hidden');
    list.replaceChildren();
    return;
  }

  section.classList.remove('hidden');
  list.replaceChildren(...reviewableAppointments.map(renderReviewableItem));
}

// Construit une ligne "avis à laisser" en évitant toute injection HTML (service_name venant de l'API)
function renderReviewableItem(appt) {
  const start   = new Date(appt.start_at);
  const dateStr = start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const item = document.createElement('div');
  item.className = 'reviewable-item';

  const info = document.createElement('p');
  info.className = 'reviewable-item__info';
  info.textContent = `${appt.service_name} — ${dateStr}`;

  const btn = document.createElement('button');
  btn.className = 'btn btn-outline';
  btn.textContent = 'Laisser un avis';
  btn.addEventListener('click', () => openReviewModal(appt.id));

  item.append(info, btn);
  return item;
}

function openReviewModal(appointmentId) {
  appointmentToReview = appointmentId;
  selectedRating = 0;
  document.getElementById('reviewComment').value = '';
  updateStarDisplay();
  document.getElementById('reviewModal').classList.remove('hidden');
}

function updateStarDisplay() {
  document.querySelectorAll('#starPicker .star-btn').forEach(btn => {
    const active = Number(btn.dataset.value) <= selectedRating;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-checked', active ? 'true' : 'false');
  });
}

document.querySelectorAll('#starPicker .star-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedRating = Number(btn.dataset.value);
    updateStarDisplay();
  });
});

function closeReviewModal() {
  document.getElementById('reviewModal').classList.add('hidden');
  appointmentToReview = null;
}

document.getElementById('reviewModalCancel').addEventListener('click', closeReviewModal);

document.getElementById('reviewModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeReviewModal();
});

document.getElementById('reviewModalConfirm').addEventListener('click', async () => {
  const comment = document.getElementById('reviewComment').value.trim();

  // Validation front pour l'UX — le backend reste la vraie barrière
  if (!selectedRating) {
    showToast('Choisissez une note avant d\'envoyer.', 'error');
    return;
  }
  if (!comment) {
    showToast('Le commentaire ne peut pas être vide.', 'error');
    return;
  }

  const btn = document.getElementById('reviewModalConfirm');
  btn.disabled = true;
  btn.textContent = 'Envoi…';
  try {
    await apiRequest('/reviews', {
      method: 'POST',
      body: JSON.stringify({
        appointment_id: appointmentToReview,
        rating: Number(selectedRating),
        comment,
      }),
    });
    document.getElementById('reviewModal').classList.add('hidden');
    showToast('Merci pour votre avis !');
    reviewableAppointments = reviewableAppointments.filter(a => a.id !== appointmentToReview);
    renderReviewable();
  } catch (err) {
    showToast(err.message || 'Erreur lors de l\'envoi de l\'avis.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Envoyer';
    appointmentToReview = null;
  }
});
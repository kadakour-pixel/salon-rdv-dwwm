// js/reserver.js — Réservation en 3 étapes

// ── Vérifier connexion ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.isLogged()) window.location.href = 'login.html';
});

// ── État global ───────────────────────────────────────────
const state = { service: null, date: null, slot: null };
let calYear, calMonth;
const now = new Date();
calYear  = now.getFullYear();
calMonth = now.getMonth();

// ── Navigation stepper ────────────────────────────────────
function goStep(n) {
  document.querySelectorAll('.booking-panel').forEach((p, i) =>
    p.classList.toggle('active', i === n - 1)
  );
  document.querySelectorAll('.stepper__step').forEach((s, i) => {
    s.classList.remove('active', 'done');
    if (i + 1 === n) s.classList.add('active');
    if (i + 1 < n)  s.classList.add('done');
  });
  if (n === 2) renderCalendar();
}

// ── Étape 1 — Prestations ─────────────────────────────────
function getIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('color') || n.includes('teinture')) return '🎨';
  if (n.includes('balay')) return '✨';
  if (n.includes('brush')) return '💨';
  if (n.includes('soin'))  return '🌿';
  if (n.includes('barbe')) return '🪒';
  return '✂️';
}

async function loadServices() {
  const grid = document.getElementById('servicePickGrid');
  try {
    const services = await apiRequest('/services');
    grid.innerHTML = services.map(s => `
      <div class="service-pick-card" data-id="${s.id}" data-name="${s.name}"
           data-duration="${s.duration_minutes}" data-price="${s.price}"
           role="radio" aria-checked="false" tabindex="0">
        <div class="service-pick-card__icon">${getIcon(s.name)}</div>
        <p class="service-pick-card__name">${s.name}</p>
        <p class="service-pick-card__meta">⏱ ${s.duration_minutes} min</p>
        <p class="service-pick-card__price">${parseFloat(s.price).toFixed(2)} €</p>
      </div>
    `).join('');

    grid.querySelectorAll('.service-pick-card').forEach(card => {
      const select = () => {
        grid.querySelectorAll('.service-pick-card').forEach(c => {
          c.classList.remove('selected');
          c.setAttribute('aria-checked', 'false');
        });
        card.classList.add('selected');
        card.setAttribute('aria-checked', 'true');
        state.service = {
          id:       card.dataset.id,
          name:     card.dataset.name,
          duration: card.dataset.duration,
          price:    card.dataset.price,
        };
        document.getElementById('btnStep1Next').disabled = false;
      };
      card.addEventListener('click', select);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') select(); });
    });

    // Pré-sélectionner si serviceId dans l'URL
    const preId = new URLSearchParams(window.location.search).get('serviceId');
    if (preId) {
      const target = grid.querySelector(`[data-id="${preId}"]`);
      if (target) target.click();
    }
  } catch (err) {
    grid.innerHTML = `<p style="color:var(--error)">Erreur de chargement. Vérifiez que le serveur est démarré.</p>`;
  }
}

document.addEventListener('DOMContentLoaded', loadServices);
document.getElementById('btnStep1Next').addEventListener('click', () => goStep(2));

// ── Étape 2 — Calendrier ──────────────────────────────────
const DAY_NAMES   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function renderCalendar() {
  document.getElementById('calTitle').textContent = `${MONTH_NAMES[calMonth]} ${calYear}`;
  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';

  // En-têtes jours
  DAY_NAMES.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-day-name';
    el.textContent = d;
    el.setAttribute('role', 'columnheader');
    grid.appendChild(el);
  });

  // Offset : JS retourne 0=dimanche, on convertit en 0=lundi pour un calendrier français
  const firstDay = new Date(calYear, calMonth, 1);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  // Date locale (pas UTC) pour éviter un décalage entre minuit et 2h du matin
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  for (let i = 0; i < startDow; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    el.setAttribute('role', 'gridcell');
    grid.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const el = document.createElement('div');
    el.className = 'cal-day';
    el.textContent = d;
    el.setAttribute('role', 'gridcell');

    if (dateStr < todayStr) {
      el.classList.add('disabled');
      el.setAttribute('aria-disabled', 'true');
    } else {
      el.setAttribute('tabindex', '0');
      if (dateStr === todayStr)  el.classList.add('today');
      if (dateStr === state.date) el.classList.add('selected');
      el.addEventListener('click', () => selectDate(dateStr, el));
      el.addEventListener('keydown', e => { if (e.key === 'Enter') selectDate(dateStr, el); });
    }
    grid.appendChild(el);
  }
}

async function selectDate(dateStr, el) {
  document.querySelectorAll('.cal-day').forEach(d => d.classList.remove('selected'));
  el.classList.add('selected');
  state.date = dateStr;
  state.slot = null;
  document.getElementById('btnStep2Next').disabled = true;

  const label     = document.getElementById('slotsDateLabel');
  const slotsGrid = document.getElementById('slotsGrid');

  // T12:00:00 évite un décalage UTC qui afficherait le mauvais jour
  label.textContent = new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  slotsGrid.innerHTML = '<div class="loader"><div class="spinner"></div> Chargement…</div>';

  try {
    const { slots } = await apiRequest(`/appointments/slots?date=${dateStr}&serviceId=${state.service.id}`);
    if (!slots.length) {
      slotsGrid.innerHTML = '<p style="color:var(--text-muted);font-size:.88rem;margin-top:.5rem;">Aucun créneau disponible ce jour.</p>';
      return;
    }
    slotsGrid.innerHTML = slots.map(s => {
      const time = s.start.slice(11, 16);
      return `<button class="slot-btn" data-slot='${JSON.stringify(s)}' role="listitem">${time}</button>`;
    }).join('');

    slotsGrid.querySelectorAll('.slot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        slotsGrid.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.slot = JSON.parse(btn.dataset.slot);
        document.getElementById('btnStep2Next').disabled = false;
      });
    });
  } catch (err) {
    slotsGrid.innerHTML = `<p style="color:var(--error);font-size:.88rem;">${err.message}</p>`;
  }
}

document.getElementById('calPrev').addEventListener('click', () => {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
});
document.getElementById('calNext').addEventListener('click', () => {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
});

document.getElementById('btnStep2Back').addEventListener('click', () => goStep(1));
document.getElementById('btnStep2Next').addEventListener('click', () => { buildRecap(); goStep(3); });

// ── Étape 3 — Récapitulatif ───────────────────────────────
function buildRecap() {
  const startDate = new Date(state.slot.start);
  const dateLabel = startDate.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeLabel = startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  document.getElementById('recapContent').innerHTML = `
    <div class="recap-row"><span>Prestation</span><span>${state.service.name}</span></div>
    <div class="recap-row"><span>Durée</span><span>${state.service.duration} min</span></div>
    <div class="recap-row"><span>Date</span><span>${dateLabel}</span></div>
    <div class="recap-row"><span>Heure</span><span>${timeLabel}</span></div>
    <div class="recap-row"><span>Tarif</span><span>${parseFloat(state.service.price).toFixed(2)} €</span></div>
  `;
}

document.getElementById('btnStep3Back').addEventListener('click', () => goStep(2));

document.getElementById('btnConfirm').addEventListener('click', async () => {
  const btn   = document.getElementById('btnConfirm');
  const alert = document.getElementById('confirmAlert');
  btn.disabled = true;
  btn.textContent = 'Confirmation…';

  try {
    await apiRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify({ service_id: state.service.id, start_at: state.slot.start }),
    });
    alert.style.display = 'block';
    alert.className = 'form-alert visible form-alert--success';
    alert.textContent = '✓ Rendez-vous confirmé ! Redirection vers vos RDV…';
    setTimeout(() => { window.location.href = 'mes-rdv.html'; }, 1500);
  } catch (err) {
    alert.style.display = 'block';
    alert.className = 'form-alert visible form-alert--error';
    alert.textContent = err.message || 'Erreur lors de la confirmation.';
    btn.disabled = false;
    btn.textContent = 'Confirmer le rendez-vous';
  }
});
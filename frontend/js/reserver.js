// js/reserver.js — Réservation en 3 étapes

// ── Vérifier connexion ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.isLogged()) window.location.href = 'login.html';
});

// ── État global ───────────────────────────────────────────
const state = { salon: null, stylist: null, service: null, date: null, slot: null };
let calYear, calMonth;
const now = new Date();
calYear  = now.getFullYear();
calMonth = now.getMonth();

// Cascade de réinitialisation : vide l'état en aval de l'étape modifiée.
// stylist ne vide pas service (le service appartient au salon, pas au coiffeur).
function resetFrom(stepName) {
  if (stepName === 'salon') {
    state.stylist = null;
    state.service = null;
    state.date = null;
    state.slot = null;
  } else if (stepName === 'stylist') {
    state.date = null;
    state.slot = null;
  } else if (stepName === 'date') {
    state.slot = null;
  }
}

// ── Navigation stepper ────────────────────────────────────
// Étapes nommées : salon/stylist masquées ce lot (contenu au Lot 2), le
// parcours visible reste service → datetime → confirm, numéroté 1/2/3.
const STEPS = [
  { name: 'salon',    label: 'Salon',        visible: false },
  { name: 'stylist',  label: 'Coiffeur',     visible: false },
  { name: 'service',  label: 'Prestation',   visible: true  },
  { name: 'datetime', label: 'Créneau',      visible: true  },
  { name: 'confirm',  label: 'Confirmation', visible: true  },
];

function visibleSteps() {
  return STEPS.filter(s => s.visible);
}

function goStep(stepName) {
  document.querySelectorAll('.booking-panel').forEach(p =>
    p.classList.toggle('active', p.dataset.step === stepName)
  );

  const vSteps = visibleSteps();
  const currentIndex = vSteps.findIndex(s => s.name === stepName);

  document.querySelectorAll('.stepper__step').forEach(el => {
    const idx = vSteps.findIndex(s => s.name === el.dataset.step);
    el.classList.remove('active', 'done');
    if (idx === -1) return;
    el.querySelector('.stepper__num').textContent = idx + 1;
    if (idx === currentIndex) el.classList.add('active');
    if (idx < currentIndex)  el.classList.add('done');
  });

  if (stepName === 'datetime') renderCalendar();
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
    grid.replaceChildren(...services.map(renderServicePickCard));

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

// Construit une carte de sélection de prestation en évitant toute injection HTML (nom venant de l'API)
function renderServicePickCard(s) {
  const card = document.createElement('div');
  card.className = 'service-pick-card';
  card.dataset.id = s.id;
  card.dataset.name = s.name;
  card.dataset.duration = s.duration_minutes;
  card.dataset.price = s.price;
  card.setAttribute('role', 'radio');
  card.setAttribute('aria-checked', 'false');
  card.setAttribute('tabindex', '0');

  const icon = document.createElement('div');
  icon.className = 'service-pick-card__icon';
  icon.textContent = getIcon(s.name);

  const name = document.createElement('p');
  name.className = 'service-pick-card__name';
  name.textContent = s.name;

  const meta = document.createElement('p');
  meta.className = 'service-pick-card__meta';
  meta.textContent = `⏱ ${s.duration_minutes} min`;

  const price = document.createElement('p');
  price.className = 'service-pick-card__price';
  price.textContent = `${parseFloat(s.price).toFixed(2)} €`;

  card.append(icon, name, meta, price);
  return card;
}

document.addEventListener('DOMContentLoaded', loadServices);
document.getElementById('btnStep1Next').addEventListener('click', () => goStep('datetime'));

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
  resetFrom('date');
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
    slotsGrid.replaceChildren(...slots.map(s => {
      const btn = document.createElement('button');
      btn.className = 'slot-btn';
      btn.dataset.slot = JSON.stringify(s);
      btn.setAttribute('role', 'listitem');
      btn.textContent = s.start.slice(11, 16);
      return btn;
    }));

    slotsGrid.querySelectorAll('.slot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        slotsGrid.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.slot = JSON.parse(btn.dataset.slot);
        document.getElementById('btnStep2Next').disabled = false;
      });
    });
  } catch (err) {
    const p = document.createElement('p');
    p.style.cssText = 'color:var(--error);font-size:.88rem;';
    p.textContent = err.message;
    slotsGrid.replaceChildren(p);
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

document.getElementById('btnStep2Back').addEventListener('click', () => goStep('service'));
document.getElementById('btnStep2Next').addEventListener('click', () => { buildRecap(); goStep('confirm'); });

// ── Étape 3 — Récapitulatif ───────────────────────────────
function buildRecap() {
  const startDate = new Date(state.slot.start);
  const dateLabel = startDate.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeLabel = startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  document.getElementById('recapContent').replaceChildren(
    renderRecapRow('Prestation', state.service.name),
    renderRecapRow('Durée', `${state.service.duration} min`),
    renderRecapRow('Date', dateLabel),
    renderRecapRow('Heure', timeLabel),
    renderRecapRow('Tarif', `${parseFloat(state.service.price).toFixed(2)} €`),
  );
}

// Construit une ligne du récapitulatif en évitant toute injection HTML (nom de prestation venant de l'API)
function renderRecapRow(label, value) {
  const row = document.createElement('div');
  row.className = 'recap-row';
  const labelSpan = document.createElement('span');
  labelSpan.textContent = label;
  const valueSpan = document.createElement('span');
  valueSpan.textContent = value;
  row.append(labelSpan, valueSpan);
  return row;
}

document.getElementById('btnStep3Back').addEventListener('click', () => goStep('datetime'));

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
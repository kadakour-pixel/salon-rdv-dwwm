// js/reserver.js — Réservation en plusieurs étapes (salon/coiffeur conditionnels)

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
// Étapes nommées : salon/stylist masquées si un seul choix actif (auto-sélection
// silencieuse), visibles sinon. service/datetime/confirm toujours visibles.
const STEPS = [
  { name: 'salon',    label: 'Salon',        visible: false },
  { name: 'stylist',  label: 'Coiffeur',     visible: false },
  { name: 'service',  label: 'Prestation',   visible: true  },
  { name: 'datetime', label: 'Créneau',      visible: true  },
  { name: 'confirm',  label: 'Confirmation', visible: true  },
];

// Boutons "Retour" conditionnels : masqués quand l'étape n'a pas de précédente visible.
const BACK_BUTTONS = {
  stylist:  'btnStylistBack',
  service:  'btnStep1Back',
  datetime: 'btnStep2Back',
  confirm:  'btnStep3Back',
};

function visibleSteps() {
  return STEPS.filter(s => s.visible);
}

function setStepVisible(name, visible) {
  const step = STEPS.find(s => s.name === name);
  if (step) step.visible = visible;
}

function prevStep(name) {
  const vSteps = visibleSteps();
  const idx = vSteps.findIndex(s => s.name === name);
  return idx > 0 ? vSteps[idx - 1].name : null;
}

function nextStep(name) {
  const vSteps = visibleSteps();
  const idx = vSteps.findIndex(s => s.name === name);
  return (idx !== -1 && idx < vSteps.length - 1) ? vSteps[idx + 1].name : null;
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
    if (idx === -1) {
      el.style.display = 'none';
      return;
    }
    el.style.display = '';
    el.querySelector('.stepper__num').textContent = idx + 1;
    if (idx === currentIndex) el.classList.add('active');
    if (idx < currentIndex)  el.classList.add('done');
  });

  Object.entries(BACK_BUTTONS).forEach(([step, btnId]) => {
    const btn = document.getElementById(btnId);
    if (btn) btn.style.display = prevStep(step) ? '' : 'none';
  });

  if (stepName === 'datetime') renderCalendar();
}

// ── Sélection sur grille de cartes (salon / coiffeur / service) ──────────
// Facteur commun aux 3 étapes à choix multiple : sélection visuelle + callback.
function wireSelectableGrid(grid, onSelect) {
  grid.querySelectorAll('.service-pick-card').forEach(card => {
    const select = () => {
      grid.querySelectorAll('.service-pick-card').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-checked', 'false');
      });
      card.classList.add('selected');
      card.setAttribute('aria-checked', 'true');
      onSelect(card);
    };
    card.addEventListener('click', select);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') select(); });
  });
}

// Affiche un message d'erreur dans une grille en évitant toute injection HTML
// (le message peut provenir de l'API via err.message)
function showGridError(grid, message) {
  const p = document.createElement('p');
  p.style.cssText = 'color:var(--error);font-size:.88rem;';
  p.textContent = message;
  grid.replaceChildren(p);
}

// ── Étape salon (conditionnelle) ──────────────────────────
// Construit une carte de sélection de salon en évitant toute injection HTML (données venant de l'API)
function renderSalonCard(s) {
  const card = document.createElement('div');
  card.className = 'service-pick-card';
  card.dataset.id = s.id;
  card.dataset.name = s.name;
  card.dataset.lat = s.latitude ?? '';
  card.dataset.lng = s.longitude ?? '';
  card.setAttribute('role', 'radio');
  card.setAttribute('aria-checked', 'false');
  card.setAttribute('tabindex', '0');

  const icon = document.createElement('div');
  icon.className = 'service-pick-card__icon';
  icon.textContent = '📍';

  const name = document.createElement('p');
  name.className = 'service-pick-card__name';
  name.textContent = s.name;

  const meta = document.createElement('p');
  meta.className = 'service-pick-card__meta';
  meta.textContent = s.address || '';

  card.append(icon, name, meta);
  return card;
}

// Carte Leaflet de l'étape salon : un marqueur par salon ayant des coordonnées.
// Le clic sur un marqueur déclenche la même sélection qu'un clic sur la carte
// correspondante dans #salonPickGrid (délègue au DOM plutôt que dupliquer la logique).
let salonMapInstance = null;

function renderSalonMap(salons) {
  const mapEl = document.getElementById('salonPickMap');
  const withCoords = salons.filter(s => s.latitude !== null && s.longitude !== null);

  if (!withCoords.length) {
    mapEl.classList.add('hidden');
    return;
  }

  mapEl.classList.remove('hidden');

  // mysql2 renvoie les DECIMAL en chaînes : parseFloat() obligatoire avant tout usage Leaflet.
  const points = withCoords.map(s => ({
    id: s.id,
    name: s.name,
    address: s.address || '',
    lat: parseFloat(s.latitude),
    lng: parseFloat(s.longitude),
  }));

  if (salonMapInstance) {
    salonMapInstance.remove();
    salonMapInstance = null;
  }

  salonMapInstance = L.map(mapEl);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(salonMapInstance);

  const markers = points.map(p => {
    const marker = L.marker([p.lat, p.lng]).addTo(salonMapInstance);
    marker.bindPopup(`<strong>${escapeMapText(p.name)}</strong><br>${escapeMapText(p.address)}`);
    marker.on('click', () => {
      const card = document.querySelector(`#salonPickGrid [data-id="${p.id}"]`);
      if (card) card.click();
    });
    return marker;
  });

  if (markers.length === 1) {
    salonMapInstance.setView([points[0].lat, points[0].lng], 14);
  } else {
    const group = L.featureGroup(markers);
    salonMapInstance.fitBounds(group.getBounds().pad(0.2));
  }
}

// Échappement minimal pour le HTML injecté dans les popups Leaflet (bindPopup ne
// passe pas par textContent) : les noms/adresses viennent de l'API, jamais de saisie
// utilisateur libre à ce stade, mais on protège quand même par principe XSS du projet.
function escapeMapText(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Résout le salon : auto-sélection silencieuse si un seul salon actif, sinon
// affiche la grille de choix. Retourne true si résolu automatiquement (aucune
// action utilisateur nécessaire), false si l'étape doit rester visible.
async function resolveSalon() {
  const grid = document.getElementById('salonPickGrid');
  try {
    const salons = await apiRequest('/salons');

    if (!salons.length) {
      setStepVisible('salon', true);
      showGridError(grid, 'Aucun salon disponible pour le moment.');
      return false;
    }

    if (salons.length === 1) {
      state.salon = {
        id: salons[0].id,
        name: salons[0].name,
        latitude: salons[0].latitude,
        longitude: salons[0].longitude,
      };
      setStepVisible('salon', false);
      return true;
    }

    setStepVisible('salon', true);
    grid.replaceChildren(...salons.map(renderSalonCard));
    renderSalonMap(salons);
    wireSelectableGrid(grid, card => {
      state.salon = {
        id: card.dataset.id,
        name: card.dataset.name,
        latitude: card.dataset.lat || null,
        longitude: card.dataset.lng || null,
      };
      resetFrom('salon');
      const btn = document.getElementById('btnSalonNext');
      btn.disabled = true;
      afterSalonKnown().finally(() => { btn.disabled = false; });
    });
    return false;
  } catch (err) {
    setStepVisible('salon', true);
    showGridError(grid, err.message);
    return false;
  }
}

// ── Étape coiffeur (conditionnelle) ───────────────────────
// Construit une carte de sélection de coiffeur en évitant toute injection HTML (données venant de l'API)
function renderStylistCard(s) {
  const card = document.createElement('div');
  card.className = 'service-pick-card';
  const fullName = `${s.first_name} ${s.last_name}`;
  card.dataset.id = s.id;
  card.dataset.name = fullName;
  card.setAttribute('role', 'radio');
  card.setAttribute('aria-checked', 'false');
  card.setAttribute('tabindex', '0');

  const icon = document.createElement('div');
  icon.className = 'service-pick-card__icon';
  icon.textContent = '💇';

  const name = document.createElement('p');
  name.className = 'service-pick-card__name';
  name.textContent = fullName;

  card.append(icon, name);
  return card;
}

// Résout le coiffeur pour le salon connu : même logique d'auto-sélection que resolveSalon.
async function resolveStylists(salonId) {
  const grid = document.getElementById('stylistPickGrid');
  try {
    const stylists = await apiRequest(`/salons/${salonId}/stylists`);

    if (!stylists.length) {
      setStepVisible('stylist', true);
      showGridError(grid, 'Aucun coiffeur disponible pour ce salon.');
      return false;
    }

    if (stylists.length === 1) {
      const s = stylists[0];
      state.stylist = { id: s.id, name: `${s.first_name} ${s.last_name}` };
      setStepVisible('stylist', false);
      grid.replaceChildren(); // vide un éventuel contenu d'un salon précédemment sélectionné
      return true;
    }

    setStepVisible('stylist', true);
    grid.replaceChildren(...stylists.map(renderStylistCard));
    document.getElementById('btnStylistNext').disabled = true;
    wireSelectableGrid(grid, card => {
      state.stylist = { id: card.dataset.id, name: card.dataset.name };
      resetFrom('stylist');
      document.getElementById('btnStylistNext').disabled = false;
    });
    return false;
  } catch (err) {
    setStepVisible('stylist', true);
    showGridError(grid, err.message);
    return false;
  }
}

// Une fois le salon connu (auto ou choisi) : résout le coiffeur et charge les
// prestations du salon en parallèle (les prestations ne dépendent que du salon).
async function afterSalonKnown() {
  await Promise.all([resolveStylists(state.salon.id), loadServices()]);
}

// Point d'entrée : résout salon → coiffeur → prestations, puis affiche la
// première étape restée visible. Avec un seul salon et un seul coiffeur
// (seeds actuels), tout est auto-résolu et le parcours démarre directement à
// "service", identique au parcours d'avant le Lot 2.
async function initBooking() {
  const salonAuto = await resolveSalon();
  if (!salonAuto) { goStep('salon'); return; }

  await afterSalonKnown();
  const stylistVisible = STEPS.find(s => s.name === 'stylist').visible;
  goStep(stylistVisible ? 'stylist' : 'service');
}

document.addEventListener('DOMContentLoaded', initBooking);

// ── Étape service — Prestations ───────────────────────────
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
    const services = await apiRequest(`/services?salon_id=${state.salon.id}`);

    if (!services.length) {
      showGridError(grid, 'Aucune prestation disponible dans ce salon pour le moment.');
      return;
    }

    grid.replaceChildren(...services.map(renderServicePickCard));
    document.getElementById('btnStep1Next').disabled = true;

    wireSelectableGrid(grid, card => {
      state.service = {
        id:       card.dataset.id,
        name:     card.dataset.name,
        duration: card.dataset.duration,
        price:    card.dataset.price,
      };
      document.getElementById('btnStep1Next').disabled = false;
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

document.getElementById('btnStep1Back').addEventListener('click', () => goStep(prevStep('service')));
document.getElementById('btnStep1Next').addEventListener('click', () => goStep(nextStep('service')));

// ── Navigation salon / coiffeur ───────────────────────────
document.getElementById('btnSalonNext').addEventListener('click', () => goStep(nextStep('salon')));
document.getElementById('btnStylistBack').addEventListener('click', () => goStep(prevStep('stylist')));
document.getElementById('btnStylistNext').addEventListener('click', () => goStep(nextStep('stylist')));

// ── Étape datetime — Calendrier ───────────────────────────
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
    const { slots } = await apiRequest(`/appointments/slots?date=${dateStr}&serviceId=${state.service.id}&stylist_id=${state.stylist.id}`);
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

document.getElementById('btnStep2Back').addEventListener('click', () => goStep(prevStep('datetime')));
document.getElementById('btnStep2Next').addEventListener('click', () => { buildRecap(); goStep(nextStep('datetime')); });

// ── Étape confirm — Récapitulatif ─────────────────────────
function buildRecap() {
  const startDate = new Date(state.slot.start);
  const dateLabel = startDate.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeLabel = startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const rows = [];
  if (STEPS.find(s => s.name === 'salon').visible)   rows.push(renderRecapRow('Salon', state.salon.name));
  if (STEPS.find(s => s.name === 'stylist').visible) rows.push(renderRecapRow('Coiffeur', state.stylist.name));
  rows.push(
    renderRecapRow('Prestation', state.service.name),
    renderRecapRow('Durée', `${state.service.duration} min`),
    renderRecapRow('Date', dateLabel),
    renderRecapRow('Heure', timeLabel),
    renderRecapRow('Tarif', `${parseFloat(state.service.price).toFixed(2)} €`),
  );

  document.getElementById('recapContent').replaceChildren(...rows);
  renderRecapMap();
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

// Carte Leaflet du récapitulatif : marqueur unique, non cliquable, juste informatif.
let recapMapInstance = null;

function renderRecapMap() {
  const mapEl = document.getElementById('recapMap');

  if (state.salon.latitude === null || state.salon.longitude === null) {
    mapEl.classList.add('hidden');
    return;
  }

  mapEl.classList.remove('hidden');

  // mysql2 renvoie les DECIMAL en chaînes : parseFloat() obligatoire avant tout usage Leaflet.
  const lat = parseFloat(state.salon.latitude);
  const lng = parseFloat(state.salon.longitude);

  if (recapMapInstance) {
    recapMapInstance.remove();
    recapMapInstance = null;
  }

  recapMapInstance = L.map(mapEl, { zoomControl: false, dragging: false, scrollWheelZoom: false }).setView([lat, lng], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(recapMapInstance);
  L.marker([lat, lng]).addTo(recapMapInstance).bindPopup(escapeMapText(state.salon.name));

  // Leaflet calcule mal ses dimensions si le conteneur était masqué (display:none)
  // au moment de l'init — ce panel n'est affiché qu'après buildRecap(), invalidateSize()
  // force un recalcul propre après le prochain repaint.
  setTimeout(() => recapMapInstance.invalidateSize(), 0);
}

document.getElementById('btnStep3Back').addEventListener('click', () => goStep(prevStep('confirm')));

document.getElementById('btnConfirm').addEventListener('click', async () => {
  const btn   = document.getElementById('btnConfirm');
  const alert = document.getElementById('confirmAlert');
  btn.disabled = true;
  btn.textContent = 'Confirmation…';

  try {
    await apiRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        service_id: state.service.id,
        start_at:   state.slot.start,
        salon_id:   state.salon.id,
        stylist_id: state.stylist.id,
      }),
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
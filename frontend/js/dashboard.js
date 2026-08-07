// js/dashboard.js — Dashboard administrateur

let agendaDate = new Date();
agendaDate.setHours(0, 0, 0, 0);

// ── Résolution du salon_id (manager uniquement, prestations) ─────
// Mémoïsée : un seul appel /auth/me même si loadServices()/loadMetrics()
// s'exécutent en parallèle au chargement de page. Admin → résout null,
// les GET /services partent alors sans paramètre (URL inchangée).
let managerSalonIdPromise = null;

function resolveManagerSalonId() {
  if (Auth.getRole() !== 'manager') return Promise.resolve(null);
  if (!managerSalonIdPromise) {
    managerSalonIdPromise = apiRequest('/auth/me').then(me => me.salon_id);
  }
  return managerSalonIdPromise;
}

function servicesUrl(salonId) {
  return salonId ? `/services?salon_id=${salonId}` : '/services';
}

// ── Résolution du scope d'affichage de l'agenda (coiffeur/salon) ─
// Mémoïsée. showSalon : admin uniquement (un manager ne voit que son propre
// salon, donc jamais utile pour lui) et seulement si plusieurs salons actifs
// existent. showStylist : liste des coiffeurs déjà scopée par resolveHorairesStylists
// (son propre salon pour un manager, tous salons actifs pour un admin).
let agendaScopePromise = null;

function resolveAgendaScope() {
  if (!agendaScopePromise) {
    agendaScopePromise = resolveManagerSalonId().then(async managerSalonId => {
      const stylists = await resolveHorairesStylists();
      const showStylist = stylists.length > 1;
      if (managerSalonId !== null) return { showSalon: false, showStylist };

      const salons = await apiRequest('/salons');
      return { showSalon: salons.length > 1, showStylist };
    });
  }
  return agendaScopePromise;
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLogged() || !Auth.isStaff()) { window.location.href = 'login.html'; return; }
  document.querySelector('.dash-sidebar__logo small').textContent = Auth.isAdmin() ? 'Administration' : 'Mon salon';

  document.querySelectorAll('.dash-tab[data-tab="salons"], .dash-nav a[data-tab="salons"]').forEach(el => {
    el.style.display = Auth.isAdmin() ? '' : 'none';
  });

  const initialLoaders = [loadAgenda(), loadServices(), loadMetrics()];
  if (Auth.isAdmin()) initialLoaders.push(loadSalons());
  await Promise.all(initialLoaders);
});

// ── Tabs ──────────────────────────────────────────────────
function switchTab(tabId) {
  if (tabId === 'salons' && !Auth.isAdmin()) return;

  document.querySelectorAll('.dash-tab, .dash-panel').forEach(el => {
    el.classList.remove('active');
    if (el.tagName === 'BUTTON') el.setAttribute('aria-selected', 'false');
  });
  document.querySelector(`.dash-tab[data-tab="${tabId}"]`).classList.add('active');
  document.querySelector(`.dash-tab[data-tab="${tabId}"]`).setAttribute('aria-selected', 'true');
  document.getElementById(`panel-${tabId}`).classList.add('active');

  if (tabId === 'clients')  loadAllRdv();
  if (tabId === 'horaires') openHorairesTab();
  if (tabId === 'salons')   loadSalons();
}

document.querySelectorAll('.dash-tab').forEach(btn =>
  btn.addEventListener('click', () => switchTab(btn.dataset.tab))
);
document.querySelectorAll('.dash-nav a').forEach(a =>
  a.addEventListener('click', e => { e.preventDefault(); switchTab(a.dataset.tab); })
);

// ── Métriques ─────────────────────────────────────────────
async function loadMetrics() {
  try {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const [allRdv, services] = await Promise.all([
      apiRequest('/appointments'),
      resolveManagerSalonId().then(salonId => apiRequest(servicesUrl(salonId))),
    ]);
    const todayRdv = allRdv.filter(r => r.start_at.startsWith(todayStr));

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekRdv     = allRdv.filter(r => { const d = new Date(r.start_at); return d >= weekStart && d <= weekEnd; });
    const cancelCount = allRdv.filter(r => r.status === 'cancelled').length;

    document.getElementById('metToday').textContent     = todayRdv.length;
    document.getElementById('metWeek').textContent      = weekRdv.length;
    document.getElementById('metServices').textContent  = services.length;
    document.getElementById('metCancelled').textContent = cancelCount;
  } catch (err) {
    console.error('Erreur métriques :', err);
  }
}

// ── Agenda ────────────────────────────────────────────────
function formatAgendaDate(d) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tom   = new Date(today); tom.setDate(tom.getDate() + 1);
  const opts  = { day: 'numeric', month: 'long', year: 'numeric' };
  if (d.toDateString() === today.toDateString()) return 'Aujourd\'hui — ' + d.toLocaleDateString('fr-FR', opts);
  if (d.toDateString() === tom.toDateString())   return 'Demain — '       + d.toLocaleDateString('fr-FR', opts);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', ...opts });
}

async function loadAgenda() {
  document.getElementById('agendaDateLabel').textContent = formatAgendaDate(agendaDate);
  const list    = document.getElementById('agendaList');
  list.innerHTML = '<div class="loader"><div class="spinner"></div> Chargement…</div>';

  try {
    const dateStr = `${agendaDate.getFullYear()}-${String(agendaDate.getMonth() + 1).padStart(2, '0')}-${String(agendaDate.getDate()).padStart(2, '0')}`;
    const rdvs    = await apiRequest(`/appointments?date=${dateStr}`);

    if (!rdvs.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📅</div>
          <h3>Aucun rendez-vous</h3>
          <p>Aucun RDV prévu ce jour.</p>
        </div>`;
      return;
    }

    const scope = await resolveAgendaScope();
    list.replaceChildren(...rdvs.map(r => renderAgendaItem(r, {
      timeLabel:    `${new Date(r.start_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} – ${new Date(r.end_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      serviceLabel: `${r.service_name} · ${r.duration_minutes} min`,
      cancelAttr:   'data-cancel-rdv',
      ...scope,
    })));

    list.querySelectorAll('[data-cancel-rdv]').forEach(btn =>
      btn.addEventListener('click', async () => {
        if (!confirm('Annuler ce rendez-vous ?')) return;
        try {
          await apiRequest(`/appointments/${btn.dataset.cancelRdv}`, { method: 'DELETE' });
          showToast('Rendez-vous annulé.');
          loadAgenda();
          loadMetrics();
        } catch (err) { showToast(err.message); }
      })
    );
  } catch (err) {
    list.replaceChildren(renderErrorParagraph(err.message, '1rem 0'));
  }
}

// Construit une ligne d'agenda (agenda du jour ou liste "tous les RDV") en évitant toute injection HTML
function renderAgendaItem(r, { timeLabel, serviceLabel, cancelAttr, showStylist, showSalon }) {
  const statusLabel = r.status === 'confirmed' ? 'Confirmé' : r.status === 'cancelled' ? 'Annulé' : 'En attente';

  const item = document.createElement('div');
  item.className = 'agenda-item';
  item.setAttribute('role', 'listitem');

  const timeSpan = document.createElement('span');
  timeSpan.className = 'agenda-item__time';
  timeSpan.textContent = timeLabel;

  const info = document.createElement('div');
  const clientP = document.createElement('p');
  clientP.className = 'agenda-item__client';
  clientP.textContent = `${r.first_name} ${r.last_name}`;
  const serviceP = document.createElement('p');
  serviceP.className = 'agenda-item__service';
  serviceP.textContent = serviceLabel;
  info.append(clientP, serviceP);

  if (showStylist) {
    const stylistP = document.createElement('p');
    stylistP.className = 'agenda-item__service';
    stylistP.textContent = r.stylist_name || '—';
    info.appendChild(stylistP);
  }
  if (showSalon) {
    const salonP = document.createElement('p');
    salonP.className = 'agenda-item__service';
    salonP.textContent = r.salon_name || '—';
    info.appendChild(salonP);
  }

  const right = document.createElement('div');
  right.style.cssText = 'display:flex;align-items:center;gap:.5rem;';
  const badge = document.createElement('span');
  badge.className = `badge badge--${r.status}`;
  badge.textContent = statusLabel;
  right.appendChild(badge);

  if (r.status !== 'cancelled') {
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-icon btn-icon--danger';
    cancelBtn.style.fontSize = '.78rem';
    cancelBtn.textContent = '✕ Annuler';
    cancelBtn.setAttribute(cancelAttr, r.id);
    right.appendChild(cancelBtn);
  }

  item.append(timeSpan, info, right);
  return item;
}

// Paragraphe d'erreur générique (le message provient de l'API, jamais injecté en HTML brut)
function renderErrorParagraph(message, padding) {
  const p = document.createElement('p');
  p.style.cssText = `color:var(--error);padding:${padding};`;
  p.textContent = message;
  return p;
}

document.getElementById('agendaPrev').addEventListener('click', () => {
  agendaDate.setDate(agendaDate.getDate() - 1); loadAgenda();
});
document.getElementById('agendaNext').addEventListener('click', () => {
  agendaDate.setDate(agendaDate.getDate() + 1); loadAgenda();
});
document.getElementById('agendaToday').addEventListener('click', () => {
  agendaDate = new Date(); agendaDate.setHours(0, 0, 0, 0); loadAgenda();
});

// ── Tous les RDV ──────────────────────────────────────────
async function loadAllRdv(dateFilter = '') {
  const list    = document.getElementById('clientsList');
  list.innerHTML = '<div class="loader"><div class="spinner"></div> Chargement…</div>';
  try {
    const url  = dateFilter ? `/appointments?date=${dateFilter}` : '/appointments';
    const rdvs = await apiRequest(url);

    if (!rdvs.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📋</div>
          <h3>Aucun résultat</h3>
          <p>Aucun rendez-vous pour cette période.</p>
        </div>`;
      return;
    }

    const scope = await resolveAgendaScope();
    list.replaceChildren(...rdvs.map(r => renderAgendaItem(r, {
      timeLabel:    `${new Date(r.start_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ${new Date(r.start_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      serviceLabel: r.service_name,
      cancelAttr:   'data-cancel-all',
      ...scope,
    })));

    list.querySelectorAll('[data-cancel-all]').forEach(btn =>
      btn.addEventListener('click', async () => {
        if (!confirm('Annuler ce rendez-vous ?')) return;
        try {
          await apiRequest(`/appointments/${btn.dataset.cancelAll}`, { method: 'DELETE' });
          showToast('Rendez-vous annulé.');
          loadAllRdv(document.getElementById('clientsDateFilter').value);
          loadMetrics();
        } catch (err) { showToast(err.message); }
      })
    );
  } catch (err) {
    list.replaceChildren(renderErrorParagraph(err.message, '1rem 0'));
  }
}

document.getElementById('clientsDateFilter').addEventListener('change', e => loadAllRdv(e.target.value));
document.getElementById('btnClearFilter').addEventListener('click', () => {
  document.getElementById('clientsDateFilter').value = '';
  loadAllRdv();
});

// ── Prestations ───────────────────────────────────────────
async function loadServices() {
  const tbody = document.getElementById('serviceTableBody');
  try {
    const salonId = await resolveManagerSalonId();
    const services = await apiRequest(servicesUrl(salonId));
    document.getElementById('metServices').textContent = services.length;

    if (!services.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">Aucune prestation.</td></tr>';
      return;
    }

    tbody.replaceChildren(...services.map(renderServiceRow));

    tbody.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openServiceModal({
        id:       btn.dataset.edit,
        name:     btn.dataset.name,
        duration: btn.dataset.duration,
        price:    btn.dataset.price,
      }));
    });

    tbody.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Désactiver cette prestation ?')) return;
        try {
          await apiRequest(`/services/${btn.dataset.delete}`, { method: 'DELETE' });
          showToast('Prestation désactivée.');
          loadServices();
        } catch (err) {
          showToast(err.message || 'Erreur lors de la désactivation.', 'error');
        }
      });
    });
  } catch (err) {
    tbody.replaceChildren(renderErrorRow(err.message, 5));
  }
}

// Construit une ligne <tr> de la table des prestations en évitant toute injection HTML
function renderServiceRow(s) {
  const tr = document.createElement('tr');

  const nameTd = document.createElement('td');
  const strong = document.createElement('strong');
  strong.textContent = s.name;
  nameTd.appendChild(strong);

  const durationTd = document.createElement('td');
  durationTd.textContent = `${s.duration_minutes} min`;

  const priceTd = document.createElement('td');
  priceTd.textContent = `${parseFloat(s.price).toFixed(2)} €`;

  const statusTd = document.createElement('td');
  const badge = document.createElement('span');
  badge.className = 'badge badge--confirmed';
  badge.textContent = 'Active';
  statusTd.appendChild(badge);

  const actionsTd = document.createElement('td');
  const editBtn = document.createElement('button');
  editBtn.className = 'btn-icon';
  editBtn.textContent = '✏️ Modifier';
  editBtn.dataset.edit = s.id;
  editBtn.dataset.name = s.name;
  editBtn.dataset.duration = s.duration_minutes;
  editBtn.dataset.price = s.price;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-icon btn-icon--danger';
  deleteBtn.style.marginLeft = '.5rem';
  deleteBtn.textContent = '🗑 Désactiver';
  deleteBtn.dataset.delete = s.id;

  actionsTd.append(editBtn, deleteBtn);
  tr.append(nameTd, durationTd, priceTd, statusTd, actionsTd);
  return tr;
}

// Ligne d'erreur générique pour un tableau (colspan variable)
function renderLoadingRow(colspan) {
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = colspan;
  const loader = document.createElement('div');
  loader.className = 'loader';
  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  const label = document.createElement('span');
  label.textContent = 'Chargement…';
  loader.append(spinner, label);
  td.appendChild(loader);
  tr.appendChild(td);
  return tr;
}

function renderEmptyRow(message, colspan) {
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = colspan;
  td.style.textAlign = 'center';
  td.style.color = 'var(--text-muted)';
  td.style.padding = '2rem';
  td.textContent = message;
  tr.appendChild(td);
  return tr;
}

function renderErrorRow(message, colspan) {
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = colspan;
  td.style.color = 'var(--error)';
  td.textContent = message;
  tr.appendChild(td);
  return tr;
}

// ── Modal prestation ──────────────────────────────────────
function openServiceModal(s = null) {
  document.getElementById('serviceModalTitle').textContent = s ? 'Modifier la prestation' : 'Ajouter une prestation';
  document.getElementById('serviceId').value       = s?.id       || '';
  document.getElementById('serviceName').value     = s?.name     || '';
  document.getElementById('serviceDuration').value = s?.duration || '';
  document.getElementById('servicePrice').value    = s?.price    || '';
  document.getElementById('serviceModalAlert').style.display = 'none';
  document.getElementById('serviceModal').classList.remove('hidden');
}

document.getElementById('btnAddService').addEventListener('click', () => openServiceModal());
document.getElementById('serviceModalClose').addEventListener('click', () =>
  document.getElementById('serviceModal').classList.add('hidden')
);

// ── Horaires d'ouverture ──────────────────────────────────
const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// ── Sélection du coiffeur (onglet Horaires) ───────────────
// Coiffeur actuellement affiché ; propagé sur les 5 appels availabilities ci-dessous.
let currentStylistId = null;

// Facteur commun à la grille de choix (copié-adapté de wireSelectableGrid dans reserver.js).
function wireHorairesStylistGrid(grid, onSelect) {
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

// Construit une carte de sélection de coiffeur en évitant toute injection HTML (données venant de l'API)
function renderHorairesStylistCard(s) {
  const card = document.createElement('div');
  card.className = 'service-pick-card';
  card.dataset.id = s.id;
  card.setAttribute('role', 'radio');
  card.setAttribute('aria-checked', 'false');
  card.setAttribute('tabindex', '0');

  const icon = document.createElement('div');
  icon.className = 'service-pick-card__icon';
  icon.textContent = '💇';

  const name = document.createElement('p');
  name.className = 'service-pick-card__name';
  name.textContent = s.label;

  card.append(icon, name);
  return card;
}

// Résout les coiffeurs visibles par l'utilisateur connecté : un manager ne voit que
// les coiffeurs de son salon (salon_id renvoyé par /auth/me) ; un admin voit ceux de
// tous les salons actifs, avec le nom du salon dans le libellé seulement s'il y en a
// plusieurs (sinon le libellé reste juste "Prénom Nom", identique au cas mono-salon).
async function resolveHorairesStylists() {
  if (Auth.getRole() === 'manager') {
    const me = await apiRequest('/auth/me');
    const stylists = await apiRequest(`/salons/${me.salon_id}/stylists`);
    return stylists.map(s => ({ id: s.id, label: `${s.first_name} ${s.last_name}` }));
  }

  const salons = await apiRequest('/salons');
  const multiSalon = salons.length > 1;
  const perSalon = await Promise.all(salons.map(s => apiRequest(`/salons/${s.id}/stylists`)));

  const stylists = [];
  salons.forEach((salon, i) => {
    perSalon[i].forEach(s => {
      const name = `${s.first_name} ${s.last_name}`;
      stylists.push({ id: s.id, label: multiSalon ? `${name} — ${salon.name}` : name });
    });
  });
  return stylists;
}

// Affiche (ou masque) le sélecteur de coiffeur et résout currentStylistId : auto-
// sélection silencieuse si un seul coiffeur au total (grille masquée, comportement
// visuel identique à avant), grille visible avec premier coiffeur sélectionné par
// défaut sinon. Retourne false si aucun coiffeur (grille vide) ou en cas d'erreur :
// l'appelant doit alors s'abstenir d'appeler loadAvailabilities.
async function loadHorairesStylist() {
  const card = document.getElementById('horairesStylistCard');
  const grid = document.getElementById('horairesStylistGrid');
  const list = document.getElementById('horairesList');

  let stylists;
  try {
    stylists = await resolveHorairesStylists();
  } catch (err) {
    currentStylistId = null;
    card.hidden = true;
    list.replaceChildren(renderErrorParagraph(err.message, '1rem 0'));
    return false;
  }

  if (!stylists.length) {
    currentStylistId = null;
    card.hidden = true;
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">💇</div>
        <h3>Aucun coiffeur</h3>
        <p>Aucun coiffeur pour ce salon.</p>
      </div>`;
    return false;
  }

  if (stylists.length === 1) {
    currentStylistId = stylists[0].id;
    card.hidden = true;
    grid.replaceChildren();
    return true;
  }

  card.hidden = false;
  grid.replaceChildren(...stylists.map(renderHorairesStylistCard));
  wireHorairesStylistGrid(grid, c => {
    currentStylistId = Number(c.dataset.id);
    loadAvailabilities();
  });

  const first = grid.querySelector('.service-pick-card');
  first.classList.add('selected');
  first.setAttribute('aria-checked', 'true');
  currentStylistId = Number(first.dataset.id);
  return true;
}

// Point d'entrée de l'onglet Horaires : résout le coiffeur puis charge ses horaires.
async function openHorairesTab() {
  const ok = await loadHorairesStylist();
  if (ok) loadAvailabilities();
}

async function loadAvailabilities() {
  const container = document.getElementById('horairesList');
  container.innerHTML = '<div class="loader"><div class="spinner"></div> Chargement…</div>';
  try {
    const data    = await apiRequest(`/availabilities?stylist_id=${currentStylistId}`);
    const weekly  = data.filter(r => r.day_of_week !== null && !r.is_blocked);
    const blocked = data.filter(r => r.is_blocked && r.blocked_date);
    const byDay   = {};
    weekly.forEach(r => { byDay[r.day_of_week] = r; });

    container.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'padding:0;overflow:hidden;';

    const table = document.createElement('table');
    table.className = 'service-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Jour</th><th>Ouverture</th><th>Fermeture</th><th></th></tr>';
    const tbody = document.createElement('tbody');
    [1, 2, 3, 4, 5, 6, 0].forEach(day => tbody.appendChild(renderAvailabilityRow(day, byDay)));
    table.append(thead, tbody);
    card.appendChild(table);

    const section = document.createElement('div');
    section.style.marginTop = '2rem';

    const h3 = document.createElement('h3');
    h3.style.cssText = 'font-family:var(--font-serif);font-size:1.1rem;margin-bottom:1rem;';
    h3.textContent = 'Fermetures exceptionnelles';

    const formRow = document.createElement('div');
    formRow.style.cssText = 'display:flex;gap:.75rem;align-items:center;margin-bottom:1rem;flex-wrap:wrap;';
    formRow.innerHTML = `
      <label style="font-size:.85rem;font-weight:500;">Du</label>
      <input type="date" id="blockDateStart"
        style="padding:.4rem .75rem;border:1.5px solid var(--border);border-radius:var(--radius-md);font-size:.85rem;" />
      <label style="font-size:.85rem;font-weight:500;">Au</label>
      <input type="date" id="blockDateEnd"
        style="padding:.4rem .75rem;border:1.5px solid var(--border);border-radius:var(--radius-md);font-size:.85rem;" />
      <button class="btn btn-accent" id="btnBlockDate" style="padding:.4rem 1rem;font-size:.85rem;">Bloquer la période</button>
    `;

    section.append(h3, formRow);

    if (blocked.length === 0) {
      const p = document.createElement('p');
      p.style.cssText = 'color:var(--text-muted);font-size:.9rem;';
      p.textContent = 'Aucune fermeture exceptionnelle planifiée.';
      section.appendChild(p);
    } else {
      const ul = document.createElement('ul');
      ul.style.cssText = 'list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:.5rem;';
      blocked.forEach(b => ul.appendChild(renderBlockedItem(b)));
      section.appendChild(ul);
    }

    container.append(card, section);

    container.querySelectorAll('[data-edit-day]').forEach(btn =>
      btn.addEventListener('click', () =>
        openHorairesModal(parseInt(btn.dataset.editDay), btn.dataset.open, btn.dataset.close)
      )
    );

    container.querySelectorAll('[data-close-day]').forEach(btn =>
      btn.addEventListener('click', async () => {
        const day = parseInt(btn.dataset.closeDay);
        if (!confirm(`Marquer ${DAY_NAMES[day]} comme fermé ?`)) return;
        try {
          await apiRequest(`/availabilities/${day}?stylist_id=${currentStylistId}`, { method: 'DELETE' });
          showToast(`${DAY_NAMES[day]} marqué comme fermé.`);
          loadAvailabilities();
        } catch (err) { showToast(err.message); }
      })
    );

    document.getElementById('btnBlockDate').addEventListener('click', async () => {
      const dateStart = document.getElementById('blockDateStart').value;
      const dateEnd   = document.getElementById('blockDateEnd').value;
      if (!dateStart) { showToast('Sélectionne une date de début.', 'error'); return; }
      const end = dateEnd || dateStart;
      if (end < dateStart) { showToast('La date de fin doit être après la date de début.', 'error'); return; }

      const dates = [];
      const cur = new Date(dateStart + 'T12:00:00');
      const fin = new Date(end + 'T12:00:00');
      while (cur <= fin) {
        dates.push(cur.toISOString().slice(0, 10));
        cur.setDate(cur.getDate() + 1);
      }

      try {
        await Promise.all(dates.map(d =>
          apiRequest('/availabilities/block', {
            method: 'POST',
            body: JSON.stringify({ blocked_date: d, stylist_id: currentStylistId }),
          })
        ));
        showToast(`${dates.length} jour(s) bloqué(s).`);
        loadAvailabilities();
      } catch (err) { showToast(err.message, 'error'); }
    });

    container.querySelectorAll('[data-unblock]').forEach(btn =>
      btn.addEventListener('click', async () => {
        const date = btn.dataset.unblock;
        if (!confirm(`Débloquer le ${date} ?`)) return;
        try {
          await apiRequest(`/availabilities/block/${date}?stylist_id=${currentStylistId}`, { method: 'DELETE' });
          showToast('Date débloquée.');
          loadAvailabilities();
        } catch (err) { showToast(err.message); }
      })
    );
  } catch (err) {
    container.replaceChildren(renderErrorParagraph(err.message, '1rem 0'));
  }
}

// Construit une ligne <tr> du tableau des horaires hebdomadaires
function renderAvailabilityRow(day, byDay) {
  const h  = byDay[day];
  const op = h ? h.open_time.slice(0, 5) : null;
  const cl = h ? h.close_time.slice(0, 5) : null;

  const tr = document.createElement('tr');

  const dayTd = document.createElement('td');
  const strong = document.createElement('strong');
  strong.textContent = DAY_NAMES[day];
  dayTd.appendChild(strong);

  const renderTimeTd = time => {
    const td = document.createElement('td');
    if (time !== null) {
      td.textContent = time;
    } else {
      const span = document.createElement('span');
      span.style.color = 'var(--text-muted)';
      span.textContent = '—';
      td.appendChild(span);
    }
    return td;
  };

  const actionsTd = document.createElement('td');
  if (h) {
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon';
    editBtn.textContent = '✏️ Modifier';
    editBtn.dataset.editDay = day;
    editBtn.dataset.open = op;
    editBtn.dataset.close = cl;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-icon btn-icon--danger';
    closeBtn.style.marginLeft = '.5rem';
    closeBtn.textContent = '✕ Fermer';
    closeBtn.dataset.closeDay = day;

    actionsTd.append(editBtn, closeBtn);
  } else {
    const openBtn = document.createElement('button');
    openBtn.className = 'btn-icon';
    openBtn.textContent = '+ Ouvrir';
    openBtn.dataset.editDay = day;
    openBtn.dataset.open = '';
    openBtn.dataset.close = '';
    actionsTd.appendChild(openBtn);
  }

  tr.append(dayTd, renderTimeTd(op), renderTimeTd(cl), actionsTd);
  return tr;
}

// Construit une ligne <li> de la liste des fermetures exceptionnelles
function renderBlockedItem(b) {
  const dateStr = typeof b.blocked_date === 'string'
    ? b.blocked_date.slice(0, 10)
    : b.blocked_date.toISOString().slice(0, 10);
  const label = new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const li = document.createElement('li');
  li.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:.6rem 1rem;background:var(--surface-2);border-radius:var(--radius-md);border:1.5px solid var(--border);';

  const span = document.createElement('span');
  span.textContent = `🔒 ${label}`;

  const btn = document.createElement('button');
  btn.className = 'btn-icon btn-icon--danger';
  btn.textContent = '✕ Débloquer';
  btn.dataset.unblock = dateStr;

  li.append(span, btn);
  return li;
}

function openHorairesModal(day, openTime, closeTime) {
  document.getElementById('horairesModalTitle').textContent =
    openTime ? `Modifier — ${DAY_NAMES[day]}` : `Ouvrir — ${DAY_NAMES[day]}`;
  document.getElementById('horairesDay').value   = day;
  document.getElementById('horairesOpen').value  = openTime  || '';
  document.getElementById('horairesClose').value = closeTime || '';
  document.getElementById('horairesModalAlert').style.display = 'none';
  document.getElementById('horairesModal').classList.remove('hidden');
}

document.getElementById('horairesModalClose').addEventListener('click', () =>
  document.getElementById('horairesModal').classList.add('hidden')
);

document.getElementById('horairesForm').addEventListener('submit', async e => {
  e.preventDefault();
  const day        = document.getElementById('horairesDay').value;
  const open_time  = document.getElementById('horairesOpen').value;
  const close_time = document.getElementById('horairesClose').value;
  if (!open_time || !close_time) return;

  const btn = document.getElementById('horairesSubmit');
  btn.disabled    = true;
  btn.textContent = 'Enregistrement…';

  try {
    await apiRequest(`/availabilities/${day}`, {
      method: 'PUT',
      body: JSON.stringify({ open_time, close_time, stylist_id: currentStylistId }),
    });
    showToast(`Horaires de ${DAY_NAMES[day]} enregistrés.`);
    document.getElementById('horairesModal').classList.add('hidden');
    loadAvailabilities();
  } catch (err) {
    const alert = document.getElementById('horairesModalAlert');
    alert.style.display = 'block';
    alert.className = 'form-alert visible form-alert--error';
    alert.textContent = err.message;
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Enregistrer';
  }
});

// ── Prestations ───────────────────────────────────────────
document.getElementById('serviceForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id       = document.getElementById('serviceId').value;
  const name     = document.getElementById('serviceName').value.trim();
  const duration = document.getElementById('serviceDuration').value;
  const price    = document.getElementById('servicePrice').value;
  if (!name || !duration || !price) return;

  const btn = document.getElementById('serviceSubmit');
  btn.disabled = true;
  btn.textContent = 'Enregistrement…';

  try {
    if (id) {
      await apiRequest(`/services/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, duration_minutes: duration, price }),
      });
      showToast('Prestation mise à jour.');
    } else {
      await apiRequest('/services', {
        method: 'POST',
        body: JSON.stringify({ name, duration_minutes: duration, price }),
      });
      showToast('Prestation ajoutée.');
    }
    document.getElementById('serviceModal').classList.add('hidden');
    loadServices();
  } catch (err) {
    const alert = document.getElementById('serviceModalAlert');
    alert.style.display = 'block';
    alert.className = 'form-alert visible form-alert--error';
    alert.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enregistrer';
  }
});

// ── Rendu et logique salons admin ─────────────────────────
function salonStatusInfo(s) {
  if (s.archived_at) return { label: 'Archivé', cls: 'badge--archived' };
  if (Number(s.is_active) === 1) return { label: 'Actif', cls: 'badge--active' };
  return { label: 'Inactif', cls: 'badge--inactive' };
}

// Construit une ligne <tr> de la table des salons en évitant toute injection HTML
function renderSalonRow(s) {
  const tr = document.createElement('tr');

  const nameTd = document.createElement('td');
  const strong = document.createElement('strong');
  strong.textContent = s.name;
  nameTd.appendChild(strong);

  const addressTd = document.createElement('td');
  addressTd.textContent = s.address || '—';

  const phoneTd = document.createElement('td');
  phoneTd.textContent = s.phone || '—';

  const coordsTd = document.createElement('td');
  coordsTd.textContent = (s.latitude !== null && s.longitude !== null)
    ? `${parseFloat(s.latitude).toFixed(4)}, ${parseFloat(s.longitude).toFixed(4)}`
    : '—';

  const statusTd = document.createElement('td');
  const { label, cls } = salonStatusInfo(s);
  const badge = document.createElement('span');
  badge.className = `badge ${cls}`;
  badge.textContent = label;
  statusTd.appendChild(badge);

  const actionsTd = document.createElement('td');

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-icon';
  editBtn.textContent = '✏️ Modifier';
  editBtn.dataset.editSalon = s.id;
  editBtn.dataset.salon = JSON.stringify(s);
  actionsTd.appendChild(editBtn);

  // Pas d'action de statut pour un salon archivé (terminal, cf. backend)
  if (!s.archived_at) {
    const statusBtn = document.createElement('button');
    statusBtn.className = 'btn-icon';
    statusBtn.style.marginLeft = '.5rem';
    if (Number(s.is_active) === 1) {
      statusBtn.textContent = '⏸ Désactiver';
      statusBtn.dataset.statusSalon = s.id;
      statusBtn.dataset.targetActive = '0';
    } else {
      statusBtn.textContent = '▶ Réactiver';
      statusBtn.dataset.statusSalon = s.id;
      statusBtn.dataset.targetActive = '1';
    }
    actionsTd.appendChild(statusBtn);

    const archiveBtn = document.createElement('button');
    archiveBtn.className = 'btn-icon btn-icon--danger';
    archiveBtn.style.marginLeft = '.5rem';
    archiveBtn.textContent = '🗄 Archiver';
    archiveBtn.dataset.archiveSalon = s.id;
    archiveBtn.dataset.name = s.name;
    actionsTd.appendChild(archiveBtn);
  }

  if (s.can_delete) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon btn-icon--danger';
    deleteBtn.style.marginLeft = '.5rem';
    deleteBtn.textContent = '🗑 Supprimer';
    deleteBtn.dataset.deleteSalon = s.id;
    deleteBtn.dataset.name = s.name;
    actionsTd.appendChild(deleteBtn);
  }

  tr.append(nameTd, addressTd, phoneTd, coordsTd, statusTd, actionsTd);
  return tr;
}

function wireSalonRowActions(tbody) {
  tbody.querySelectorAll('[data-edit-salon]').forEach(btn => {
    btn.addEventListener('click', () => openSalonModal(JSON.parse(btn.dataset.salon)));
  });
  tbody.querySelectorAll('[data-status-salon]').forEach(btn => {
    btn.addEventListener('click', () =>
      changeSalonStatus(btn.dataset.statusSalon, Number(btn.dataset.targetActive))
    );
  });
  tbody.querySelectorAll('[data-archive-salon]').forEach(btn => {
    btn.addEventListener('click', () => archiveSalonHandler(btn.dataset.archiveSalon, btn.dataset.name));
  });
  tbody.querySelectorAll('[data-delete-salon]').forEach(btn => {
    btn.addEventListener('click', () => deleteSalonHandler(btn.dataset.deleteSalon, btn.dataset.name));
  });
}

// Remplit le <select> du formulaire d'invitation manager avec les salons actifs
// non archivés. Préserve la sélection courante si elle reste valide.
function populateInviteManagerSalonSelect(activeSalons) {
  const select = document.getElementById('inviteManagerSalon');
  const current = select.value;
  select.replaceChildren();

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = activeSalons.length ? 'Choisir un salon' : 'Aucun salon actif';
  select.appendChild(placeholder);

  activeSalons.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    select.appendChild(opt);
  });

  if ([...select.options].some(o => o.value === current)) select.value = current;
}

async function loadSalons() {
  const tbody = document.getElementById('salonsTableBody');
  tbody.replaceChildren(renderLoadingRow(6));
  try {
    const salons = await apiRequest('/salons/admin');

    if (!salons.length) {
      tbody.replaceChildren(renderEmptyRow('Aucun salon.', 6));
    } else {
      tbody.replaceChildren(...salons.map(renderSalonRow));
      wireSalonRowActions(tbody);
    }

    populateInviteManagerSalonSelect(salons.filter(s => Number(s.is_active) === 1 && !s.archived_at));
  } catch (err) {
    tbody.replaceChildren(renderErrorRow(err.message, 6));
  }
}

function openSalonModal(s = null) {
  document.getElementById('salonModalTitle').textContent = s ? 'Modifier le salon' : 'Ajouter un salon';
  document.getElementById('salonId').value = s?.id || '';
  document.getElementById('salonName').value = s?.name || '';
  document.getElementById('salonAddress').value = s?.address || '';
  document.getElementById('salonPhone').value = s?.phone || '';
  document.getElementById('salonIsActive').value = s ? String(Number(s.is_active)) : '1';
  document.getElementById('salonLatitude').value = (s?.latitude ?? '') === null ? '' : (s?.latitude ?? '');
  document.getElementById('salonLongitude').value = (s?.longitude ?? '') === null ? '' : (s?.longitude ?? '');
  document.getElementById('salonModalAlert').style.display = 'none';
  document.getElementById('salonModal').classList.remove('hidden');
}

// Désactivation/réactivation. Si le backend refuse (409, RDV futurs), propose
// la confirmation avec force:true — future_appointments vient d'err.data (cf.
// modification apiRequest dans app.js).
async function changeSalonStatus(id, targetActive) {
  try {
    await apiRequest(`/salons/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ is_active: targetActive }),
    });
    showToast(targetActive ? 'Salon réactivé.' : 'Salon désactivé.');
    loadSalons();
  } catch (err) {
    if (err.status === 409 && err.data?.future_appointments) {
      const n = err.data.future_appointments;
      const proceed = confirm(`${n} rendez-vous à venir seront affectés. Désactiver quand même ?`);
      if (!proceed) return;
      try {
        await apiRequest(`/salons/${id}/status`, {
          method: 'POST',
          body: JSON.stringify({ is_active: targetActive, force: true }),
        });
        showToast('Salon désactivé.');
        loadSalons();
      } catch (err2) {
        showToast(err2.message, 'error');
      }
      return;
    }
    showToast(err.message, 'error');
  }
}

async function archiveSalonHandler(id, name) {
  if (!confirm(`Archiver définitivement le salon "${name}" ? Cette action est irréversible.`)) return;
  try {
    await apiRequest(`/salons/${id}/archive`, { method: 'POST' });
    showToast('Salon archivé.');
    loadSalons();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteSalonHandler(id, name) {
  if (!confirm(`Supprimer définitivement le salon "${name}" ? Cette action est irréversible.`)) return;
  try {
    await apiRequest(`/salons/${id}`, { method: 'DELETE' });
    showToast('Salon supprimé.');
    loadSalons();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Salons admin ─────────────────────────────────────────
document.getElementById('btnAddSalon').addEventListener('click', () => openSalonModal());
document.getElementById('salonModalClose').addEventListener('click', () =>
  document.getElementById('salonModal').classList.add('hidden')
);

document.getElementById('salonForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('salonId').value;
  const name = document.getElementById('salonName').value.trim();
  const address = document.getElementById('salonAddress').value.trim();
  const phone = document.getElementById('salonPhone').value.trim();
  const isActive = Number(document.getElementById('salonIsActive').value);
  const latitudeRaw = document.getElementById('salonLatitude').value.trim();
  const longitudeRaw = document.getElementById('salonLongitude').value.trim();

  if (!name) return;

  const latitude = latitudeRaw === '' ? null : Number(latitudeRaw);
  const longitude = longitudeRaw === '' ? null : Number(longitudeRaw);
  if ((latitude === null) !== (longitude === null)) {
    const alert = document.getElementById('salonModalAlert');
    alert.style.display = 'block';
    alert.className = 'form-alert visible form-alert--error';
    alert.textContent = 'Latitude et longitude doivent être fournies ensemble.';
    return;
  }

  const payload = { name, address: address || null, phone: phone || null, is_active: isActive, latitude, longitude };
  const btn = document.getElementById('salonSubmit');
  btn.disabled = true;
  btn.textContent = 'Enregistrement…';

  try {
    if (id) {
      await apiRequest(`/salons/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Salon mis à jour.');
    } else {
      await apiRequest('/salons', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Salon créé.');
    }
    document.getElementById('salonModal').classList.add('hidden');
    loadSalons();
  } catch (err) {
    const alert = document.getElementById('salonModalAlert');
    alert.style.display = 'block';
    alert.className = 'form-alert visible form-alert--error';
    alert.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enregistrer';
  }
});

document.getElementById('inviteManagerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('inviteManagerEmail').value.trim();
  const first_name = document.getElementById('inviteManagerFirstName').value.trim();
  const last_name = document.getElementById('inviteManagerLastName').value.trim();
  const salon_id = Number(document.getElementById('inviteManagerSalon').value);

  if (!email || !first_name || !last_name || !salon_id) return;

  const btn = document.getElementById('inviteManagerSubmit');
  btn.disabled = true;
  btn.textContent = 'Envoi…';

  try {
    await apiRequest('/auth/invite-manager', {
      method: 'POST',
      body: JSON.stringify({ email, first_name, last_name, salon_id }),
    });
    showToast('Invitation envoyée.');
    document.getElementById('inviteManagerForm').reset();
    loadSalons();
  } catch (err) {
    const alert = document.getElementById('inviteManagerAlert');
    alert.style.display = 'block';
    alert.className = 'form-alert visible form-alert--error';
    alert.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Envoyer l\'invitation';
  }
});
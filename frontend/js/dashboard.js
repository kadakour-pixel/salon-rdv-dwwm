// js/dashboard.js — Dashboard administrateur

let agendaDate = new Date();
agendaDate.setHours(0, 0, 0, 0);

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLogged() || !Auth.isAdmin()) { window.location.href = 'login.html'; return; }
  await Promise.all([loadAgenda(), loadServices(), loadMetrics()]);
});

// ── Tabs ──────────────────────────────────────────────────
function switchTab(tabId) {
  document.querySelectorAll('.dash-tab, .dash-panel').forEach(el => {
    el.classList.remove('active');
    if (el.tagName === 'BUTTON') el.setAttribute('aria-selected', 'false');
  });
  document.querySelector(`.dash-tab[data-tab="${tabId}"]`).classList.add('active');
  document.querySelector(`.dash-tab[data-tab="${tabId}"]`).setAttribute('aria-selected', 'true');
  document.getElementById(`panel-${tabId}`).classList.add('active');

  if (tabId === 'clients')  loadAllRdv();
  if (tabId === 'horaires') loadAvailabilities();
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
      apiRequest('/services'),
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

    list.replaceChildren(...rdvs.map(r => renderAgendaItem(r, {
      timeLabel:    `${new Date(r.start_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} – ${new Date(r.end_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      serviceLabel: `${r.service_name} · ${r.duration_minutes} min`,
      cancelAttr:   'data-cancel-rdv',
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
function renderAgendaItem(r, { timeLabel, serviceLabel, cancelAttr }) {
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

    list.replaceChildren(...rdvs.map(r => renderAgendaItem(r, {
      timeLabel:    `${new Date(r.start_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ${new Date(r.start_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      serviceLabel: r.service_name,
      cancelAttr:   'data-cancel-all',
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
    const services = await apiRequest('/services');
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

async function loadAvailabilities() {
  const container = document.getElementById('horairesList');
  container.innerHTML = '<div class="loader"><div class="spinner"></div> Chargement…</div>';
  try {
    const data    = await apiRequest('/availabilities');
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
          await apiRequest(`/availabilities/${day}`, { method: 'DELETE' });
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
            body: JSON.stringify({ blocked_date: d }),
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
          await apiRequest(`/availabilities/block/${date}`, { method: 'DELETE' });
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
      body: JSON.stringify({ open_time, close_time }),
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
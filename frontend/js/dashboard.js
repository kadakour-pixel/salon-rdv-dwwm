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
}

document.querySelectorAll('.dash-tab').forEach(btn =>
  btn.addEventListener('click', () => switchTab(btn.dataset.tab))
);
document.querySelectorAll('.dash-nav a').forEach(a =>
  a.addEventListener('click', e => { e.preventDefault(); switchTab(a.dataset.tab); })
);

// Charger les données à l'ouverture de l'onglet "clients"
document.querySelector('.dash-tab[data-tab="clients"]').addEventListener('click', () => loadAllRdv());

// ── Métriques ─────────────────────────────────────────────
async function loadMetrics() {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
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
    const dateStr = agendaDate.toISOString().slice(0, 10);
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

    list.innerHTML = rdvs.map(r => {
      const time = new Date(r.start_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const end  = new Date(r.end_at).toLocaleTimeString('fr-FR',   { hour: '2-digit', minute: '2-digit' });
      const statusLabel = r.status === 'confirmed' ? 'Confirmé' : r.status === 'cancelled' ? 'Annulé' : 'En attente';
      return `
        <div class="agenda-item" role="listitem">
          <span class="agenda-item__time">${time} – ${end}</span>
          <div>
            <p class="agenda-item__client">${r.first_name} ${r.last_name}</p>
            <p class="agenda-item__service">${r.service_name} · ${r.duration_minutes} min</p>
          </div>
          <span class="badge badge--${r.status}">${statusLabel}</span>
        </div>`;
    }).join('');
  } catch (err) {
    list.innerHTML = `<p style="color:var(--error);padding:1rem 0;">${err.message}</p>`;
  }
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

    list.innerHTML = rdvs.map(r => {
      const date = new Date(r.start_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const time = new Date(r.start_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const statusLabel = r.status === 'confirmed' ? 'Confirmé' : r.status === 'cancelled' ? 'Annulé' : 'En attente';
      return `
        <div class="agenda-item" role="listitem">
          <span class="agenda-item__time">${date} ${time}</span>
          <div>
            <p class="agenda-item__client">${r.first_name} ${r.last_name}</p>
            <p class="agenda-item__service">${r.service_name}</p>
          </div>
          <span class="badge badge--${r.status}">${statusLabel}</span>
        </div>`;
    }).join('');
  } catch (err) {
    list.innerHTML = `<p style="color:var(--error);padding:1rem 0;">${err.message}</p>`;
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

    tbody.innerHTML = services.map(s => `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td>${s.duration_minutes} min</td>
        <td>${parseFloat(s.price).toFixed(2)} €</td>
        <td><span class="badge badge--confirmed">Active</span></td>
        <td>
          <button class="btn-icon" data-edit="${s.id}" data-name="${s.name}"
                  data-duration="${s.duration_minutes}" data-price="${s.price}">✏️ Modifier</button>
          <button class="btn-icon btn-icon--danger" data-delete="${s.id}" style="margin-left:.5rem;">🗑 Désactiver</button>
        </td>
      </tr>`).join('');

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
        await apiRequest(`/services/${btn.dataset.delete}`, { method: 'DELETE' });
        showToast('Prestation désactivée.');
        loadServices();
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--error);">${err.message}</td></tr>`;
  }
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
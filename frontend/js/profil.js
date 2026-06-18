// js/profil.js — Modification du profil client

document.addEventListener('DOMContentLoaded', async () => {
  // Page réservée aux clients — les admins ont le dashboard, pas besoin de profil
  if (!Auth.isLogged()) {
    window.location.href = 'login.html';
    return;
  }
  if (Auth.isAdmin()) {
    window.location.href = 'dashboard.html';
    return;
  }

  // Pré-remplir le formulaire avec les données actuelles
  try {
    const user = await apiRequest('/auth/me');
    document.getElementById('profilFirstName').value = user.first_name;
    document.getElementById('profilLastName').value  = user.last_name;
    document.getElementById('profilEmail').value     = user.email;
  } catch (err) {
    showAlert('Impossible de charger vos informations.');
  }
});

document.getElementById('profilForm').addEventListener('submit', async e => {
  e.preventDefault();

  const first_name = document.getElementById('profilFirstName').value.trim();
  const last_name  = document.getElementById('profilLastName').value.trim();
  const email      = document.getElementById('profilEmail').value.trim();

  if (!first_name || !last_name || !email) {
    showAlert('Tous les champs sont obligatoires.');
    return;
  }

  const btn = document.getElementById('profilSubmit');
  btn.disabled    = true;
  btn.textContent = 'Enregistrement…';

  try {
    await apiRequest('/auth/me', {
      method: 'PUT',
      body: JSON.stringify({ first_name, last_name, email }),
    });
    showAlert('Profil mis à jour.', 'success');
  } catch (err) {
    showAlert(err.message);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Enregistrer';
  }
});

function showAlert(msg, type = 'error') {
  const el = document.getElementById('profilAlert');
  el.textContent  = msg;
  el.className    = `form-alert visible form-alert--${type}`;
  el.style.display = 'block';
}

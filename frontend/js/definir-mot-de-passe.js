// js/definir-mot-de-passe.js — Définition du mot de passe via lien d'invitation manager

// ── Helpers (identiques au pattern login.js) ──────────────
function showErr(id, show) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('visible', show);
}
function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = `form-alert visible form-alert--${type}`;
}
function hideAlert(id) {
  document.getElementById(id).classList.remove('visible');
}

// ── Lecture du token dans l'URL ────────────────────────────
const token = new URLSearchParams(window.location.search).get('token');
const form  = document.getElementById('setPasswordForm');
const backLink = document.getElementById('backToLoginLink');

if (!token) {
  showAlert('setPasswordAlert', "Lien invalide : aucun token trouvé dans l'URL.");
  form.hidden = true;
  backLink.hidden = false;
}

// ── Soumission du formulaire ───────────────────────────────
form.addEventListener('submit', async e => {
  e.preventDefault();
  hideAlert('setPasswordAlert');

  const password        = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  let valid = true;
  if (password.length < 8)            { showErr('newPasswordErr', true);     valid = false; } else showErr('newPasswordErr', false);
  if (password !== confirmPassword)   { showErr('confirmPasswordErr', true); valid = false; } else showErr('confirmPasswordErr', false);
  if (!valid) return;

  const btn = document.getElementById('setPasswordSubmit');
  btn.disabled = true;
  btn.textContent = 'Enregistrement…';

  try {
    const data = await apiRequest('/auth/set-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
    showAlert('setPasswordAlert', data.message, 'success');
    form.hidden = true;
    backLink.hidden = false;
  } catch (err) {
    showAlert('setPasswordAlert', err.message || 'Erreur lors de la définition du mot de passe.');
    // Lien invalide/expiré : le formulaire ne sert plus à rien, on masque et propose le retour
    if (err.status === 400) {
      form.hidden = true;
      backLink.hidden = false;
    } else {
      btn.disabled = false;
      btn.textContent = 'Définir mon mot de passe';
    }
  }
});
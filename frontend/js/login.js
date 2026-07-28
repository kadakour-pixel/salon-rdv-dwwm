// js/login.js — Connexion et inscription

// ── Onglets ───────────────────────────────────────────────
document.querySelectorAll('.login-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.login-tab, .login-form-panel').forEach(el => {
      el.classList.remove('active');
      if (el.tagName === 'BUTTON') el.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    document.getElementById(tab.getAttribute('aria-controls')).classList.add('active');
  });
});

// Ouvrir directement l'onglet inscription si #register dans l'URL
if (window.location.hash === '#register') {
  document.getElementById('tab-register').click();
}

// Retour du clic sur le lien de vérification reçu par mail (voir GET /api/auth/verify)
if (new URLSearchParams(window.location.search).get('verified') === '1') {
  showToast('Adresse email vérifiée ! Vous pouvez vous connecter.', 'success');
}

// ── Helpers validation ────────────────────────────────────
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

// ── Connexion ─────────────────────────────────────────────
const resendBtn = document.getElementById('resendVerificationBtn');

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  hideAlert('loginAlert');
  resendBtn.hidden = true;

  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  let valid = true;
  if (!email || !email.includes('@')) { showErr('loginEmailErr', true);    valid = false; } else showErr('loginEmailErr', false);
  if (!password)                       { showErr('loginPasswordErr', true); valid = false; } else showErr('loginPasswordErr', false);
  if (!valid) return;

  const btn = document.getElementById('loginSubmit');
  btn.disabled = true;
  btn.textContent = 'Connexion…';

  try {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    Auth.save(data.token, data.role);
    showAlert('loginAlert', 'Connexion réussie, redirection…', 'success');
    setTimeout(() => {
      window.location.href = data.role === 'admin' ? 'dashboard.html' : 'mes-rdv.html';
    }, 800);
  } catch (err) {
    showAlert('loginAlert', err.message || 'Identifiants incorrects.');
    if (err.status === 403) {
      resendBtn.hidden = false;
      resendBtn.dataset.email = email;
    }
    btn.disabled = false;
    btn.textContent = 'Se connecter';
  }
});

// ── Renvoi de l'email de vérification (affiché après un login 403) ──
resendBtn.addEventListener('click', async () => {
  resendBtn.disabled = true;
  try {
    const data = await apiRequest('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email: resendBtn.dataset.email }),
    });
    showAlert('loginAlert', data.message, 'success');
    resendBtn.hidden = true;
  } catch (err) {
    showAlert('loginAlert', err.message || "Erreur lors du renvoi de l'email.");
    resendBtn.disabled = false;
  }
});

// ── Inscription ───────────────────────────────────────────
document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  hideAlert('registerAlert');

  const first_name = document.getElementById('regFirstName').value.trim();
  const last_name  = document.getElementById('regLastName').value.trim();
  const email      = document.getElementById('regEmail').value.trim();
  const password   = document.getElementById('regPassword').value;

  let valid = true;
  if (!first_name)                       { showErr('regFirstNameErr', true); valid = false; } else showErr('regFirstNameErr', false);
  if (!last_name)                        { showErr('regLastNameErr', true);  valid = false; } else showErr('regLastNameErr', false);
  if (!email || !email.includes('@'))    { showErr('regEmailErr', true);     valid = false; } else showErr('regEmailErr', false);
  if (password.length < 8)              { showErr('regPasswordErr', true);  valid = false; } else showErr('regPasswordErr', false);
  if (!valid) return;

  const btn = document.getElementById('registerSubmit');
  btn.disabled = true;
  btn.textContent = 'Création…';

  try {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ first_name, last_name, email, password }),
    });
    // Pas de connexion automatique : le compte doit d'abord être vérifié par email
    showAlert('registerAlert', data.message, 'success');
    document.getElementById('registerForm').reset();
    btn.disabled = false;
    btn.textContent = 'Créer mon compte';
    setTimeout(() => {
      document.getElementById('tab-login').click();
      document.getElementById('loginEmail').value = email;
    }, 2000);
  } catch (err) {
    showAlert('registerAlert', err.message || 'Erreur lors de l\'inscription.');
    btn.disabled = false;
    btn.textContent = 'Créer mon compte';
  }
});
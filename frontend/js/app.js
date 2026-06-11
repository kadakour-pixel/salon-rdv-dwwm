// js/app.js — Utilitaires globaux partagés par toutes les pages

const API_BASE = 'http://localhost:3000/api';

// ── Auth ──────────────────────────────────────────────────
const Auth = {
  getToken()  { return localStorage.getItem('token'); },
  getRole()   { return localStorage.getItem('role'); },
  isLogged()  { return !!this.getToken(); },
  isAdmin()   { return this.getRole() === 'admin'; },

  save(token, role) {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
  },
  clear() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  },
};

// ── Requêtes API ──────────────────────────────────────────
async function apiRequest(path, options = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

// ── Toast ─────────────────────────────────────────────────
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── Détection du chemin relatif ───────────────────────────
// Permet de construire les liens corrects depuis index.html
// ou depuis les pages internes (dossier pages/)
function pagesPrefix() {
  return window.location.pathname.includes('/pages/') ? '' : 'pages/';
}

// ── Navbar dynamique ──────────────────────────────────────
function initNavbar() {
  const actions = document.querySelector('.navbar__actions');
  if (!actions) return;

  const prefix = pagesPrefix();

  // Injection des liens selon l'état de connexion
  if (Auth.isLogged()) {
    actions.innerHTML = Auth.isAdmin()
      ? `<a href="${prefix}dashboard.html" class="btn btn-outline">Dashboard</a>
         <button class="btn btn-primary" id="logoutBtn">Déconnexion</button>`
      : `<a href="${prefix}mes-rdv.html" class="btn btn-outline">Mes RDV</a>
         <button class="btn btn-primary" id="logoutBtn">Déconnexion</button>`;

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      Auth.clear();
      // Redirection vers l'accueil depuis n'importe quelle page
      window.location.href = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
    });
  } else {
    actions.innerHTML = `
      <a href="${prefix}login.html" class="btn btn-outline">Connexion</a>
      <a href="${prefix}login.html#register" class="btn btn-accent">Prendre RDV</a>
    `;
  }

  // Burger menu mobile — initialisé après injection du contenu
  const burger = document.querySelector('.navbar__burger');
  const links  = document.querySelector('.navbar__links');

  burger?.addEventListener('click', () => {
    const isOpen = links?.classList.contains('open');
    // Fermer tous les menus d'abord
    links?.classList.remove('open');
    actions.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    // Ouvrir si c'était fermé
    if (!isOpen) {
      links?.classList.add('open');
      actions.classList.add('open');
      burger.setAttribute('aria-expanded', 'true');
    }
  });
}

document.addEventListener('DOMContentLoaded', initNavbar);
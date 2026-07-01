const { generateSlots } = require('../../src/controllers/appointment.controller');

// La date de référence utilisée dans tous les tests
const DATE = '2026-07-15';

// Horaires d'ouverture fictifs (même format que la BDD)
const AVAIL_9H_18H = { open_time: '09:00:00', close_time: '18:00:00' };
const AVAIL_9H_9H30 = { open_time: '09:00:00', close_time: '09:30:00' };

describe('generateSlots()', () => {

  // ── Cas 1 : journée normale, aucun RDV ──────────────────────────
  it('génère des créneaux toutes les 30 min sur une journée ouverte', () => {
    const slots = generateSlots(DATE, AVAIL_9H_18H, 30, []);

    // 9h → 18h avec pas de 30 min et durée 30 min = 18 créneaux (9h00, 9h30, ..., 17h30)
    expect(slots).toHaveLength(18);
    expect(slots[0]).toEqual({
      start: `${DATE} 09:00:00`,
      end:   `${DATE} 09:30:00`,
    });
    expect(slots[17]).toEqual({
      start: `${DATE} 17:30:00`,
      end:   `${DATE} 18:00:00`,
    });
  });

  // ── Cas 2 : créneau exactement à la limite de fermeture ─────────
  it('inclut le créneau dont la fin coïncide exactement avec la fermeture', () => {
    // Fenêtre 9h00–9h30, durée 30 min → 1 seul créneau possible (9h00–9h30)
    const slots = generateSlots(DATE, AVAIL_9H_9H30, 30, []);
    expect(slots).toHaveLength(1);
  });

  // ── Cas 3 : créneau qui déborderait après la fermeture ──────────
  it('exclut le créneau dont la fin dépasse la fermeture', () => {
    // Fenêtre 9h00–9h30, durée 60 min → 9h00–10h00 déborde → 0 créneau
    const slots = generateSlots(DATE, AVAIL_9H_9H30, 60, []);
    expect(slots).toHaveLength(0);
  });

  // ── Cas 4 : créneau déjà réservé → exclu ────────────────────────
  it('exclut un créneau qui chevauche un RDV existant', () => {
    const booked = [{
      start_at: `${DATE} 09:00:00`,
      end_at:   `${DATE} 09:30:00`,
    }];

    const slots = generateSlots(DATE, AVAIL_9H_18H, 30, booked);

    // 18 créneaux possibles, 1 pris → 17 disponibles
    expect(slots).toHaveLength(17);
    // Le créneau 9h00–9h30 ne doit PAS être dans la liste
    const hasConflict = slots.some(s => s.start === `${DATE} 09:00:00`);
    expect(hasConflict).toBe(false);
  });

  // ── Cas 5 : chevauchement partiel (RDV à cheval sur 2 créneaux) ─
  it('exclut tous les créneaux qui chevauchent partiellement un RDV', () => {
    // RDV de 9h15 à 9h45 → bloque 9h00–9h30 ET 9h30–10h00 (chevauchement partiel)
    const booked = [{
      start_at: `${DATE} 09:15:00`,
      end_at:   `${DATE} 09:45:00`,
    }];

    const slots = generateSlots(DATE, AVAIL_9H_18H, 30, booked);

    expect(slots).toHaveLength(16); // 18 - 2 bloqués
    expect(slots.some(s => s.start === `${DATE} 09:00:00`)).toBe(false);
    expect(slots.some(s => s.start === `${DATE} 09:30:00`)).toBe(false);
    expect(slots.some(s => s.start === `${DATE} 10:00:00`)).toBe(true);
  });

});

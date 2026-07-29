// src/routes/review.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/review.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// GET /api/reviews — public
router.get('/', ctrl.getPublicReviews);

// GET /api/reviews/reviewable — client connecté
router.get('/reviewable', authenticate, ctrl.getMyReviewableAppointments);

// POST /api/reviews — client connecté
router.post('/', authenticate, ctrl.createReview);

module.exports = router;

// Charge .env.test AVANT que db.js soit importé par server.js
// Ainsi le pool MySQL se connecte à salon_rdv_test et non à la BDD de prod
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

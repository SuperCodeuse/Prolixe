// server/src/routes/AttributionRoute.js
const express = require('express');
const router = express.Router();
const AttributionController = require('../controllers/AttributionController');

router.get('/', AttributionController.getAttributions);
router.post('/', AttributionController.createAttribution);
router.put('/:id', AttributionController.updateAttribution);
router.delete('/:id', AttributionController.deleteAttribution);

module.exports = router;
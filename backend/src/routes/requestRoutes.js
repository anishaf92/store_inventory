const express = require('express');
const router = express.Router();
const controller = require('../controllers/requestController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.post('/', [verifyToken], controller.createRequest);
router.get('/', [verifyToken], controller.getRequests);
// Only managers/owners/admin can approve or change product request status
router.put('/:id/status', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER', 'ADMIN'])], controller.updateStatus);
router.put('/items/:id/fulfill', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER', 'STORE_KEEPER', 'PROJECT_MANAGER'])], controller.fulfillRequestItem);

// Helper endpoints for scoped stores/sites and PM site creation
router.get('/stores', [verifyToken], controller.getStoresForUser);
router.get('/sites', [verifyToken], controller.getSitesForUser);
router.post('/sites', [verifyToken, checkRole(['PROJECT_MANAGER'])], controller.createSiteByPM);

module.exports = router;

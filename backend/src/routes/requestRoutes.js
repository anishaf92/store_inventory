const express = require('express');
const router = express.Router();
const controller = require('../controllers/requestController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.post('/', [verifyToken], controller.createRequest);
router.get('/', [verifyToken], controller.getRequests);
router.put('/:id/status', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER', 'PROJECT_MANAGER'])], controller.updateStatus);
router.put('/items/:id/fulfill', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER', 'STORE_KEEPER'])], controller.fulfillRequestItem);

module.exports = router;

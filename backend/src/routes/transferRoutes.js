const express = require('express');
const router = express.Router();
const controller = require('../controllers/transferController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.post('/', [verifyToken, checkRole(['STORE_KEEPER'])], controller.createTransfer);
router.get('/', [verifyToken], controller.getTransfers);
router.put('/:id/status', [verifyToken, checkRole(['STORE_KEEPER', 'STORE_MANAGER', 'OWNER'])], controller.updateStatus);
router.put('/:id/acknowledge', [verifyToken, checkRole(['PROJECT_MANAGER'])], controller.acknowledgeTransfer);

module.exports = router;

const express = require('express');
const router = express.Router();
const controller = require('../controllers/inventoryController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.get('/dashboard', [verifyToken], controller.getDashboardStats);
router.get('/items', [verifyToken], controller.getItems);
router.post('/items', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER', 'STORE_KEEPER'])], controller.createItem);
router.get('/categories', [verifyToken], controller.getCategories);
router.post('/categories', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER', 'STORE_KEEPER'])], controller.createCategory);

router.post('/grn', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER', 'STORE_KEEPER'])], controller.processGRN);
router.post('/issue', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER', 'STORE_KEEPER'])], controller.processIssue);

// Edit Permission Routes
router.put('/items/:id', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER', 'STORE_KEEPER'])], controller.updateItem);
router.get('/pending-edits', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER'])], controller.getPendingEdits);
router.put('/pending-edits/:id', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER'])], controller.approveEdit);

module.exports = router;

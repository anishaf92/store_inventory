const express = require('express');
const router = express.Router();
const controller = require('../controllers/inventoryController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.get('/dashboard', [verifyToken], controller.getDashboardStats);
router.get('/items', [verifyToken], controller.getItems);
router.get('/items/:id/distribution', [verifyToken], controller.getItemDistribution);
router.post('/items', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER', 'STORE_KEEPER'])], controller.createItem);
router.get('/categories', [verifyToken], controller.getCategories);
router.post('/categories', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER', 'STORE_KEEPER', 'ADMIN'])], controller.createCategory);
router.put('/categories/:id', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER', 'ADMIN'])], controller.updateCategory);
router.delete('/categories/:id', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER', 'ADMIN'])], controller.deleteCategory);

router.post('/grn', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER', 'STORE_KEEPER', 'ADMIN'])], controller.processGRN);
router.post('/issue', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER', 'STORE_KEEPER', 'ADMIN'])], controller.processIssue);

// Edit Permission Routes
router.put('/items/:id', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER', 'STORE_KEEPER'])], controller.updateItem);
router.get('/pending-edits', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER'])], controller.getPendingEdits);
router.put('/pending-edits/:id', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER'])], controller.approveEdit);

module.exports = router;

const express = require('express');
const router = express.Router();
const controller = require('../controllers/adminController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// All routes here should be protected and only for ADMIN
router.use(verifyToken);
router.use(checkRole(['ADMIN']));

router.get('/users', controller.getAllUsers);
router.post('/users', controller.createUser);
router.put('/users/:id', controller.updateUser);
router.delete('/users/:id', controller.deleteUser);

router.get('/stores', controller.getAllStores);
router.post('/stores', controller.createStore);
router.put('/stores/:id', controller.updateStore);
router.delete('/stores/:id', controller.deleteStore);

router.get('/sites', controller.getAllSites);
router.post('/sites', controller.createSite);
router.put('/sites/:id', controller.updateSite);
router.delete('/sites/:id', controller.deleteSite);

router.post('/system-reset', controller.systemReset);

module.exports = router;

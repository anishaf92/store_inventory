const express = require('express');
const router = express.Router();
const controller = require('../controllers/auditController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.get('/', [verifyToken, checkRole(['OWNER', 'STORE_MANAGER'])], controller.getAuditLogs);

module.exports = router;

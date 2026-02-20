const express = require('express');
const router = express.Router();
const controller = require('../controllers/projectController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.post('/', [verifyToken, checkRole(['OWNER', 'PROJECT_MANAGER'])], controller.createProject);
router.get('/', [verifyToken], controller.getProjects);

module.exports = router;

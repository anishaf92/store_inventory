const express = require('express');
const router = express.Router();
const controller = require('../controllers/projectController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// Only ADMIN and OWNER can create/update projects
router.post('/', [verifyToken, checkRole(['ADMIN', 'OWNER'])], controller.createProject);
router.put('/:id', [verifyToken, checkRole(['ADMIN', 'OWNER'])], controller.updateProject);
router.get('/', [verifyToken], controller.getProjects);
router.get('/:id/sites', [verifyToken], controller.getProjectSites);
// Only Project Manager (for that project), OWNER, or ADMIN can manage sites; PM enforcement is inside the controller
router.post('/:id/sites', [verifyToken, checkRole(['ADMIN', 'OWNER', 'PROJECT_MANAGER'])], controller.createProjectSite);
router.put('/sites/:id', [verifyToken, checkRole(['ADMIN', 'OWNER', 'PROJECT_MANAGER'])], controller.updateProjectSite);

module.exports = router;

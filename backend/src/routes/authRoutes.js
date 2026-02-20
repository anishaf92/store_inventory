const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/signup', controller.signup);
router.post('/signin', controller.signin);

// Example protected route to verify token
router.get('/me', verifyToken, (req, res) => {
    res.send({ message: "You are authenticated", userId: req.userId, role: req.userRole });
});

module.exports = router;

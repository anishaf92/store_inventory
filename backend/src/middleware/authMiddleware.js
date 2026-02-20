const jwt = require('jsonwebtoken');
const db = require('../utils/db');

const verifyToken = (req, res, next) => {
    let token = req.headers['x-access-token'] || req.headers['authorization'];

    if (!token) {
        return res.status(403).send({
            message: 'No token provided!'
        });
    }

    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({
                message: 'Unauthorized!'
            });
        }
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    });
};

const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.userRole) {
            return res.status(403).send({ message: "Role not found in token" });
        }

        if (!roles.includes(req.userRole)) {
            return res.status(403).send({
                message: 'Require ' + roles.join(' or ') + ' Role!'
            });
        }
        next();
    };
};

const authJwt = {
    verifyToken,
    checkRole
};

module.exports = authJwt;

const db = require('../utils/db');
const User = db.User;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.signup = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if email already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).send({ message: "Email is already in use!" });
        }

        const user = await User.create({
            name,
            email,
            password_hash: password, // Model hook will hash this
            role: role ? role.toUpperCase() : 'STORE_KEEPER'
        });

        res.send({ message: "User registered successfully!" });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.signin = async (req, res) => {
    try {
        const user = await User.findOne({
            where: { email: req.body.email },
            include: [{ model: db.StoreNode, as: 'store', attributes: ['name'] }]
        });

        if (!user) {
            return res.status(404).send({ message: "User Not found." });
        }

        const passwordIsValid = await user.validPassword(req.body.password);

        if (!passwordIsValid) {
            return res.status(401).send({
                accessToken: null,
                message: "Invalid Password!"
            });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, store_node_id: user.store_node_id },
            process.env.JWT_SECRET,
            { expiresIn: 86400 } // 24 hours
        );

        res.status(200).send({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            store_node_id: user.store_node_id,
            store_name: user.store?.name || null,
            accessToken: token
        });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

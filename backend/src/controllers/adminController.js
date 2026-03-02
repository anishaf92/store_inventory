const db = require('../utils/db');
const { User, StoreNode, SiteLocation, Project } = db;
const bcrypt = require('bcryptjs');

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            include: [{ model: StoreNode, as: 'store', attributes: ['name'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getAllStores = async (req, res) => {
    try {
        const stores = await StoreNode.findAll({
            order: [['name', 'ASC']]
        });
        res.json(stores);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getAllSites = async (req, res) => {
    try {
        const sites = await SiteLocation.findAll({
            include: [{ model: StoreNode, as: 'store', attributes: ['name'] }],
            order: [['name', 'ASC']]
        });
        res.json(sites);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getAllProjects = async (req, res) => {
    try {
        const projects = await Project.findAll({
            // Use legacy store alias to match association in db.js
            include: [{ model: StoreNode, as: 'store_legacy', attributes: ['id', 'name', 'code'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role, store_node_id } = req.body;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) return res.status(400).json({ message: "Email already exists" });

        const user = await User.create({
            name,
            email,
            password_hash: password, // Model hook handles hashing
            role,
            store_node_id: store_node_id || null
        });

        res.status(201).json({ message: "User created successfully", user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.createStore = async (req, res) => {
    try {
        const store = await StoreNode.create(req.body);
        res.status(201).json(store);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.createSite = async (req, res) => {
    try {
        const site = await SiteLocation.create(req.body);
        res.status(201).json(site);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, store_node_id } = req.body;
        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: "User not found" });

        await user.update({ name, email, role, store_node_id: store_node_id || null });
        res.json({ message: "User updated successfully", user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.id === req.userId) return res.status(400).json({ message: "Cannot delete yourself" });

        // don't allow removal of the last remaining ADMIN account
        if (user.role === 'ADMIN') {
            const adminCount = await User.count({ where: { role: 'ADMIN' } });
            if (adminCount <= 1) {
                return res.status(400).json({ message: "Cannot delete the last administrator" });
            }
        }

        await user.destroy();
        res.json({ message: "User deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateStore = async (req, res) => {
    try {
        const { id } = req.params;
        const store = await StoreNode.findByPk(id);
        if (!store) return res.status(404).json({ message: "Store not found" });

        await store.update(req.body);
        res.json(store);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteStore = async (req, res) => {
    try {
        const { id } = req.params;
        const store = await StoreNode.findByPk(id);
        if (!store) return res.status(404).json({ message: "Store not found" });

        await store.destroy();
        res.json({ message: "Store deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateSite = async (req, res) => {
    try {
        const { id } = req.params;
        const site = await SiteLocation.findByPk(id);
        if (!site) return res.status(404).json({ message: "Site not found" });

        await site.update(req.body);
        res.json(site);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteSite = async (req, res) => {
    try {
        const { id } = req.params;
        const site = await SiteLocation.findByPk(id);
        if (!site) return res.status(404).json({ message: "Site not found" });

        await site.destroy();
        res.json({ message: "Site deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateProjectStore = async (req, res) => {
    try {
        const { id } = req.params; // project id
        const { store_node_id } = req.body;

        const project = await Project.findByPk(id);
        if (!project) return res.status(404).json({ message: "Project not found" });

        if (store_node_id) {
            const store = await StoreNode.findByPk(store_node_id);
            if (!store) return res.status(400).json({ message: "Store not found" });
        }

        await project.update({ store_node_id: store_node_id || null });

        // Keep project sites tied to the same node-store mapping.
        await SiteLocation.update(
            { store_node_id: store_node_id || null },
            { where: { project_id: id } }
        );

        res.json({ message: "Project store mapping updated", project });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.systemReset = async (req, res) => {
    try {
        // High risk: Truncate operational tables and clean up users.
        // Order matters for FKs.
        await db.sequelize.query('SET session_replication_role = replica;');

        const tables = ['transfers', 'request_items', 'requests', 'inventory_transactions', 'inventory', 'pending_edits', 'audit_logs', 'site_locations', 'store_nodes', 'projects', 'items', 'categories'];
        for (const table of tables) {
            await db.sequelize.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`);
        }

        await db.sequelize.query('SET session_replication_role = DEFAULT;');

        // Remove all non-admin users while keeping ADMIN accounts (including the one performing the reset)
        await db.sequelize.query(`DELETE FROM users WHERE role <> 'ADMIN';`);

        res.json({ message: "System cleared successfully. All non-admin users removed. Please refresh the page." });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const db = require('../utils/db');
const Item = db.Item;
const Category = db.Category;
const inventoryService = require('../services/inventoryService');
const { Op } = require('sequelize');

exports.getItems = async (req, res) => {
    try {
        const items = await Item.findAll({ include: Category });
        res.json(items);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.createItem = async (req, res) => {
    try {
        // RBAC: Only Owner or Store Manager can create items directly? 
        // Or Store Keeper can create but needs approval?
        // prompt says: "Store Keeper must see a dashboard... allow Store Keeper to raise a Purchase Requisition... Edit Permission logic where Store Keeper needs Manager's digital approval to modify existing records."
        // It doesn't explicitly restrict creation, but let's assume Manager/Owner mainly.
        // For now, allow logged in users but maybe restricted.

        // We'll trust the route middleware for role checking.
        const { name, category_id, grade, make, unit, specifications, low_stock_threshold, initial_stock } = req.body;
        const stockValue = parseInt(initial_stock) || 0;

        const item = await Item.create({
            name,
            category_id,
            grade,
            make,
            unit,
            specifications,
            low_stock_threshold,
            current_stock: stockValue
        });

        // Audit item creation
        await db.AuditLog.create({
            table_name: 'items',
            record_id: item.id,
            action: 'INSERT',
            performed_by: req.userId,
            new_values: item.toJSON()
        });

        // Record Initial Stock Transaction
        if (stockValue > 0) {
            await db.InventoryTransaction.create({
                type: 'GRN',
                item_id: item.id,
                quantity: stockValue,
                reference_id: 'INITIAL_STOCK',
                performed_by: req.userId
            });
        }

        res.send(item);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const category = await Category.create(req.body);

        // Audit category creation
        await db.AuditLog.create({
            table_name: 'categories',
            record_id: category.id,
            action: 'INSERT',
            performed_by: req.userId,
            new_values: category.toJSON()
        });

        res.send(category);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.findAll();
        res.json(categories);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.processGRN = async (req, res) => {
    try {
        const { itemId, quantity, referenceId } = req.body;
        const result = await inventoryService.processTransaction('GRN', itemId, quantity, referenceId, req.userId);
        res.send({ message: "Stock Updated (GRN)", result });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.processIssue = async (req, res) => {
    try {
        const { itemId, quantity, referenceId } = req.body;
        // In a real app, we might need to check if there is an approved Request first.
        const result = await inventoryService.processTransaction('ISSUE', itemId, quantity, referenceId, req.userId);
        res.send({ message: "Stock Updated (Issue)", result });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userRole = req.userRole;

        if (userRole === 'STORE_KEEPER') {
            // Create Pending Edit
            const pendingEdit = await db.PendingEdit.create({
                table_name: 'items',
                record_id: id,
                proposed_changes: updates,
                requested_by: req.userId,
                status: 'PENDING'
            });
            return res.status(202).send({ message: "Edit request submitted for approval", pendingEdit });
        } else {
            // Manager/Owner - Update Directly
            const item = await Item.findByPk(id);
            if (!item) return res.status(404).send({ message: "Item not found" });

            const oldValues = item.toJSON();
            await item.update(updates);

            // Audit
            await db.AuditLog.create({
                table_name: 'items',
                record_id: id,
                action: 'UPDATE',
                performed_by: req.userId,
                old_values: oldValues,
                new_values: item.toJSON()
            });

            return res.send({ message: "Item updated successfully", item });
        }
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.getPendingEdits = async (req, res) => {
    try {
        const edits = await db.PendingEdit.findAll({
            where: { status: 'PENDING' },
            include: [{ model: db.User, as: 'requester', attributes: ['name'] }]
        });
        res.send(edits);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.approveEdit = async (req, res) => {
    try {
        const { id } = req.params; // PendingEdit ID
        const { action } = req.body; // APPROVED or REJECTED

        const edit = await db.PendingEdit.findByPk(id);
        if (!edit) return res.status(404).send({ message: "Edit request not found" });

        if (action === 'REJECTED') {
            await edit.update({ status: 'REJECTED' });
            return res.send({ message: "Edit request rejected" });
        }

        if (action === 'APPROVED') {
            if (edit.table_name === 'items') {
                const item = await Item.findByPk(edit.record_id);
                if (item) {
                    const oldValues = item.toJSON();
                    await item.update(edit.proposed_changes);

                    // Audit
                    await db.AuditLog.create({
                        table_name: 'items',
                        record_id: item.id,
                        action: 'UPDATE',
                        performed_by: req.userId, // Manager who approved
                        old_values: oldValues,
                        new_values: item.toJSON()
                    });
                }
            }
            await edit.update({ status: 'APPROVED' });
            return res.send({ message: "Edit request approved and applied" });
        }
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};
exports.getDashboardStats = async (req, res) => {
    try {
        const user = await db.User.findByPk(req.userId);
        const role = user.role;

        const stats = {};

        if (role === 'PROJECT_MANAGER') {
            // PM specific stats
            stats.totalProjects = await db.Project.count();
            stats.myRequests = await db.Request.count({
                where: { requester_id: req.userId }
            });
            stats.pendingApprovals = await db.Request.count({
                where: { requester_id: req.userId, status: 'PENDING' }
            });
            // Still show some activity but filtered if needed? For now global or specific.
        } else {
            // Global stats for Manager/Owner/Keeper
            stats.lowStock = await Item.count({
                where: {
                    current_stock: { [Op.lt]: db.sequelize.col('low_stock_threshold') }
                }
            });
            stats.pendingRequests = await db.Request.count({
                where: { status: 'PENDING' }
            });
            stats.totalItems = await Item.count();
        }

        stats.recentActivity = await db.InventoryTransaction.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            include: [{ model: Item, attributes: ['name', 'unit'] }]
        });

        res.json(stats);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
};

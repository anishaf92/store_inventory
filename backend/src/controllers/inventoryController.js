const db = require('../utils/db');
const Item = db.Item;
const Category = db.Category;
const inventoryService = require('../services/inventoryService');
const { Op } = require('sequelize');

exports.getItems = async (req, res) => {
    try {
        const storeNodeId = req.storeNodeId;
        const whereClause = storeNodeId ? { store_node_id: storeNodeId } : {};

        // Fetch Items and their inventory balance at the given store
        const items = await Item.findAll({
            include: [
                Category,
                {
                    model: db.Inventory,
                    required: false, // LEFT JOIN
                    where: whereClause
                }
            ]
        });
        res.json(items);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.createItem = async (req, res) => {
    try {
        const { item_code, name, category_id, grade, make, unit, specifications, low_stock_threshold, initial_stock } = req.body;
        const stockValue = parseInt(initial_stock) || 0;
        const storeNodeId = req.storeNodeId;

        // Check if item_code is unique
        const existingCode = await Item.findOne({ where: { item_code } });
        if (existingCode) return res.status(400).send({ message: 'Item code must be unique' });

        const item = await Item.create({
            item_code,
            name,
            category_id,
            grade,
            make,
            unit,
            specifications,
            low_stock_threshold
        });

        // Audit item creation
        await db.AuditLog.create({
            table_name: 'items',
            record_id: item.id,
            action: 'INSERT',
            performed_by: req.userId,
            new_values: item.toJSON()
        });

        // Record Initial Stock Transaction (if applicable)
        if (stockValue > 0 && storeNodeId) {
            await inventoryService.processGRN(storeNodeId, item.id, stockValue, 'INITIAL_STOCK', req.userId);
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

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findByPk(id);
        if (!category) return res.status(404).send({ message: "Category not found" });

        await category.update(req.body);
        res.send(category);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findByPk(id);
        if (!category) return res.status(404).send({ message: "Category not found" });

        await category.destroy();
        res.send({ message: "Category deleted" });
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
        const { itemId, quantity, invoiceNumber, store_node_id, storeNodeId: storeNodeIdAlt } = req.body;
        let storeNodeId = req.storeNodeId || store_node_id || storeNodeIdAlt;

        // If token is stale/missing store mapping, resolve from current user record.
        if (!storeNodeId && req.userId) {
            const user = await db.User.findByPk(req.userId, { attributes: ['store_node_id'] });
            if (user && user.store_node_id) {
                storeNodeId = user.store_node_id;
            }
        }

        // Fallback for global roles/users without token store mapping:
        // infer store from existing base-store inventory row for the same item.
        if (!storeNodeId) {
            const candidates = await db.Inventory.findAll({
                where: { item_id: itemId, site_location_id: null },
                attributes: ['store_node_id'],
                group: ['store_node_id']
            });

            if (candidates.length === 1) {
                storeNodeId = candidates[0].store_node_id;
            } else if (candidates.length > 1) {
                return res.status(400).send({ message: "Multiple stores found for item. Assign a store to user before GRN." });
            }
        }

        // Keeper fallback: infer from their latest request with a store mapping.
        if (!storeNodeId && req.userRole === 'STORE_KEEPER') {
            const latestRequest = await db.Request.findOne({
                where: { requester_id: req.userId },
                attributes: ['store_node_id'],
                order: [['createdAt', 'DESC']]
            });
            if (latestRequest && latestRequest.store_node_id) {
                storeNodeId = latestRequest.store_node_id;
            }
        }

        // Final safe fallback: if system has exactly one store, use it.
        if (!storeNodeId) {
            const allStores = await db.StoreNode.findAll({ attributes: ['id'] });
            if (allStores.length === 1) {
                storeNodeId = allStores[0].id;
            }
        }

        if (!storeNodeId) return res.status(403).send({ message: "Store assignment required for GRN" });

        const result = await inventoryService.processGRN(storeNodeId, itemId, quantity, invoiceNumber, req.userId);
        res.send({ message: "Stock Updated (GRN)", result });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.processIssue = async (req, res) => {
    try {
        const { itemId, quantity, referenceId, siteLocationId } = req.body;
        const storeNodeId = req.storeNodeId;

        if (!storeNodeId) return res.status(403).send({ message: "Store assignment required for Issues" });

        const result = await inventoryService.processIssue(storeNodeId, siteLocationId, itemId, quantity, referenceId, req.userId);
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
        const storeNodeId = user.store_node_id;

        if (role === 'PROJECT_MANAGER') {
            stats.totalProjects = await db.Project.count();
            stats.myRequests = await db.Request.count({
                where: { requester_id: req.userId }
            });
            stats.pendingApprovals = await db.Request.count({
                where: { requester_id: req.userId, status: 'PENDING' }
            });
        } else {
            // Global or Store-specific stats
            const inventoryWhere = storeNodeId ? { store_node_id: storeNodeId } : {};

            // Total unique items in the catalog (or available in store)
            if (storeNodeId) {
                stats.totalItems = await db.Inventory.count({
                    distinct: true,
                    col: 'item_id',
                    where: inventoryWhere
                });
            } else {
                stats.totalItems = await Item.count();
            }

            stats.pendingRequests = await db.Request.count({
                where: {
                    status: 'PENDING',
                    ...(storeNodeId ? { store_node_id: storeNodeId } : {})
                }
            });

            // Low Stock Calculation
            // We need to compare Item.low_stock_threshold with SUM(Inventory.current_stock)
            const lowStockItems = await Item.findAll({
                include: [{
                    model: db.Inventory,
                    attributes: [],
                    where: inventoryWhere,
                    required: true
                }],
                attributes: [
                    'id',
                    'low_stock_threshold',
                    [db.sequelize.fn('SUM', db.sequelize.col('Inventories.current_stock')), 'total_stock']
                ],
                group: ['Item.id'],
                having: db.sequelize.literal(`SUM("Inventories"."current_stock") < "Item"."low_stock_threshold"`)
            });
            stats.lowStock = lowStockItems.length;
        }

        const activityWhere = storeNodeId ? { store_node_id: storeNodeId } : {};
        stats.recentActivity = await db.InventoryTransaction.findAll({
            where: activityWhere,
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

exports.getItemDistribution = async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = req.userRole;
        const storeNodeId = req.storeNodeId;

        // Scope visibility for store-scoped roles:
        // - Store Keepers/Managers should only see distribution within their own store node.
        // - Other roles (ADMIN/OWNER/PM) can see the full distribution.
        const whereClause = {
            item_id: id,
            ...(((userRole === 'STORE_KEEPER' || userRole === 'STORE_MANAGER') && storeNodeId)
                ? { store_node_id: storeNodeId }
                : {})
        };

        const distribution = await db.Inventory.findAll({
            where: whereClause,
            include: [
                { model: db.StoreNode, as: 'store', attributes: ['id', 'name', 'code'] },
                { model: db.SiteLocation, as: 'site', attributes: ['id', 'name', 'code'] }
            ],
            attributes: ['current_stock', 'reserved_stock']
        });
        res.json(distribution);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

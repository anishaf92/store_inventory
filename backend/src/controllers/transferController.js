const db = require('../utils/db');
const Transfer = db.Transfer;
const SiteLocation = db.SiteLocation;
const Request = db.Request;
const Inventory = db.Inventory;

exports.createTransfer = async (req, res) => {
    try {
        const { site_location_id, item_id, quantity, notes, request_id } = req.body;
        const storeNodeId = req.storeNodeId; // From JWT Auth Middleware

        // Must belong to a store
        if (!storeNodeId) {
            return res.status(403).send({ message: "Store assignment is required to initiate a transfer." });
        }

        // Validate Site
        const site = await SiteLocation.findByPk(site_location_id);
        if (!site) return res.status(404).send({ message: "Site Location not found." });
        if (site.store_node_id !== storeNodeId) {
            return res.status(403).send({ message: "You can only transfer to Site Locations assigned to your Store." });
        }

        // Validate Stock
        const inventory = await Inventory.findOne({
            where: { store_node_id: storeNodeId, item_id, site_location_id: null }
        });

        if (!inventory || inventory.current_stock < quantity) {
            return res.status(400).send({ message: `Insufficient stock for item. Available: ${inventory ? inventory.current_stock : 0}` });
        }

        const transfer = await Transfer.create({
            store_node_id: storeNodeId,
            site_location_id,
            item_id,
            quantity,
            initiated_by: req.userId,
            notes,
            request_id: request_id || null, // Optional link to a TRANSFER_REQUEST
            status: 'PENDING'
        });

        res.status(201).send({ message: "Transfer initiated.", transfer });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.getTransfers = async (req, res) => {
    try {
        const storeNodeId = req.storeNodeId;
        const where = {};

        // Scope Store Keeper to their store
        if (req.userRole === 'STORE_KEEPER') {
            if (!storeNodeId) return res.status(403).send({ message: "Store assignment required." });
            where.store_node_id = storeNodeId;
        }

        const transfers = await Transfer.findAll({
            where,
            include: [
                { model: db.Item, attributes: ['name', 'item_code', 'unit'] },
                { model: SiteLocation, as: 'site', attributes: ['name', 'code'] },
                { model: db.User, as: 'initiator', attributes: ['name'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(transfers);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // e.g., 'IN_TRANSIT', 'COMPLETED'

        const transfer = await Transfer.findByPk(id);
        if (!transfer) return res.status(404).send({ message: "Transfer not found." });

        if (req.userRole === 'STORE_KEEPER') {
            if (transfer.store_node_id !== req.storeNodeId) {
                return res.status(403).send({ message: "You can only update transfers originating from your store." });
            }
        }

        // State Machine logic (simplified MVP)
        let finalStatus = status;

        // If completed, deduct stock
        if (status === 'COMPLETED' && transfer.status !== 'COMPLETED') {
            // Deduct stock via service to create auditing records
            const inventoryService = require('../services/inventoryService');
            try {
                // Deduct from store, move to site. 
                // For MVP, "processIssue" handles deduction.
                await inventoryService.processIssue(
                    transfer.store_node_id,
                    transfer.site_location_id,
                    transfer.item_id,
                    transfer.quantity,
                    `TX-${transfer.id.slice(0, 8)}`,
                    req.userId
                );
            } catch (inventoryError) {
                return res.status(400).send({ message: `Could not complete transfer: ${inventoryError.message}` });
            }

            await transfer.update({
                status: 'COMPLETED',
                completed_by: req.userId
            });

            return res.send({ message: "Transfer marked as completed and inventory deducted.", transfer });
        }

        await transfer.update({ status: finalStatus });
        res.send({ message: `Transfer status updated to ${finalStatus}`, transfer });

    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.acknowledgeTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        const transfer = await Transfer.findByPk(id, { include: [SiteLocation] });

        if (!transfer) return res.status(404).send({ message: "Transfer not found." });
        if (transfer.status !== 'COMPLETED') {
            return res.status(400).send({ message: "Transfer must be marked COMPLETED by store before acknowledgement." });
        }

        // PM logic
        if (req.userRole === 'PROJECT_MANAGER' && transfer.SiteLocation.created_by !== req.userId) {
            return res.status(403).send({ message: "You can only acknowledge transfers to your own sites." });
        }

        await transfer.update({
            pm_acknowledged: true,
            pm_acknowledged_at: new Date()
        });

        res.send({ message: "Transfer acknowledged.", transfer });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

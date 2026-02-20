const db = require('../utils/db');
const Request = db.Request;
const RequestItem = db.RequestItem;
const Item = db.Item;
const User = db.User;
const Project = db.Project;
const inventoryService = require('../services/inventoryService');

exports.createRequest = async (req, res) => {
    try {
        const { type, project_id, required_date, items } = req.body;
        const user = await db.User.findByPk(req.userId);

        if (type === 'PR' && (user.role === 'STORE_MANAGER' || user.role === 'OWNER')) {
            return res.status(403).send({ message: "Managers cannot create Purchase Requisitions directly. They can only approve/reject." });
        }

        const newRequest = await Request.create({
            type, // MR or PR
            requester_id: req.userId,
            project_id,
            required_date,
            // MRs from PMs start as REQUESTED; they don't need manager approval.
            // PRs start as PENDING (awaiting manager approval).
            status: (type === 'MR' && user.role === 'PROJECT_MANAGER') ? 'REQUESTED' : 'PENDING'
        });

        if (items && items.length > 0) {
            const requestItems = items.map(item => ({
                request_id: newRequest.id,
                item_id: item.item_id || null,
                custom_item_name: item.custom_item_name || null,
                quantity: item.quantity
            }));
            await RequestItem.bulkCreate(requestItems);
        }

        res.status(201).send({ message: "Request created successfully", request: newRequest });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.getRequests = async (req, res) => {
    try {
        const { type, status } = req.query;
        const where = {};
        if (type) where.type = type;
        if (status) where.status = status;

        // If Store Keeper, show all MRs (to fulfill) and PRs (they raised).
        // If PM, show MRs they raised.
        // If Manager/Owner, show everything.

        // precise filtering can be added later, for now return all based on filters.

        const requests = await Request.findAll({
            where,
            include: [
                { model: User, as: 'requester', attributes: ['id', 'name', 'role'] },
                { model: RequestItem, include: [Item] },
                { model: Project, attributes: ['reference_number', 'location'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.send(requests);

    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const request = await Request.findByPk(id);
        if (!request) {
            return res.status(404).send({ message: "Request not found" });
        }

        const user = await db.User.findByPk(req.userId);

        // Logic check: Manager approves PR -> status becomes IN_PROGRESS
        let finalStatus = status;
        if (request.type === 'PR' && status === 'APPROVED') {
            finalStatus = 'IN_PROGRESS';
        }

        // Restriction check: Only Keeper can mark as ITEM_ADDED (usually after receiving goods)
        if (status === 'ITEM_ADDED' && user.role !== 'STORE_KEEPER') {
            return res.status(403).send({ message: "Only Store Keepers can mark items as added." });
        }

        await request.update({ status: finalStatus });
        res.send({ message: `Request status updated to ${finalStatus}`, request });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.fulfillRequestItem = async (req, res) => {
    try {
        const { id } = req.params; // RequestItem ID
        const { action } = req.body; // 'ISSUE' or 'PROCUREMENT'

        const requestItem = await RequestItem.findByPk(id, { include: [Request, Item] });
        if (!requestItem) return res.status(404).send({ message: "Request Item not found" });

        if (action === 'ISSUE') {
            const qtyToIssue = requestItem.quantity - requestItem.issued_quantity;

            // Check Stock (Only if it's a real item)
            if (requestItem.item_id) {
                const item = await Item.findByPk(requestItem.item_id);
                if (item.current_stock < qtyToIssue) {
                    return res.status(400).send({ message: `Insufficient stock. Current: ${item.current_stock}, Needed: ${qtyToIssue}` });
                }
            }

            // Deduct Stock (Only if it's a real item)
            if (requestItem.item_id) {
                await inventoryService.processTransaction(
                    'ISSUE',
                    requestItem.item_id,
                    qtyToIssue,
                    `REQ-${requestItem.Request.id.slice(0, 8)}`,
                    req.userId
                );
            } else {
                // For custom items, we assume they are being issued from some ad-hoc stock or just marked done.
                // In a real app, we might force linking to a real item first. 
                // For MVP, we just allow "issuing" it (essentially closing the line item).
            }

            // Update Item Status
            await requestItem.update({
                issued_quantity: requestItem.quantity,
                status: 'ISSUED'
            });

            // If this item was linked to a parent MR, fulfill the parent as well
            if (requestItem.parent_item_id) {
                const parentItem = await RequestItem.findByPk(requestItem.parent_item_id);
                if (parentItem) {
                    await parentItem.update({
                        issued_quantity: parentItem.quantity,
                        status: 'ISSUED'
                    });

                    // Update parent MR status: PARTIALLY_FULFILLED or FULFILLED
                    const parentAllItems = await RequestItem.findAll({ where: { request_id: parentItem.request_id } });
                    const parentAllIssued = parentAllItems.every(i => i.status === 'ISSUED');
                    const parentSomeIssued = parentAllItems.some(i => i.status === 'ISSUED');
                    const parentStatus = parentAllIssued ? 'FULFILLED' : (parentSomeIssued ? 'PARTIALLY_FULFILLED' : null);
                    if (parentStatus) {
                        await Request.update({ status: parentStatus }, { where: { id: parentItem.request_id } });
                    }
                }
            }

        } else if (action === 'PROCUREMENT' || action === 'PROCURE_CONVERT') {
            if (action === 'PROCURE_CONVERT') {
                const { category_id, unit } = req.body;
                if (!category_id) {
                    return res.status(400).send({ message: "Category is required to add custom item to inventory." });
                }

                if (!requestItem.custom_item_name) {
                    return res.status(400).send({ message: "Item name is missing. Cannot convert to inventory." });
                }

                // Create the real item
                const newItem = await Item.create({
                    name: requestItem.custom_item_name,
                    category_id: category_id,
                    unit: unit || 'pcs',
                    current_stock: 0,
                    low_stock_threshold: 10 // Default
                });

                // Update the request item to point to this new real item
                await requestItem.update({
                    item_id: newItem.id,
                    status: 'NEEDS_PROCUREMENT'
                });
            } else {
                await requestItem.update({ status: 'NEEDS_PROCUREMENT' });
            }

            // Automatically create a PR linked to this item if it doesn't already have one
            // ONLY if the parent request is NOT already a PR
            if (requestItem.Request.type === 'MR') {
                const pr = await Request.create({
                    type: 'PR',
                    requester_id: req.userId,
                    project_id: requestItem.Request.project_id,
                    required_date: requestItem.Request.required_date,
                    status: 'PENDING'
                });

                await RequestItem.create({
                    request_id: pr.id,
                    item_id: requestItem.item_id,
                    custom_item_name: requestItem.custom_item_name,
                    quantity: requestItem.quantity,
                    parent_item_id: requestItem.id // Link back to original MR item
                });
            }
        }

        // Update request status: PARTIALLY_FULFILLED or FULFILLED based on items
        const allItems = await RequestItem.findAll({ where: { request_id: requestItem.request_id } });
        const allIssued = allItems.every(i => i.status === 'ISSUED');
        const someIssued = allItems.some(i => i.status === 'ISSUED');

        if (allIssued) {
            await Request.update({ status: 'FULFILLED' }, { where: { id: requestItem.request_id } });
        } else if (someIssued) {
            await Request.update({ status: 'PARTIALLY_FULFILLED' }, { where: { id: requestItem.request_id } });
        }

        res.send({ message: "Item updated", requestItem });

    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
};

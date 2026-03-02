const db = require('../utils/db');
const Request = db.Request;
const RequestItem = db.RequestItem;
const Item = db.Item;
const User = db.User;
const Project = db.Project;
const inventoryService = require('../services/inventoryService');

exports.createRequest = async (req, res) => {
    try {
        const { type, project_id, required_date, items, site_location_id, store_node_id } = req.body;
        const user = await db.User.findByPk(req.userId);
        const userRole = user.role;

        // Role validations
        // PM: can only raise MR (Material Requisition)
        if (type === 'MR' && userRole !== 'PROJECT_MANAGER') {
            return res.status(403).send({ message: "Only Project Managers can raise MR requests." });
        }
        // Store Keeper: can raise PR_STORE (store purchase) and TRANSFER_REQUEST
        if (type === 'PR_STORE' && userRole !== 'STORE_KEEPER') {
            return res.status(403).send({ message: "Only Store Keepers can raise PR_STORE requests." });
        }
        if (type === 'TRANSFER_REQUEST' && userRole !== 'STORE_KEEPER') {
            return res.status(403).send({ message: "Only Store Keepers can raise TRANSFER_REQUEST." });
        }
        // Direct PRs are system-generated from MR; block manual PR creation
        if (type === 'PR') {
            return res.status(400).send({ message: "Direct PR requests are system generated from MR. Users cannot raise PR directly." });
        }

        // Determine destination and source nodes
        // Keepers can explicitly pick source store from UI; fallback to their assigned store.
        let resolvedStoreId = ['PR_STORE', 'TRANSFER_REQUEST'].includes(type)
            ? (store_node_id || user.store_node_id)
            : store_node_id;
        const resolvedSiteId = ['MR', 'PR', 'TRANSFER_REQUEST'].includes(type) ? site_location_id : null;

        // Project-centric store resolution for MR / PR:
        // If a project is selected and we don't yet know the store, create/link a dedicated StoreNode based on the project's ProjectStore.
        let project = null;
        let projectStore = null;
        if (project_id) {
            project = await db.Project.findByPk(project_id, {
                include: [{ model: db.ProjectStore, as: 'project_store' }]
            });
            if (!project) {
                return res.status(400).send({ message: "Selected project is invalid." });
            }
            projectStore = project.project_store || null;

            if (!resolvedStoreId) {
                if (project.store_node_id) {
                    resolvedStoreId = project.store_node_id;
                } else {
                    // Create a backing StoreNode for this project's dedicated store (legacy layer kept internal)
                    const storePayload = {
                        name: (projectStore && projectStore.name) || `Store for ${project.reference_number || 'Project'}`,
                        code: (projectStore && projectStore.code) || null,
                        location: (projectStore && projectStore.location) || project.location || null
                    };
                    const backingStore = await db.StoreNode.create(storePayload);
                    await project.update({ store_node_id: backingStore.id });
                    resolvedStoreId = backingStore.id;
                }
            }
        }

        // Site-first resolution: when a site is selected, derive/validate the linked store node.
        if (resolvedSiteId) {
            const site = await db.SiteLocation.findByPk(resolvedSiteId);
            if (!site) {
                return res.status(400).send({ message: "Selected site is invalid." });
            }
            // Ensure site belongs to the selected project when provided
            if (project && site.project_id && site.project_id !== project_id) {
                return res.status(400).send({ message: "Selected site does not belong to the selected project." });
            }

            // If site has no store mapping, attach it to the project's backing store (if available)
            if (!site.store_node_id) {
                if (resolvedStoreId) {
                    site.store_node_id = resolvedStoreId;
                    await site.save();
                } else {
                    return res.status(400).send({ message: "Selected site has no associated store. Please contact Admin." });
                }
            }

            if (!resolvedStoreId) {
                resolvedStoreId = site.store_node_id;
            } else if (resolvedStoreId !== site.store_node_id) {
                return res.status(400).send({ message: "Selected site belongs to a different store." });
            }
        }

        if (!resolvedStoreId) return res.status(400).send({ message: "Store Node ID is required." });
        const storeExists = await db.StoreNode.findByPk(resolvedStoreId);
        if (!storeExists) {
            return res.status(400).send({ message: "Selected store is invalid. Please choose a valid store." });
        }
        if (['MR', 'PR', 'TRANSFER_REQUEST'].includes(type) && !resolvedSiteId) {
            return res.status(400).send({ message: "Site Location ID is required for this request type." });
        }

        // Status logic
        let initialStatus = 'PENDING';
        if (type === 'MR' || type === 'TRANSFER_REQUEST') {
            initialStatus = 'REQUESTED'; // Direct action needed from Keeper
        }

        const newRequest = await Request.create({
            type,
            initiated_by_role: userRole,
            requester_id: req.userId,
            project_id: project_id || null,
            store_node_id: resolvedStoreId,
            site_location_id: resolvedSiteId,
            required_date,
            status: initialStatus
        });

        if (items && items.length > 0) {
            const requestItems = items.map(item => ({
                request_id: newRequest.id,
                item_id: item.item_id || null,
                custom_item_name: item.custom_item_name || null,
                category_id: item.category_id || null,
                specifications: item.specifications || {},
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
        const { type, status, project_id } = req.query;
        const where = {};
        if (type) where.type = type;
        if (status) where.status = status;
        if (project_id) where.project_id = project_id;

        const userRole = req.userRole;

        // PM Scoping Rule: PMs can ONLY see requests they personally created or linked to their own projects.
        if (userRole === 'PROJECT_MANAGER') {
            where.requester_id = req.userId;
        }
        // STORE_MANAGER sees requests from all stores (no store filter).
        // STORE_KEEPER scoping is applied after fetch so we can also include
        // MR/PR linked to projects where they are the assigned store keeper.

        const requests = await Request.findAll({
            where,
            include: [
                { model: User, as: 'requester', attributes: ['id', 'name', 'role'] },
                { model: RequestItem, include: [Item, db.Category] },
                { model: Project, attributes: ['reference_number', 'location', 'store_keeper_id'] },
                { model: db.SiteLocation, as: 'site', attributes: ['name', 'code'] },
                { model: db.StoreNode, as: 'store', attributes: ['name', 'code'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Post-filter for STORE_KEEPER:
        // - Requests where store_node_id matches their assigned store
        // - OR requests whose project has them as the assigned store keeper
        let scoped = requests;

        if (userRole === 'STORE_KEEPER') {
            const keeperStoreId = req.storeNodeId;
            const keeperId = req.userId;
            scoped = requests.filter(r => {
                const storeMatch = keeperStoreId && r.store_node_id === keeperStoreId;
                const projectMatch = r.Project && r.Project.store_keeper_id === keeperId;
                if (!storeMatch && !projectMatch) return false;

                // Hide requests that have been fully acknowledged by PM:
                // if all items are RECEIVED or COMPLETED, keeper doesn't need to see them anymore.
                const items = r.RequestItems || [];
                const hasOpenItems = items.some(ri => !['RECEIVED', 'COMPLETED'].includes(ri.status));
                return hasOpenItems;
            });
        } else if (userRole === 'STORE_MANAGER') {
            // Purchase/Store Manager: don't show MR (only PR/PR_STORE/TRANSFER_REQUEST etc.)
            scoped = requests.filter(r => r.type !== 'MR');
        }

        res.send(scoped);

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

        // Logic check: Manager approves PR/PR_STORE -> status becomes IN_PROGRESS
        let finalStatus = status;
        if ((request.type === 'PR' || request.type === 'PR_STORE') && status === 'APPROVED') {
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
        const { action, invoice_number } = req.body; // action plus optional invoice_number for GRN

        const requestItem = await RequestItem.findByPk(id, { include: [Request, Item] });
        if (!requestItem) return res.status(404).send({ message: "Request Item not found" });

        if (action === 'ISSUE') {
            const qtyToIssue = requestItem.quantity - requestItem.issued_quantity;
            if (qtyToIssue <= 0) {
                return res.status(400).send({ message: "Item is already fully processed." });
            }

            // Check Stock (Only if it's a real item)
            if (requestItem.item_id) {
                const storeNodeId = requestItem.Request.store_node_id || req.storeNodeId;
                const currentStock = await inventoryService.getStockForStore(storeNodeId, requestItem.item_id);

                // For PR flow, keeper confirms receipt and issue in one action.
                // This does NOT run on manager approval; it only runs when fulfill action is called.
                if (requestItem.Request.type === 'PR' && requestItem.issued_quantity === 0) {
                    const invoiceNumber = invoice_number || `RECV-${requestItem.Request.id.slice(0, 8)}`;
                    await inventoryService.processGRN(
                        storeNodeId,
                        requestItem.item_id,
                        qtyToIssue,
                        invoiceNumber,
                        req.userId
                    );
                } else if (currentStock < qtyToIssue) {
                    return res.status(400).send({ message: `Insufficient stock in store. Current: ${currentStock}, Needed: ${qtyToIssue}` });
                }
            }

            // Deduct Stock (Only if it's a real item)
            if (requestItem.item_id) {
                // Determine store scoping
                const storeNodeId = requestItem.Request.store_node_id || req.storeNodeId;
                if (!storeNodeId) {
                    return res.status(400).send({ message: "Cannot determine store_node_id for issue." });
                }

                await inventoryService.processIssue(
                    storeNodeId,
                    requestItem.Request.site_location_id,
                    requestItem.item_id,
                    qtyToIssue,
                    `REQ-${requestItem.Request.id.slice(0, 8)}`,
                    req.userId
                );
            } else {
                // Custom item bypass
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

        } else if (action === 'RECEIVE') {
            const qtyToReceive = requestItem.quantity - requestItem.issued_quantity;
            if (qtyToReceive <= 0) {
                return res.status(400).send({ message: "Item is already fully received." });
            }
            if (!requestItem.item_id) {
                return res.status(400).send({ message: "Cannot receive custom item. Convert to inventory first." });
            }

            const storeNodeId = requestItem.Request.store_node_id || req.storeNodeId;
            if (!storeNodeId) {
                return res.status(400).send({ message: "Store Node ID is missing." });
            }

            // Process GRN (Adds stock)
            const invoiceNumber = invoice_number || `RECV-${requestItem.Request.id.slice(0, 8)}`;
            await inventoryService.processGRN(
                storeNodeId,
                requestItem.item_id,
                qtyToReceive,
                invoiceNumber,
                req.userId
            );

            // Update Item Status
            await requestItem.update({
                issued_quantity: requestItem.quantity,
                status: 'ISSUED'
            });

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
                const newItem = await db.Item.create({
                    item_code: `ITEM-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`,
                    name: requestItem.custom_item_name,
                    category_id: category_id,
                    unit: unit || 'pcs',
                    specifications: requestItem.specifications || {},
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
                    initiated_by_role: req.userRole,
                    requester_id: req.userId,
                    project_id: requestItem.Request.project_id,
                    store_node_id: requestItem.Request.store_node_id,
                    site_location_id: requestItem.Request.site_location_id,
                    required_date: requestItem.Request.required_date,
                    status: 'PENDING'
                });

                await RequestItem.create({
                    request_id: pr.id,
                    item_id: requestItem.item_id,
                    custom_item_name: requestItem.custom_item_name,
                    category_id: requestItem.category_id,
                    specifications: requestItem.specifications,
                    quantity: requestItem.quantity,
                    parent_item_id: requestItem.id // Link back to original MR item
                });
            }
        } else if (action === 'PM_RECEIVE') {
            // Updated by Project Manager to confirm receipt at site
            await requestItem.update({ status: 'RECEIVED' });
        } else if (action === 'PM_COMPLETE') {
            // Updated by Project Manager to indicate item is no longer needed/fully consumed
            await requestItem.update({ status: 'COMPLETED' });
        }

        // Update request status: PARTIALLY_FULFILLED, FULFILLED, or COMPLETED based on items
        const allItems = await RequestItem.findAll({ where: { request_id: requestItem.request_id } });

        const allCompleted = allItems.every(i => i.status === 'COMPLETED');
        const allIssuedOrBetter = allItems.every(i => ['ISSUED', 'RECEIVED', 'COMPLETED'].includes(i.status));
        const someIssuedOrBetter = allItems.some(i => ['ISSUED', 'RECEIVED', 'COMPLETED'].includes(i.status));

        if (allCompleted) {
            await Request.update({ status: 'COMPLETED' }, { where: { id: requestItem.request_id } });
        } else if (allIssuedOrBetter) {
            await Request.update({ status: 'FULFILLED' }, { where: { id: requestItem.request_id } });
        } else if (someIssuedOrBetter) {
            await Request.update({ status: 'PARTIALLY_FULFILLED' }, { where: { id: requestItem.request_id } });
        }

        res.send({ message: "Item updated", requestItem });

    } catch (err) {
        console.error(err);
        res.status(500).send({ message: err.message });
    }
};

// Store and Site helpers for scoped dropdowns and PM site creation
exports.getStoresForUser = async (req, res) => {
    try {
        const userRole = req.userRole;
        const storeNodeId = req.storeNodeId;

        const where = {};

        // Store-scoped roles only see their assigned store
        if ((userRole === 'STORE_KEEPER' || userRole === 'STORE_MANAGER') && storeNodeId) {
            where.id = storeNodeId;
        }

        const stores = await db.StoreNode.findAll({
            where,
            order: [['name', 'ASC']]
        });

        res.json(stores);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.getSitesForUser = async (req, res) => {
    try {
        const userRole = req.userRole;
        const storeNodeId = req.storeNodeId;

        const where = {};

        // For store-scoped roles, only return sites linked to their store node
        if ((userRole === 'STORE_KEEPER' || userRole === 'STORE_MANAGER') && storeNodeId) {
            where.store_node_id = storeNodeId;
        }

        const sites = await db.SiteLocation.findAll({
            where,
            order: [['name', 'ASC']]
        });

        res.json(sites);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.createSiteByPM = async (req, res) => {
    try {
        const userRole = req.userRole;

        if (userRole !== 'PROJECT_MANAGER') {
            return res.status(403).send({ message: "Only Project Managers can create sites." });
        }

        const { name, code, address, project_id } = req.body;

        if (!name) {
            return res.status(400).send({ message: "Site name is required." });
        }

        let projectStoreNodeId = null;
        if (project_id) {
            const project = await db.Project.findByPk(project_id);
            if (!project) {
                return res.status(400).send({ message: "Selected project is invalid." });
            }
            projectStoreNodeId = project.store_node_id || null;
        }

        const site = await db.SiteLocation.create({
            name,
            code: code || null,
            address: address || null,
            created_by: req.userId,
            project_id: project_id || null,
            store_node_id: projectStoreNodeId // If project is mapped, carry mapping. Else admin maps later.
        });

        res.status(201).json(site);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

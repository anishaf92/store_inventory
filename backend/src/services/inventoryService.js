const db = require('../utils/db');
const { Inventory, Item, InventoryTransaction, AuditLog, sequelize } = db;

/**
 * Handle GRN (Goods Receipt Note) - Adds stock to a store
 */
exports.processGRN = async (storeNodeId, itemId, quantity, invoiceNumber, userId) => {
    const transaction = await sequelize.transaction();

    try {
        const item = await Item.findByPk(itemId, { transaction });
        if (!item) throw new Error('Item not found');

        // Find or Create inventory record for this item in this store
        let inventory = await Inventory.findOne({
            where: { store_node_id: storeNodeId, item_id: itemId, site_location_id: null },
            transaction
        });

        const oldStock = inventory ? inventory.current_stock : 0;
        const newStock = oldStock + quantity;

        if (inventory) {
            await inventory.update({ current_stock: newStock }, { transaction });
        } else {
            inventory = await Inventory.create({
                store_node_id: storeNodeId,
                item_id: itemId,
                site_location_id: null,
                current_stock: newStock,
                low_stock_threshold: item.low_stock_threshold || 10
            }, { transaction });
        }

        // Create Transaction Record
        await InventoryTransaction.create({
            type: 'GRN',
            store_node_id: storeNodeId,
            item_id: itemId,
            quantity,
            invoice_number: invoiceNumber,
            performed_by: userId
        }, { transaction });

        // Audit Log
        await AuditLog.create({
            table_name: 'inventory',
            record_id: inventory.id,
            action: 'UPDATE',
            performed_by: userId,
            old_values: { current_stock: oldStock },
            new_values: { current_stock: newStock, invoice_number: invoiceNumber }
        }, { transaction });

        await transaction.commit();
        return { success: true, newStock };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/**
 * Handle Issue (Usage/Consumption) - Removes stock from a store or site
 */
exports.processIssue = async (storeNodeId, siteLocationId, itemId, quantity, referenceId, userId) => {
    const transaction = await sequelize.transaction();

    try {
        // ALWAYS deduct from Store (site_location_id: null)
        const sourceInventory = await Inventory.findOne({
            where: {
                store_node_id: storeNodeId,
                item_id: itemId,
                site_location_id: null
            },
            transaction
        });

        if (!sourceInventory) throw new Error('Inventory record not found in the source store');
        if (sourceInventory.current_stock < quantity) throw new Error('Insufficient stock in the source store');

        const oldSourceStock = sourceInventory.current_stock;
        const newSourceStock = oldSourceStock - quantity;
        await sourceInventory.update({ current_stock: newSourceStock }, { transaction });

        // If siteLocationId is provided, INCREMENT stock at the site
        let targetInventory = null;
        if (siteLocationId) {
            targetInventory = await Inventory.findOne({
                where: {
                    store_node_id: storeNodeId,
                    item_id: itemId,
                    site_location_id: siteLocationId
                },
                transaction
            });

            if (targetInventory) {
                await targetInventory.update({ current_stock: targetInventory.current_stock + quantity }, { transaction });
            } else {
                targetInventory = await Inventory.create({
                    store_node_id: storeNodeId,
                    item_id: itemId,
                    site_location_id: siteLocationId,
                    current_stock: quantity
                }, { transaction });
            }
        }

        const inventory = sourceInventory; // For Audit Log compatibility below

        await InventoryTransaction.create({
            type: 'ISSUE',
            store_node_id: storeNodeId,
            item_id: itemId,
            quantity,
            reference_id: referenceId,
            performed_by: userId
        }, { transaction });

        await AuditLog.create({
            table_name: 'inventory',
            record_id: inventory.id,
            action: 'UPDATE',
            performed_by: userId,
            old_values: { current_stock: oldSourceStock },
            new_values: { current_stock: newSourceStock }
        }, { transaction });

        await transaction.commit();
        return { success: true, newStock: newSourceStock };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/**
 * Get stock for a specific item at a specific store
 */
exports.getStockForStore = async (storeNodeId, itemId) => {
    const inventory = await Inventory.findOne({
        where: { store_node_id: storeNodeId, item_id: itemId, site_location_id: null }
    });
    return inventory ? inventory.current_stock : 0;
};

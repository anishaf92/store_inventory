const db = require('../utils/db');
const Item = db.Item;
const InventoryTransaction = db.InventoryTransaction;
const AuditLog = db.AuditLog;
const sequelize = db.sequelize;

exports.processTransaction = async (type, itemId, quantity, referenceId, userId) => {
    const transaction = await sequelize.transaction();

    try {
        const item = await Item.findByPk(itemId, { transaction });
        if (!item) {
            throw new Error('Item not found');
        }

        const oldStock = item.current_stock;
        let newStock = oldStock;

        if (type === 'GRN') {
            newStock += quantity;
        } else if (type === 'ISSUE') {
            if (oldStock < quantity) {
                throw new Error('Insufficient stock');
            }
            newStock -= quantity;
        } else {
            throw new Error('Invalid transaction type');
        }

        // Update Item Stock
        await item.update({ current_stock: newStock }, { transaction });

        // Create Transaction Record
        await InventoryTransaction.create({
            type,
            item_id: itemId,
            quantity,
            reference_id: referenceId,
            performed_by: userId
        }, { transaction });

        // Create Audit Log
        await AuditLog.create({
            table_name: 'items',
            record_id: itemId,
            action: 'UPDATE',
            performed_by: userId,
            old_values: { current_stock: oldStock },
            new_values: { current_stock: newStock }
        }, { transaction });

        await transaction.commit();
        return { success: true, newStock };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

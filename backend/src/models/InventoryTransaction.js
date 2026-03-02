const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const InventoryTransaction = sequelize.define('InventoryTransaction', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        store_node_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        type: {
            type: DataTypes.ENUM('GRN', 'ISSUE'),
            allowNull: false,
        },
        item_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        reference_id: {
            type: DataTypes.STRING,
            allowNull: true, // Request ID or PO Number
        },
        invoice_number: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        performed_by: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        timestamp: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        }
    }, {
        tableName: 'inventory_transactions',
        timestamps: true,
        updatedAt: false, // Transactions are immutable usually
    });

    return InventoryTransaction;
};

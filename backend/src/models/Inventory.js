const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Inventory = sequelize.define('Inventory', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        item_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        // Legacy fields for old StoreNode/SiteLocation structure
        store_node_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        site_location_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        // New project-centric fields
        project_store_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        project_location_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        current_stock: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        reserved_stock: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        low_stock_threshold: {
            type: DataTypes.INTEGER,
            defaultValue: 10,
        },
    }, {
        tableName: 'inventory',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['item_id', 'store_node_id', 'site_location_id'],
            }
        ],
    });

    return Inventory;
};

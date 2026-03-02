const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Transfer = sequelize.define('Transfer', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        store_node_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        site_location_id: {
            type: DataTypes.UUID,
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
        status: {
            type: DataTypes.ENUM('PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED', 'FAILED'),
            defaultValue: 'PENDING',
        },
        initiated_by: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        completed_by: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        request_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        pm_acknowledged: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        pm_acknowledged_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        notes: {
            type: DataTypes.TEXT,
        },
    }, {
        tableName: 'transfers',
        timestamps: true,
    });

    return Transfer;
};

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PendingEdit = sequelize.define('PendingEdit', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        store_node_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        table_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        record_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        proposed_changes: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
        requested_by: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
            defaultValue: 'PENDING',
        },
    }, {
        tableName: 'pending_edits',
        timestamps: true,
    });

    return PendingEdit;
};

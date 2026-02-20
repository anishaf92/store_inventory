const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const AuditLog = sequelize.define('AuditLog', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        table_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        record_id: {
            type: DataTypes.STRING, // Can be UUID or Int, so String is safest
            allowNull: false,
        },
        action: {
            type: DataTypes.STRING, // INSERT, UPDATE, DELETE
            allowNull: false,
        },
        performed_by: {
            type: DataTypes.UUID,
            allowNull: true, // System actions might be null, but ideally user
        },
        old_values: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        new_values: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
    }, {
        tableName: 'audit_logs',
        timestamps: true,
        updatedAt: false,
    });

    return AuditLog;
};

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Request = sequelize.define('Request', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        type: {
            type: DataTypes.ENUM('MR', 'PR', 'PR_STORE', 'TRANSFER_REQUEST'),
            allowNull: false,
        },
        initiated_by_role: {
            type: DataTypes.ENUM('PROJECT_MANAGER', 'STORE_KEEPER'),
            allowNull: false,
            defaultValue: 'PROJECT_MANAGER',
        },
        requester_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        // Legacy store/site identifiers
        store_node_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        site_location_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        project_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        // New project-centric location reference
        project_location_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('PENDING', 'REQUESTED', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'ITEM_ADDED', 'PARTIALLY_FULFILLED', 'FULFILLED'),
            defaultValue: 'PENDING',
        },
        required_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
    }, {
        tableName: 'requests',
        timestamps: true,
    });

    return Request;
};

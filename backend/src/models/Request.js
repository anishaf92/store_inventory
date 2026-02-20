const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Request = sequelize.define('Request', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        type: {
            type: DataTypes.ENUM('MR', 'PR'),
            allowNull: false,
        },
        requester_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        project_id: {
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

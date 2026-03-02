const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const RequestItem = sequelize.define('RequestItem', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        request_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        item_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        custom_item_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1,
            },
        },
        issued_quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        status: {
            type: DataTypes.ENUM('PENDING', 'ISSUED', 'NEEDS_PROCUREMENT', 'PARTIALLY_ISSUED'),
            defaultValue: 'PENDING',
        },
        parent_item_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        category_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        specifications: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
        },
    }, {
        tableName: 'request_items',
        timestamps: false,
    });

    return RequestItem;
};

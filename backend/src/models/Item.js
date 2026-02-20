const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Item = sequelize.define('Item', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        grade: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        make: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        unit: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'pcs',
        },
        specifications: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
        },
        low_stock_threshold: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 10,
        },
        current_stock: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    }, {
        tableName: 'items',
        timestamps: true,
    });

    return Item;
};

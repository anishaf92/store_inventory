const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const StoreNode = sequelize.define('StoreNode', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        code: {
            type: DataTypes.STRING,
            unique: true,
        },
        location: {
            type: DataTypes.STRING,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        }
    }, {
        tableName: 'store_nodes',
        timestamps: true,
    });

    return StoreNode;
};

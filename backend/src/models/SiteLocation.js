const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SiteLocation = sequelize.define('SiteLocation', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        store_node_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        code: {
            type: DataTypes.STRING,
        },
        address: {
            type: DataTypes.TEXT,
        },
    }, {
        tableName: 'site_locations',
        timestamps: true,
    });

    return SiteLocation;
};

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProjectLocation = sequelize.define('ProjectLocation', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        project_id: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        code: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    }, {
        tableName: 'project_locations',
        timestamps: true,
    });

    return ProjectLocation;
};


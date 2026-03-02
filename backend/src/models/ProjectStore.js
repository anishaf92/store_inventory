const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProjectStore = sequelize.define('ProjectStore', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        project_id: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true, // one store per project
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        code: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        location: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    }, {
        tableName: 'project_stores',
        timestamps: true,
    });

    return ProjectStore;
};


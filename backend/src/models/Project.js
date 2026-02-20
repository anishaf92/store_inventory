const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Project = sequelize.define('Project', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        reference_number: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        start_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        expected_completion_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        location: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        summary: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('ACTIVE', 'COMPLETED', 'ON_HOLD'),
            defaultValue: 'ACTIVE',
        }
    }, {
        tableName: 'projects',
        timestamps: true,
    });

    return Project;
};

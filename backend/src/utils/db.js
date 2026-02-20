const { Sequelize } = require('sequelize');
const config = require('../config/database');
const env = process.env.NODE_ENV || 'development';
const list_models = ['User', 'Category', 'Item', 'Request', 'RequestItem', 'InventoryTransaction', 'AuditLog', 'PendingEdit', 'Project'];

const sequelize = config[env].url
    ? new Sequelize(config[env].url, config[env])
    : new Sequelize(config[env].database, config[env].username, config[env].password, config[env]);


const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import Models
db.User = require('../models/User')(sequelize);
db.Category = require('../models/Category')(sequelize);
db.Item = require('../models/Item')(sequelize);
db.Request = require('../models/Request')(sequelize);
db.RequestItem = require('../models/RequestItem')(sequelize);
db.InventoryTransaction = require('../models/InventoryTransaction')(sequelize);
db.AuditLog = require('../models/AuditLog')(sequelize);
db.PendingEdit = require('../models/PendingEdit')(sequelize);
db.Project = require('../models/Project')(sequelize);

// Associations
// Category - Item
db.Category.hasMany(db.Item, { foreignKey: 'category_id' });
db.Item.belongsTo(db.Category, { foreignKey: 'category_id' });

// User - Request
db.User.hasMany(db.Request, { foreignKey: 'requester_id' });
db.Request.belongsTo(db.User, { foreignKey: 'requester_id', as: 'requester' });

// Request - RequestItem
db.Request.hasMany(db.RequestItem, { foreignKey: 'request_id' });
db.RequestItem.belongsTo(db.Request, { foreignKey: 'request_id' });

// Project - Request
db.Project.hasMany(db.Request, { foreignKey: 'project_id' });
db.Request.belongsTo(db.Project, { foreignKey: 'project_id' });

// Item - RequestItem
db.Item.hasMany(db.RequestItem, { foreignKey: 'item_id' });
db.RequestItem.belongsTo(db.Item, { foreignKey: 'item_id' });

// User - InventoryTransaction
db.User.hasMany(db.InventoryTransaction, { foreignKey: 'performed_by' });
db.InventoryTransaction.belongsTo(db.User, { foreignKey: 'performed_by', as: 'performer' });

// Item - InventoryTransaction
db.Item.hasMany(db.InventoryTransaction, { foreignKey: 'item_id' });
db.InventoryTransaction.belongsTo(db.Item, { foreignKey: 'item_id' });

// User - PendingEdit
db.User.hasMany(db.PendingEdit, { foreignKey: 'requested_by' });
db.PendingEdit.belongsTo(db.User, { foreignKey: 'requested_by', as: 'requester' });

// User - AuditLog
db.User.hasMany(db.AuditLog, { foreignKey: 'performed_by' });
db.AuditLog.belongsTo(db.User, { foreignKey: 'performed_by', as: 'performer' });

module.exports = db;

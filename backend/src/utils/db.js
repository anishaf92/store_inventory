const { Sequelize } = require('sequelize');
const pg = require('pg');
const config = require('../config/database');
const env = process.env.NODE_ENV || 'development';
const list_models = ['User', 'Category', 'Item', 'Request', 'RequestItem', 'InventoryTransaction', 'AuditLog', 'PendingEdit', 'Project'];

const sequelize = config[env].url
    ? new Sequelize(config[env].url, { ...config[env], dialectModule: pg })
    : new Sequelize(config[env].database, config[env].username, config[env].password, { ...config[env], dialectModule: pg });


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
db.StoreNode = require('../models/StoreNode')(sequelize);
db.SiteLocation = require('../models/SiteLocation')(sequelize);
db.Inventory = require('../models/Inventory')(sequelize);
db.Transfer = require('../models/Transfer')(sequelize);

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

// Category - RequestItem (for custom items)
db.Category.hasMany(db.RequestItem, { foreignKey: 'category_id' });
db.RequestItem.belongsTo(db.Category, { foreignKey: 'category_id' });

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

// --- New Associations for Microservices Architecture ---

// StoreNode - SiteLocation (Admin assigns site to store)
db.StoreNode.hasMany(db.SiteLocation, { foreignKey: 'store_node_id' });
db.SiteLocation.belongsTo(db.StoreNode, { foreignKey: 'store_node_id', as: 'store' });

// User (PM) - SiteLocation
db.User.hasMany(db.SiteLocation, { foreignKey: 'created_by' });
db.SiteLocation.belongsTo(db.User, { foreignKey: 'created_by', as: 'creator' });

// StoreNode - User (Store Keepers are assigned to a store)
db.StoreNode.hasMany(db.User, { foreignKey: 'store_node_id' });
db.User.belongsTo(db.StoreNode, { foreignKey: 'store_node_id', as: 'store' });

// StoreNode - Inventory
db.StoreNode.hasMany(db.Inventory, { foreignKey: 'store_node_id' });
db.Inventory.belongsTo(db.StoreNode, { foreignKey: 'store_node_id', as: 'store' });

// Item - Inventory
db.Item.hasMany(db.Inventory, { foreignKey: 'item_id' });
db.Inventory.belongsTo(db.Item, { foreignKey: 'item_id' });

// SiteLocation - Inventory
db.SiteLocation.hasMany(db.Inventory, { foreignKey: 'site_location_id' });
db.Inventory.belongsTo(db.SiteLocation, { foreignKey: 'site_location_id', as: 'site' });

// StoreNode - Transfer (Source)
db.StoreNode.hasMany(db.Transfer, { foreignKey: 'store_node_id' });
db.Transfer.belongsTo(db.StoreNode, { foreignKey: 'store_node_id', as: 'store' });

// SiteLocation - Transfer (Destination)
db.SiteLocation.hasMany(db.Transfer, { foreignKey: 'site_location_id' });
db.Transfer.belongsTo(db.SiteLocation, { foreignKey: 'site_location_id', as: 'site' });

// Item - Transfer
db.Item.hasMany(db.Transfer, { foreignKey: 'item_id' });
db.Transfer.belongsTo(db.Item, { foreignKey: 'item_id' });

// User - Transfer
db.User.hasMany(db.Transfer, { foreignKey: 'initiated_by' });
db.Transfer.belongsTo(db.User, { foreignKey: 'initiated_by', as: 'initiator' });

db.User.hasMany(db.Transfer, { foreignKey: 'completed_by' });
db.Transfer.belongsTo(db.User, { foreignKey: 'completed_by', as: 'completer' });

// Request - Transfer
db.Request.hasMany(db.Transfer, { foreignKey: 'request_id' });
db.Transfer.belongsTo(db.Request, { foreignKey: 'request_id' });

// SiteLocation - Request
db.SiteLocation.hasMany(db.Request, { foreignKey: 'site_location_id' });
db.Request.belongsTo(db.SiteLocation, { foreignKey: 'site_location_id', as: 'site' });

// StoreNode - Request
db.StoreNode.hasMany(db.Request, { foreignKey: 'store_node_id' });
db.Request.belongsTo(db.StoreNode, { foreignKey: 'store_node_id', as: 'store' });

// StoreNode - InventoryTransaction
db.StoreNode.hasMany(db.InventoryTransaction, { foreignKey: 'store_node_id' });
db.InventoryTransaction.belongsTo(db.StoreNode, { foreignKey: 'store_node_id', as: 'store' });

// StoreNode - PendingEdit
db.StoreNode.hasMany(db.PendingEdit, { foreignKey: 'store_node_id' });
db.PendingEdit.belongsTo(db.StoreNode, { foreignKey: 'store_node_id', as: 'store' });

module.exports = db;

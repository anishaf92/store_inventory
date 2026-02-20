const db = require('../utils/db');
const AuditLog = db.AuditLog;
const User = db.User;

exports.getAuditLogs = async (req, res) => {
    try {
        const { table, record_id } = req.query;
        const where = {};
        if (table) where.table_name = table;
        if (record_id) where.record_id = record_id;

        const logs = await AuditLog.findAll({
            where,
            include: [
                { model: User, as: 'performer', attributes: ['id', 'name', 'role'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.send(logs);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

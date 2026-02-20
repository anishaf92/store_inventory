const db = require('../utils/db');
const Project = db.Project;

exports.createProject = async (req, res) => {
    try {
        const { reference_number, start_date, expected_completion_date, location, summary } = req.body;

        const project = await Project.create({
            reference_number,
            start_date,
            expected_completion_date,
            location,
            summary,
            status: 'ACTIVE'
        });

        res.status(201).send(project);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.getProjects = async (req, res) => {
    try {
        const projects = await Project.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(projects);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

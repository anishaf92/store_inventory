const db = require('../utils/db');
const Project = db.Project;
const SiteLocation = db.SiteLocation;
const StoreNode = db.StoreNode; // legacy
const User = db.User;
const ProjectStore = db.ProjectStore;

exports.createProject = async (req, res) => {
    try {
        const {
            reference_number,
            start_date,
            expected_completion_date,
            location,
            summary,
            // New project-centric assignments
            project_manager_id,
            store_keeper_id,
            // New dedicated store for this project
            store_name,
            store_code,
            store_location
        } = req.body;

        if (!project_manager_id || !store_keeper_id) {
            return res.status(400).send({ message: "Project Manager and Store Keeper are required for project creation." });
        }

        if (!store_name || !store_name.trim()) {
            return res.status(400).send({ message: "Project Store Name is required for project creation." });
        }

        // Validate PM and Store Keeper roles
        const pm = await User.findByPk(project_manager_id);
        if (!pm || pm.role !== 'PROJECT_MANAGER') {
            return res.status(400).send({ message: "Invalid Project Manager selected." });
        }

        const keeper = await User.findByPk(store_keeper_id);
        if (!keeper || keeper.role !== 'STORE_KEEPER') {
            return res.status(400).send({ message: "Invalid Store Keeper selected." });
        }

        const project = await Project.create({
            reference_number,
            start_date,
            expected_completion_date,
            location,
            summary,
            status: 'ACTIVE',
            project_manager_id,
            store_keeper_id,
            // legacy mapping left null by default; admin can still map if needed
            store_node_id: null
        });

        const projectStore = await ProjectStore.create({
            project_id: project.id,
            name: store_name.trim(),
            code: store_code || null,
            location: store_location || null
        });

        res.status(201).send({ project, projectStore });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.getProjects = async (req, res) => {
    try {
        const where = {};

        // Project Managers should only see projects they manage
        if (req.userRole === 'PROJECT_MANAGER' && req.userId) {
            where.project_manager_id = req.userId;
        }

        const projects = await Project.findAll({
            where: Object.keys(where).length ? where : undefined,
            include: [
                // New associations
                { model: User, as: 'project_manager', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'store_keeper', attributes: ['id', 'name', 'email'] },
                { model: ProjectStore, as: 'project_store', attributes: ['id', 'name', 'code', 'location'] },
                // Legacy associations kept for backward compatibility
                { model: StoreNode, as: 'store_legacy', attributes: ['id', 'name', 'code'] },
                { model: SiteLocation, as: 'sites', attributes: ['id', 'name', 'code', 'address', 'store_node_id', 'project_id', 'created_by'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(projects);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.getProjectSites = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await Project.findByPk(id);
        if (!project) return res.status(404).send({ message: "Project not found" });

        // Permission: only the assigned PM, OWNER, or ADMIN can view sites for this project
        if (req.userRole === 'PROJECT_MANAGER' && project.project_manager_id !== req.userId) {
            return res.status(403).send({ message: "You are not the project manager for this project." });
        }

        const sites = await SiteLocation.findAll({
            where: { project_id: id },
            order: [['createdAt', 'DESC']]
        });

        res.json(sites);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.createProjectSite = async (req, res) => {
    try {
        const { id } = req.params; // project id
        const { name, code, address } = req.body;

        if (!name) return res.status(400).send({ message: "Site name is required." });

        const project = await Project.findByPk(id);
        if (!project) return res.status(404).send({ message: "Project not found" });

        // Permission: only the assigned PM, OWNER, or ADMIN can create sites for this project
        if (req.userRole === 'PROJECT_MANAGER' && project.project_manager_id !== req.userId) {
            return res.status(403).send({ message: "You are not the project manager for this project." });
        }

        const site = await SiteLocation.create({
            project_id: project.id,
            store_node_id: project.store_node_id || null, // Admin mapping propagates later too
            created_by: req.userId,
            name,
            code: code || null,
            address: address || null
        });

        res.status(201).json(site);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.updateProjectSite = async (req, res) => {
    try {
        const { id } = req.params; // site id
        const { name, code, address } = req.body;

        const site = await SiteLocation.findByPk(id);
        if (!site) return res.status(404).send({ message: "Site not found" });

        const project = await Project.findByPk(site.project_id);
        if (!project) return res.status(404).send({ message: "Project not found for this site" });

        // PM can only edit sites belonging to projects they manage; OWNER/ADMIN can edit any.
        if (req.userRole === 'PROJECT_MANAGER' && project.project_manager_id !== req.userId) {
            return res.status(403).send({ message: "You are not the project manager for this project." });
        }

        await site.update({
            name: name ?? site.name,
            code: code ?? site.code,
            address: address ?? site.address
        });

        res.json(site);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            reference_number,
            start_date,
            expected_completion_date,
            location,
            summary,
            project_manager_id,
            store_keeper_id,
            store_name,
            store_code,
            store_location
        } = req.body;

        const project = await Project.findByPk(id, {
            include: [{ model: ProjectStore, as: 'project_store' }]
        });
        if (!project) return res.status(404).send({ message: "Project not found" });

        if (!project_manager_id || !store_keeper_id) {
            return res.status(400).send({ message: "Project Manager and Store Keeper are required." });
        }
        if (!store_name || !store_name.trim()) {
            return res.status(400).send({ message: "Project Store Name is required." });
        }

        const pm = await User.findByPk(project_manager_id);
        if (!pm || pm.role !== 'PROJECT_MANAGER') {
            return res.status(400).send({ message: "Invalid Project Manager selected." });
        }

        const keeper = await User.findByPk(store_keeper_id);
        if (!keeper || keeper.role !== 'STORE_KEEPER') {
            return res.status(400).send({ message: "Invalid Store Keeper selected." });
        }

        await project.update({
            reference_number,
            start_date,
            expected_completion_date,
            location,
            summary,
            project_manager_id,
            store_keeper_id
        });

        let projectStore = project.project_store;
        if (projectStore) {
            await projectStore.update({
                name: store_name.trim(),
                code: store_code || null,
                location: store_location || null
            });
        } else {
            projectStore = await ProjectStore.create({
                project_id: project.id,
                name: store_name.trim(),
                code: store_code || null,
                location: store_location || null
            });
        }

        res.json({ project, projectStore });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

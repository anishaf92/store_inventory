import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import { Plus, MapPin, Calendar, FileText, XCircle, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Projects = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [sites, setSites] = useState([]);
    const [stores, setStores] = useState([]);
    const [projectManagers, setProjectManagers] = useState([]);
    const [storeKeepers, setStoreKeepers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showSiteModal, setShowSiteModal] = useState(false);
    const [editingSite, setEditingSite] = useState(null);

    const { register, handleSubmit, reset } = useForm();
    const {
        register: registerSite,
        handleSubmit: handleSiteSubmit,
        reset: resetSite,
        setValue: setSiteValue
    } = useForm();

    useEffect(() => {
        fetchProjects();
        fetchStores();
        fetchUsers();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects');
            setProjects(res.data);
        } catch (err) {
            console.error("Failed to fetch projects", err);
        }
    };

    const fetchProjectSites = async (projectId) => {
        try {
            const res = await api.get(`/projects/${projectId}/sites`);
            setSites(res.data || []);
        } catch (err) {
            console.error("Failed to fetch project sites", err);
            setSites([]);
        }
    };

    const fetchStores = async () => {
        try {
            // For legacy compatibility; new projects will create their own dedicated stores
            const res = await api.get('/requests/stores');
            setStores(res.data || []);
        } catch (err) {
            console.error("Failed to fetch stores", err);
            setStores([]);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/admin/users');
            const allUsers = res.data || [];
            setProjectManagers(allUsers.filter(u => u.role === 'PROJECT_MANAGER'));
            setStoreKeepers(allUsers.filter(u => u.role === 'STORE_KEEPER'));
        } catch (err) {
            console.error("Failed to fetch users", err);
            setProjectManagers([]);
            setStoreKeepers([]);
        }
    };

    const onSubmit = async (data) => {
        try {
            if (editingProject) {
                await api.put(`/projects/${editingProject.id}`, data);
                alert('Project updated successfully');
            } else {
                await api.post('/projects', data);
                alert('Project created successfully');
            }
            setShowModal(false);
            setEditingProject(null);
            reset();
            fetchProjects();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || 'Failed to save project';
            alert(`Error: ${msg}`);
        }
    };

    const onSiteSubmit = async (data) => {
        try {
            // When creating a site, PM must pick the project from dropdown
            const targetProjectId = data.project_id || selectedProject?.id;
            if (!targetProjectId) {
                alert('Please select a project for this site.');
                return;
            }

            if (editingSite) {
                await api.put(`/projects/sites/${editingSite.id}`, data);
                alert('Site updated successfully');
            } else {
                await api.post(`/projects/${targetProjectId}/sites`, data);
                alert('Site created successfully');
            }

            setShowSiteModal(false);
            setEditingSite(null);
            resetSite();
            await fetchProjectSites(targetProjectId);
            await fetchProjects();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to save site');
        }
    };

    const openProjectDetails = async (project) => {
        setSelectedProject(project);
        setSites(project.sites || []);
        setShowDetailModal(true);
        await fetchProjectSites(project.id);
    };

    const openCreateSiteModal = () => {
        setEditingSite(null);
        resetSite({
            project_id: selectedProject ? selectedProject.id : '',
            name: '',
            code: '',
            address: ''
        });
        setShowSiteModal(true);
    };

    const openEditSiteModal = (site) => {
        setEditingSite(site);
        setSiteValue('name', site.name || '');
        setSiteValue('code', site.code || '');
        setSiteValue('address', site.address || '');
        setShowSiteModal(true);
    };

    const canCreateProject = user && ['ADMIN', 'OWNER'].includes(user.role);
    const canManageSites = user && user.role === 'PROJECT_MANAGER';
    const isPM = user && user.role === 'PROJECT_MANAGER';
    const pmPrimaryProject = isPM && projects.length > 0 ? projects[0] : null;

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {isPM ? 'Sites' : 'Projects'}
                    </h1>
                    {isPM && pmPrimaryProject && (
                        <p className="text-sm text-gray-500 mt-1">
                            Project: <span className="font-semibold">{pmPrimaryProject.reference_number}</span> – {pmPrimaryProject.location}
                        </p>
                    )}
                </div>
                {canCreateProject && (
                    <button
                        onClick={() => { setEditingProject(null); reset(); setShowModal(true); }}
                        className="bg-safety-orange text-white px-4 py-2 rounded-lg hover:bg-orange-600 font-medium inline-flex items-center shadow-md"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Project
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => (
                    <div
                        key={project.id}
                        onClick={() => openProjectDetails(project)}
                        className="bg-white rounded-lg shadow-md p-6 border-t-4 border-industrial-grey hover:shadow-lg transition cursor-pointer"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">{project.reference_number}</h3>
                                <div className="flex items-center text-sm text-gray-500 mt-1">
                                    <MapPin className="w-3 h-3 mr-1" /> {project.location}
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${project.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {project.status}
                                </span>
                                {canCreateProject && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingProject(project);
                                            reset({
                                                reference_number: project.reference_number || '',
                                                location: project.location || '',
                                                start_date: project.start_date || '',
                                                expected_completion_date: project.expected_completion_date || '',
                                                summary: project.summary || '',
                                                project_manager_id: project.project_manager_id || project.project_manager?.id || '',
                                                store_keeper_id: project.store_keeper_id || project.store_keeper?.id || '',
                                                store_name: project.project_store?.name || '',
                                                store_code: project.project_store?.code || '',
                                                store_location: project.project_store?.location || ''
                                            });
                                            setShowModal(true);
                                        }}
                                        className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                                    >
                                        Edit
                                    </button>
                                )}
                            </div>
                        </div>

                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.summary}</p>

                        <div className="border-t pt-4 text-xs text-gray-500 flex justify-between">
                            <div className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" /> Start: {project.start_date}
                            </div>
                            {project.expected_completion_date && (
                                <div>End: {project.expected_completion_date}</div>
                            )}
                        </div>
                    </div>
                ))}

                {projects.length === 0 && (
                    <div className="col-span-full text-center py-10 text-gray-500">
                        No projects found. {canCreateProject && 'Click "Add Project" to start one.'}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-4">{editingProject ? 'Edit Project' : 'Add New Project'}</h2>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Reference Number</label>
                                    <input {...register('reference_number')} placeholder="e.g., SITE-001" className="mt-1 block w-full border border-gray-300 p-2 rounded" required />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Location</label>
                                    <input {...register('location')} placeholder="Project Location" className="mt-1 block w-full border border-gray-300 p-2 rounded" required />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Project Manager</label>
                                    <select {...register('project_manager_id')} className="mt-1 block w-full border border-gray-300 p-2 rounded" required>
                                        <option value="">Select Project Manager</option>
                                        {projectManagers.map(pm => (
                                            <option key={pm.id} value={pm.id}>{pm.name} ({pm.email})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Store Keeper</label>
                                    <select {...register('store_keeper_id')} className="mt-1 block w-full border border-gray-300 p-2 rounded" required>
                                        <option value="">Select Store Keeper</option>
                                        {storeKeepers.map(sk => (
                                            <option key={sk.id} value={sk.id}>{sk.name} ({sk.email})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Start Date</label>
                                        <input {...register('start_date')} type="date" className="mt-1 block w-full border border-gray-300 p-2 rounded" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">End Date (Expected)</label>
                                        <input {...register('expected_completion_date')} type="date" className="mt-1 block w-full border border-gray-300 p-2 rounded" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Project Store Name</label>
                                    <input
                                        {...register('store_name', { required: true })}
                                        placeholder="e.g., Main Store for this Project"
                                        className="mt-1 block w-full border border-gray-300 p-2 rounded"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Store Code</label>
                                        <input {...register('store_code')} placeholder="e.g., PRJ-STORE-01" className="mt-1 block w-full border border-gray-300 p-2 rounded" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Store Location</label>
                                        <input {...register('store_location')} placeholder="Store physical address" className="mt-1 block w-full border border-gray-300 p-2 rounded" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Summary / Description</label>
                                    <textarea {...register('summary')} rows="3" placeholder="Brief details about the project..." className="mt-1 block w-full border border-gray-300 p-2 rounded"></textarea>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-safety-orange text-white rounded hover:bg-orange-600">Create Project</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDetailModal && selectedProject && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-8 w-full max-w-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setShowDetailModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <XCircle className="w-6 h-6" />
                        </button>

                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded mb-2 inline-block">Project Details</span>
                                <h2 className="text-3xl font-black text-gray-900">{selectedProject.reference_number}</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Store Node: {selectedProject.store?.name || 'Not assigned by admin yet'}
                                </p>
                            </div>
                            <span className={`text-sm font-bold px-4 py-1.5 rounded-full ${selectedProject.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {selectedProject.status}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mb-8">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Location
                                </div>
                                <p className="text-base text-gray-800 font-medium">{selectedProject.location}</p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Duration
                                </div>
                                <p className="text-base text-gray-800 font-medium">{selectedProject.start_date} to {selectedProject.expected_completion_date || 'Ongoing'}</p>
                            </div>
                        </div>

                        <div className="mb-8">
                            <div className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                <FileText className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Description / Summary
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-gray-200 text-gray-700 leading-relaxed shadow-sm">
                                {selectedProject.summary || 'No description provided for this project.'}
                            </div>
                        </div>

                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Project Sites</h3>
                                {canManageSites && (
                                    <button
                                        onClick={openCreateSiteModal}
                                        className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700"
                                    >
                                        + Add Site
                                    </button>
                                )}
                            </div>
                            <div className="space-y-2">
                                {sites.length === 0 && (
                                    <div className="text-sm text-gray-500 italic border rounded-lg p-3">
                                        No sites linked to this project yet.
                                    </div>
                                )}
                                {sites.map(site => (
                                    <div key={site.id} className="border rounded-lg p-3 flex justify-between items-start">
                                        <div>
                                            <div className="font-semibold text-gray-800">{site.name}</div>
                                            <div className="text-xs text-gray-500">{site.code || 'No code'}</div>
                                            <div className="text-sm text-gray-600">{site.address || 'No address'}</div>
                                        </div>
                                        {canManageSites && (
                                            <button
                                                onClick={() => openEditSiteModal(site)}
                                                className="text-xs px-2 py-1 rounded border text-blue-600 border-blue-200 hover:bg-blue-50 inline-flex items-center"
                                            >
                                                <Pencil className="w-3 h-3 mr-1" /> Edit
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition-colors shadow-lg shadow-gray-200"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSiteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-lg font-bold mb-4">{editingSite ? 'Edit Site' : 'Add Site'}</h2>
                        <form onSubmit={handleSiteSubmit(onSiteSubmit)}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Project</label>
                                    <select
                                        {...registerSite('project_id')}
                                        className="mt-1 block w-full border border-gray-300 p-2 rounded"
                                        required
                                    >
                                        <option value="">Select Project</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.reference_number} - {p.location}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Site Name</label>
                                    <input {...registerSite('name')} className="mt-1 block w-full border border-gray-300 p-2 rounded" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Site Code</label>
                                    <input {...registerSite('code')} className="mt-1 block w-full border border-gray-300 p-2 rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Address</label>
                                    <textarea {...registerSite('address')} rows="3" className="mt-1 block w-full border border-gray-300 p-2 rounded" />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowSiteModal(false); setEditingSite(null); }}
                                    className="px-4 py-2 border rounded hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                    {editingSite ? 'Update Site' : 'Create Site'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Projects;

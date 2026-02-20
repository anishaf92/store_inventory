import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import { Plus, MapPin, Calendar, FileText, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Projects = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const { register, handleSubmit, reset } = useForm();

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects');
            setProjects(res.data);
        } catch (err) {
            console.error("Failed to fetch projects", err);
        }
    };

    const onSubmit = async (data) => {
        try {
            await api.post('/projects', data);
            setShowModal(false);
            reset();
            fetchProjects();
            alert('Project created successfully');
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || 'Failed to create project';
            alert(`Error: ${msg}`);
        }
    };

    // Only PM and Owner can create projects
    const canCreate = user && ['PROJECT_MANAGER', 'OWNER'].includes(user.role);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Projects</h1>
                {canCreate && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-safety-orange text-white px-4 py-2 rounded-lg hover:bg-orange-600 font-medium inline-flex items-center shadow-md"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Project
                    </button>
                )}
            </div>

            {/* Project List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => (
                    <div
                        key={project.id}
                        onClick={() => { setSelectedProject(project); setShowDetailModal(true); }}
                        className="bg-white rounded-lg shadow-md p-6 border-t-4 border-industrial-grey hover:shadow-lg transition cursor-pointer"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">{project.reference_number}</h3>
                                <div className="flex items-center text-sm text-gray-500 mt-1">
                                    <MapPin className="w-3 h-3 mr-1" /> {project.location}
                                </div>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${project.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {project.status}
                            </span>
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
                        No projects found. {canCreate && 'Click "Add Project" to start one.'}
                    </div>
                )}
            </div>

            {/* Create Project Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-4">Add New Project</h2>
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
            {/* Project Detail Modal */}
            {showDetailModal && selectedProject && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-8 w-full max-w-2xl shadow-2xl relative">
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
                                <p className="text-base text-gray-800 font-medium">{selectedProject.start_date} &rarr; {selectedProject.expected_completion_date || 'Ongoing'}</p>
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
        </div>
    );
};


export default Projects;

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import { UserPlus, Users, Trash2, Edit2, AlertTriangle, RefreshCcw } from 'lucide-react';

export default function Admin() {
    const [stores, setStores] = useState([]);
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    // Modals visibility
    const [showUserModal, setShowUserModal] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    // Edit state
    const [editingUser, setEditingUser] = useState(null);

    const { register: registerUser, handleSubmit: handleUserSubmit, reset: resetUser, setValue: setUserValue } = useForm();

    const getUserProjectSummary = (user) => {
        if (!projects || projects.length === 0) return null;
        const managed = projects.filter(p => p.project_manager_id === user.id);
        const kept = projects.filter(p => p.store_keeper_id === user.id);
        const parts = [];
        if (managed.length > 0) {
            parts.push(`PM: ${managed[0].reference_number}`);
        }
        if (kept.length > 0) {
            parts.push(`Store Keeper: ${kept[0].reference_number}`);
        }
        return parts.length ? parts.join(' | ') : null;
    };

    const fetchAdminData = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const results = await Promise.allSettled([
                api.get('/admin/users'),
                api.get('/admin/stores'),
                api.get('/admin/projects')
            ]);

            const [usersRes, storesRes, projectsRes] = results;

            setUsers(usersRes.status === 'fulfilled' ? (usersRes.value.data || []) : []);
            setStores(storesRes.status === 'fulfilled' ? (storesRes.value.data || []) : []);
            const loadedProjects = projectsRes.status === 'fulfilled' ? (projectsRes.value.data || []) : [];
            setProjects(loadedProjects);

            const failed = results
                .filter(r => r.status === 'rejected')
                .map(r => r.reason?.response?.data?.message || r.reason?.message)
                .filter(Boolean);

            if (failed.length > 0) {
                setErrorMsg(`Some admin data failed to load: ${failed[0]}`);
            }
        } catch (error) {
            console.error('Failed to fetch admin data', error);
            setErrorMsg(error.response?.data?.message || 'Failed to load admin data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminData();
    }, []);

    // USER ACTIONS
    const onUserSubmit = async (data) => {
        try {
            if (editingUser) {
                await api.put(`/admin/users/${editingUser.id}`, data);
                alert('User updated successfully');
            } else {
                await api.post('/admin/users', data);
                alert('User created successfully');
            }
            closeUserModal();
            fetchAdminData();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to process user');
        }
    };

    const deleteUser = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.delete(`/admin/users/${id}`);
            fetchAdminData();
        } catch (error) {
            alert(error.response?.data?.message || 'Delete failed');
        }
    };

    const openEditUser = (user) => {
        setEditingUser(user);
        setUserValue('name', user.name);
        setUserValue('email', user.email);
        setUserValue('role', user.role);
        setUserValue('store_node_id', user.store_node_id || '');
        setShowUserModal(true);
    };

    const closeUserModal = () => {
        setEditingUser(null);
        resetUser();
        setShowUserModal(false);
    };

    const handleSystemReset = async () => {
        try {
            await api.post('/admin/system-reset');
            alert('System reset successful');
            window.location.reload();
        } catch (error) {
            alert('Reset failed');
        }
    };

    if (loading) return <div className="p-8">Loading administration dashboard...</div>;

    return (
        <div className="space-y-6 pb-24 relative">
            {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                    {errorMsg}
                </div>
            )}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">System Administration</h1>
                    <p className="text-gray-500 text-sm mt-1">Global management of users, nodes, and sites.</p>
                </div>
                <button
                    onClick={() => setShowResetConfirm(true)}
                    className="flex items-center text-xs font-black uppercase tracking-widest bg-red-50 text-red-600 px-4 py-2.5 rounded-xl hover:bg-red-100 transition-all border border-red-100 group"
                >
                    <RefreshCcw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" /> Reset System Data
                </button>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* User Management */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center">
                            <Users className="w-5 h-5 text-indigo-600 mr-2" />
                            <h2 className="text-lg font-bold text-gray-900">User Management</h2>
                        </div>
                        <button
                            onClick={() => { closeUserModal(); setShowUserModal(true); }}
                            className="flex items-center text-sm bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold"
                        >
                            <UserPlus className="w-4 h-4 mr-2" /> Create User
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50/50 border-b border-gray-50">
                                <tr>
                                    <th className="px-6 py-4 font-bold">User</th>
                                    <th className="px-6 py-4 font-bold">Email/Role</th>
                                    <th className="px-6 py-4 font-bold">Assignment</th>
                                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{u.name}</div>
                                            <div className="text-[10px] text-gray-400 tabular-nums">ID: {u.id.slice(0, 8)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-600 font-medium">{u.email}</div>
                                            <div className="mt-1">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase ${u.role === 'ADMIN' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                    u.role === 'PROJECT_MANAGER' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                        'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    }`}>
                                                    {u.role.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-gray-600">
                                            <div>
                                                {u.store?.name || <span className="text-gray-300 font-normal">Unassigned</span>}
                                            </div>
                                            {getUserProjectSummary(u) && (
                                                <div className="text-[10px] text-gray-400 mt-1">
                                                    {getUserProjectSummary(u)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => openEditUser(u)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors inline-block">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            {u.role !== 'ADMIN' && (
                                                <button onClick={() => deleteUser(u.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors inline-block">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Only user management is shown on this page.
                    Store/site and category management have been moved out of Admin. */}
            </div>

            {/* User Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                    <div className="bg-white rounded-[2rem] p-10 w-full max-w-lg shadow-2xl border border-white/20">
                        <div className="mb-8 text-left">
                            <h2 className="text-3xl font-black text-gray-900 mb-1">{editingUser ? 'Relocate/Update' : 'Onboard User'}</h2>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em]">{editingUser ? 'Modifying identity & permissions' : 'Adding system capacity'}</p>
                        </div>
                        <form onSubmit={handleUserSubmit(onUserSubmit)} className="space-y-5 text-left">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Display Name</label>
                                    <input {...registerUser('name', { required: true })} className="w-full border-gray-100 bg-gray-50/50 rounded-2xl p-4 text-sm font-bold border focus:ring-4 focus:ring-indigo-100 outline-none transition-all" placeholder="Enter name" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Primary Email</label>
                                    <input type="email" {...registerUser('email', { required: true })} className="w-full border-gray-100 bg-gray-50/50 rounded-2xl p-4 text-sm font-bold border focus:ring-4 focus:ring-indigo-100 outline-none transition-all" placeholder="user@company.com" />
                                </div>
                                {!editingUser && (
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Security Credential</label>
                                        <input type="password" {...registerUser('password', { required: true })} className="w-full border-gray-100 bg-gray-50/50 rounded-2xl p-4 text-sm font-bold border focus:ring-4 focus:ring-indigo-100 outline-none transition-all" placeholder="••••••••" />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">System Role</label>
                                    <select {...registerUser('role', { required: true })} className="w-full border-gray-100 bg-gray-50/50 rounded-2xl p-4 text-sm font-bold border focus:ring-4 focus:ring-indigo-100 outline-none transition-all">
                                        <option value="ADMIN">Administrator</option>
                                        <option value="PROJECT_MANAGER">Project Manager</option>
                                        <option value="STORE_KEEPER">Store Keeper</option>
                                        <option value="STORE_MANAGER">Store Manager</option>
                                        <option value="OWNER">Owner</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Store HQ</label>
                                    <select {...registerUser('store_node_id')} className="w-full border-gray-100 bg-gray-50/50 rounded-2xl p-4 text-sm font-bold border focus:ring-4 focus:ring-indigo-100 outline-none transition-all">
                                        <option value="">None / Floating</option>
                                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="pt-8 flex gap-3">
                                <button type="button" onClick={closeUserModal} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 rounded-2xl transition-all">Dismiss</button>
                                <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
                                    {editingUser ? 'Push Identity Update' : 'Initialize Protocol'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Confirmation */}
            {showResetConfirm && (
                <div className="fixed inset-0 bg-red-900/40 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
                    <div className="bg-white rounded-[2.5rem] p-12 max-w-lg w-full shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] border-4 border-red-50 text-left">
                        <div className="bg-red-50 w-20 h-20 rounded-3xl flex items-center justify-center mb-8">
                            <AlertTriangle className="w-10 h-10 text-red-600 animate-pulse" />
                        </div>
                        <h2 className="text-4xl font-black text-gray-900 leading-tight mb-4">Atomic Flush Confirmation</h2>
                        <p className="text-gray-500 font-bold mb-8 leading-relaxed">
                            Warning: This operation will <span className="text-red-600">permanently erase</span> all inventory levels, historic transfers, requests, and sites. Only system users will persist.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleSystemReset}
                                className="w-full py-5 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-red-700 shadow-2xl shadow-red-200 transition-all active:scale-95"
                            >
                                Execute System Reset
                            </button>
                            <button
                                onClick={() => setShowResetConfirm(false)}
                                className="w-full py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:bg-gray-50 rounded-2xl transition-all"
                            >
                                Abort Operation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

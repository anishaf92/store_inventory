import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../services/api';
import { Plus, Building2, MapPin, UserPlus, Users, Trash2, Edit2, AlertTriangle, RefreshCcw, Layers, Tag, X } from 'lucide-react';

export default function Admin() {
    const [stores, setStores] = useState([]);
    const [sites, setSites] = useState([]);
    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals visibility
    const [showUserModal, setShowUserModal] = useState(false);
    const [showStoreModal, setShowStoreModal] = useState(false);
    const [showSiteModal, setShowSiteModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    // Edit state
    const [editingUser, setEditingUser] = useState(null);
    const [editingStore, setEditingStore] = useState(null);
    const [editingSite, setEditingSite] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);

    const { register: registerUser, handleSubmit: handleUserSubmit, reset: resetUser, setValue: setUserValue } = useForm();
    const { register: registerStore, handleSubmit: handleStoreSubmit, reset: resetStore, setValue: setStoreValue } = useForm();
    const { register: registerSite, handleSubmit: handleSiteSubmit, reset: resetSite, setValue: setSiteValue } = useForm();

    const { register: registerCat, handleSubmit: handleCatSubmit, reset: resetCat, setValue: setCatValue, control: catControl } = useForm({
        defaultValues: { specification_schema: { fields: [] } }
    });
    const { fields: specFields, append: appendSpec, remove: removeSpec } = useFieldArray({
        control: catControl,
        name: "specification_schema.fields"
    });

    const fetchAdminData = async () => {
        setLoading(true);
        try {
            const [usersRes, storesRes, sitesRes, catsRes] = await Promise.all([
                api.get('/admin/users'),
                api.get('/admin/stores'),
                api.get('/admin/sites'),
                api.get('/inventory/categories')
            ]);
            setUsers(usersRes.data || []);
            setStores(storesRes.data || []);
            setSites(sitesRes.data || []);
            setCategories(catsRes.data || []);
        } catch (error) {
            console.error('Failed to fetch admin data', error);
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

    // STORE ACTIONS
    const onStoreSubmit = async (data) => {
        try {
            if (editingStore) {
                await api.put(`/admin/stores/${editingStore.id}`, data);
                alert('Store Node updated');
            } else {
                await api.post('/admin/stores', data);
                alert('Store Node created');
            }
            closeStoreModal();
            fetchAdminData();
        } catch (error) {
            alert('Operation failed');
        }
    };

    const deleteStore = async (id) => {
        if (!window.confirm('Delete this store? This might fail if it has linked inventory/sites.')) return;
        try {
            await api.delete(`/admin/stores/${id}`);
            fetchAdminData();
        } catch (error) {
            alert('Cannot delete store with dependencies');
        }
    };

    const openEditStore = (store) => {
        setEditingStore(store);
        setStoreValue('name', store.name);
        setStoreValue('code', store.code);
        setStoreValue('location', store.location);
        setShowStoreModal(true);
    };

    const closeStoreModal = () => {
        setEditingStore(null);
        resetStore();
        setShowStoreModal(false);
    };

    // SITE ACTIONS
    const onSiteSubmit = async (data) => {
        try {
            if (editingSite) {
                await api.put(`/admin/sites/${editingSite.id}`, data);
                alert('Site Location updated');
            } else {
                await api.post('/admin/sites', data);
                alert('Site Location created');
            }
            closeSiteModal();
            fetchAdminData();
        } catch (error) {
            alert('Operation failed');
        }
    };

    const deleteSite = async (id) => {
        if (!window.confirm('Delete this site?')) return;
        try {
            await api.delete(`/admin/sites/${id}`);
            fetchAdminData();
        } catch (error) {
            alert('Delete failed');
        }
    };

    const openEditSite = (site) => {
        setEditingSite(site);
        setSiteValue('name', site.name);
        setSiteValue('code', site.code);
        setSiteValue('store_node_id', site.store_node_id || '');
        setShowSiteModal(true);
    };

    const closeSiteModal = () => {
        setEditingSite(null);
        resetSite();
        setShowSiteModal(false);
    };

    // CATEGORY ACTIONS
    const onCatSubmit = async (data) => {
        // Auto-generate keys and types for specifications
        if (data.specification_schema?.fields) {
            data.specification_schema.fields = data.specification_schema.fields.map(f => ({
                ...f,
                key: f.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                label: f.name,
                type: f.options ? 'select' : 'string'
            }));
        }

        try {
            if (editingCategory) {
                await api.put(`/inventory/categories/${editingCategory.id}`, data);
                alert('Category updated');
            } else {
                await api.post('/inventory/categories', data);
                alert('Category created');
            }
            closeCatModal();
            fetchAdminData();
        } catch (error) {
            alert('Operation failed');
        }
    };

    const openEditCat = (cat) => {
        setEditingCategory(cat);
        setCatValue('name', cat.name);
        setCatValue('description', cat.description);
        setCatValue('specification_schema.fields', cat.specification_schema?.fields || []);
        setShowCategoryModal(true);
    };

    const closeCatModal = () => {
        setEditingCategory(null);
        resetCat({ specification_schema: { fields: [] } });
        setShowCategoryModal(false);
    };

    const deleteCat = async (id) => {
        if (!window.confirm('Delete this category? Items linked to it may be affected.')) return;
        try {
            await api.delete(`/inventory/categories/${id}`);
            fetchAdminData();
        } catch (error) {
            alert('Delete failed');
        }
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

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* User Management */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden col-span-1 xl:col-span-2">
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
                                            {u.store?.name || <span className="text-gray-300 font-normal">Unassigned</span>}
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

                {/* Category Management */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden col-span-1 xl:col-span-2">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center">
                            <Layers className="w-5 h-5 text-purple-600 mr-2" />
                            <h2 className="text-lg font-bold text-gray-900">Material Categories</h2>
                        </div>
                        <button
                            onClick={() => { closeCatModal(); setShowCategoryModal(true); }}
                            className="flex items-center text-sm bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-all font-bold"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Add Category
                        </button>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categories.map(cat => (
                            <div key={cat.id} className="border border-gray-100 p-5 rounded-2xl bg-gray-50/30 group hover:border-purple-200 transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-black text-gray-900 flex items-center">
                                            <Tag className="w-3.5 h-3.5 mr-2 text-purple-400" /> {cat.name}
                                        </h4>
                                        <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">{cat.description || 'No description'}</p>
                                    </div>
                                    <div className="flex space-x-1">
                                        <button onClick={() => openEditCat(cat)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => deleteCat(cat.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-4">
                                    {cat.specification_schema?.fields?.map(f => (
                                        <span key={f.key} className="px-2 py-0.5 rounded-lg bg-white border border-gray-100 text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                                            {f.label} ({f.type})
                                        </span>
                                    )) || <span className="text-[8px] text-gray-300 italic">No custom specs</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Store Nodes */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <div className="flex items-center">
                            <Building2 className="w-5 h-5 text-safety-orange mr-2" />
                            <h2 className="text-lg font-bold text-gray-900">Store Nodes</h2>
                        </div>
                        <button
                            onClick={() => { closeStoreModal(); setShowStoreModal(true); }}
                            className="bg-safety-orange text-white p-2 rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-100"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        {stores.map(s => (
                            <div key={s.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-2xl bg-gray-50/30 group hover:border-orange-200 transition-colors">
                                <div>
                                    <h4 className="font-extrabold text-gray-900">{s.name}</h4>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-0.5">{s.code} • {s.location}</p>
                                </div>
                                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditStore(s)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => deleteStore(s.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Site Locations */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <div className="flex items-center">
                            <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                            <h2 className="text-lg font-bold text-gray-900">Site Locations</h2>
                        </div>
                        <button
                            onClick={() => { closeSiteModal(); setShowSiteModal(true); }}
                            className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        {sites.map(s => (
                            <div key={s.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-2xl bg-gray-50/30 group hover:border-blue-200 transition-colors">
                                <div>
                                    <h4 className="font-extrabold text-gray-900">{s.name}</h4>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-0.5">{s.code} • Linked to {s.store?.name || 'Nothing'}</p>
                                </div>
                                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditSite(s)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => deleteSite(s.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Category Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                    <div className="bg-white rounded-[2rem] p-10 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="mb-8">
                            <h2 className="text-3xl font-black text-gray-900 mb-1">{editingCategory ? 'Edit Blueprints' : 'New Material Category'}</h2>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em]">Define custom specification schemas</p>
                        </div>
                        <form onSubmit={handleCatSubmit(onCatSubmit)} className="space-y-6">
                            <div className="grid grid-cols-2 gap-5 text-left">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Category Name</label>
                                    <input {...registerCat('name', { required: true })} className="w-full border-gray-100 bg-gray-50/50 rounded-2xl p-4 text-sm font-bold border outline-none" placeholder="e.g. Electrical Cables" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
                                    <textarea {...registerCat('description')} className="w-full border-gray-100 bg-gray-50/50 rounded-2xl p-4 text-sm font-bold border outline-none h-24" placeholder="Brief metadata..." />
                                </div>

                                <div className="col-span-2 bg-gray-50/50 p-6 rounded-3xl border border-dashed border-gray-200">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-900">Specification Blueprint</h3>
                                        <button
                                            type="button"
                                            onClick={() => appendSpec({ name: '', options: '' })}
                                            className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-all uppercase tracking-widest"
                                        >
                                            Add Spec Field
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {specFields.map((field, index) => (
                                            <div key={field.id} className="grid grid-cols-12 gap-3 items-end p-4 bg-white rounded-2xl border border-gray-100 shadow-sm relative group">
                                                <button type="button" onClick={() => removeSpec(index)} className="absolute -top-2 -right-2 bg-red-50 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X className="w-3 h-3" />
                                                </button>
                                                <div className="col-span-5">
                                                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Spec Name</label>
                                                    <input
                                                        {...registerCat(`specification_schema.fields.${index}.name`, { required: true })}
                                                        className="w-full bg-gray-50 rounded-lg p-3 text-[10px] font-bold border-none"
                                                        placeholder="e.g. Diameter"
                                                    />
                                                </div>
                                                <div className="col-span-7">
                                                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Options / Values (Comma Separated)</label>
                                                    <input
                                                        {...registerCat(`specification_schema.fields.${index}.options`)}
                                                        className="w-full bg-gray-50 rounded-lg p-3 text-[10px] font-bold border-none"
                                                        placeholder="e.g. PVC, GI, CPVC (Optional)"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        {specFields.length === 0 && (
                                            <p className="text-[10px] text-gray-400 text-center py-4 italic">No custom specifications defined for this category.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="pt-6 flex gap-3">
                                <button type="button" onClick={closeCatModal} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 rounded-2xl transition-all">Dismiss</button>
                                <button type="submit" className="flex-[2] py-4 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-purple-700 transition-all shadow-xl shadow-purple-100">
                                    {editingCategory ? 'Finalize Schema' : 'Initialize Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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

            {/* Store Modal */}
            {showStoreModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                    <div className="bg-white rounded-[2rem] p-10 w-full max-w-md">
                        <h2 className="text-3xl font-black text-gray-900 mb-6 text-left">{editingStore ? 'Update Hub' : 'New Store Node'}</h2>
                        <form onSubmit={handleStoreSubmit(onStoreSubmit)} className="space-y-4 text-left">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Label</label>
                                <input {...registerStore('name', { required: true })} className="w-full border-gray-100 bg-gray-50 rounded-2xl p-4 text-sm font-bold border outline-none" placeholder="e.g. Al Quoz Hub" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Logical Code</label>
                                <input {...registerStore('code', { required: true })} className="w-full border-gray-100 bg-gray-50 rounded-2xl p-4 text-sm font-bold border outline-none" placeholder="WH-01" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Coordinate</label>
                                <input {...registerStore('location')} className="w-full border-gray-100 bg-gray-50 rounded-2xl p-4 text-sm font-bold border outline-none" placeholder="Physical Address" />
                            </div>
                            <div className="pt-8 flex gap-3">
                                <button type="button" onClick={closeStoreModal} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest rounded-2xl hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="flex-[2] py-4 bg-safety-orange text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-orange-600 shadow-xl shadow-orange-100">
                                    {editingStore ? 'Sync Hub' : 'Initialize Node'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Site Modal */}
            {showSiteModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                    <div className="bg-white rounded-[2rem] p-10 w-full max-w-md">
                        <h2 className="text-3xl font-black text-gray-900 mb-6 text-left">{editingSite ? 'Modify Site' : 'Provision Site'}</h2>
                        <form onSubmit={handleSiteSubmit(onSiteSubmit)} className="space-y-4 text-left">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Location Identity</label>
                                <input {...registerSite('name', { required: true })} className="w-full border-gray-100 bg-gray-50 rounded-2xl p-4 text-sm font-bold border outline-none" placeholder="Site Name" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Registry ID</label>
                                <input {...registerSite('code', { required: true })} className="w-full border-gray-100 bg-gray-50 rounded-2xl p-4 text-sm font-bold border outline-none" placeholder="SITE-X" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Feeding Node</label>
                                <select {...registerSite('store_node_id', { required: true })} className="w-full border-gray-100 bg-gray-50 rounded-2xl p-4 text-sm font-bold border outline-none">
                                    <option value="">-- No Store Assigned --</option>
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="pt-8 flex gap-3">
                                <button type="button" onClick={closeSiteModal} className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest rounded-2xl hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100">
                                    {editingSite ? 'Commit Changes' : 'Establish Site'}
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

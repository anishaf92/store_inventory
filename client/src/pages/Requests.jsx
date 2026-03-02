import React, { useState, useEffect, useContext } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Plus, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

const Requests = () => {
    const { user } = useContext(AuthContext);
    const [requests, setRequests] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [items, setItems] = useState([]); // For dropdown
    const [projects, setProjects] = useState([]); // For dropdown
    const [categories, setCategories] = useState([]); // For conversion modal
    const [stores, setStores] = useState([]);
    const [sites, setSites] = useState([]);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [itemToConvert, setItemToConvert] = useState(null);
    const [distributionData, setDistributionData] = useState(null);
    const [showDistributionModal, setShowDistributionModal] = useState(false);

    const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm({
        defaultValues: { items: [{ item_id: '', quantity: 1, custom_item_name: '' }] }
    });
    const { fields, append, remove } = useFieldArray({ control, name: "items" });
    const watchedItems = watch('items') || [];

    useEffect(() => {
        fetchRequests();
        fetchItems();
        fetchProjects();
        fetchCategories();
        fetchStores();
        fetchSites();
    }, []);

    const fetchStores = async () => {
        try {
            const res = await api.get('/requests/stores');
            setStores(res.data || []);
        } catch (err) {
            console.error('Failed to fetch stores', err);
        }
    };

    const fetchSites = async () => {
        try {
            const res = await api.get('/requests/sites');
            setSites(res.data || []);
        } catch (err) {
            console.error('Failed to fetch sites', err);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await api.get('/inventory/categories');
            setCategories(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects');
            setProjects(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchRequests = async () => {
        try {
            const res = await api.get('/requests');
            setRequests(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchItems = async () => {
        try {
            const res = await api.get('/inventory/items');
            setItems(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchDistribution = async (itemId) => {
        try {
            const res = await api.get(`/inventory/items/${itemId}/distribution`);
            setDistributionData(res.data);
            setShowDistributionModal(true);
        } catch (err) {
            alert('Failed to fetch stock distribution');
        }
    };

    const onSubmit = async (data) => {
        try {
            let requestType = user.role === 'PROJECT_MANAGER' ? 'MR' : 'PR_STORE';

            // Allow manual override if they select TRANSFER_REQUEST from the UI
            if (data.type) {
                requestType = data.type;
            }

            // Fallback for store node and site location
            const payload_store_id = data.store_node_id || user.store_node_id || '4b902617-60ea-4fa6-8114-64c450754dce';
            const payload_site_id = data.site_location_id || 'aa9f8307-d170-4c9d-8347-9549bbb865a2'; // default from migration

            await api.post('/requests', {
                ...data,
                type: requestType,
                project_id: data.project_id || null,
                store_node_id: payload_store_id,
                site_location_id: payload_site_id
            });
            setShowModal(false);
            reset();
            fetchRequests();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to create request');
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await api.put(`/requests/${id}/status`, { status });
            fetchRequests();
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'FULFILLED': return <CheckCircle className="w-5 h-5 text-emerald-600" />;
            case 'PARTIALLY_FULFILLED': return <Clock className="w-5 h-5 text-amber-500" />;
            case 'REQUESTED': return <Clock className="w-5 h-5 text-blue-400" />;
            case 'APPROVED': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'ITEM_ADDED': return <CheckCircle className="w-5 h-5 text-blue-500" />;
            case 'IN_PROGRESS': return <Clock className="w-5 h-5 text-blue-400" />;
            case 'REJECTED': return <XCircle className="w-5 h-5 text-red-500" />;
            default: return <Clock className="w-5 h-5 text-yellow-500" />;
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'REQUESTED': return 'Requested';
            case 'PARTIALLY_FULFILLED': return 'Partially Fulfilled';
            case 'FULFILLED': return 'Fulfilled';
            case 'APPROVED': return 'Approved';
            case 'REJECTED': return 'Rejected';
            case 'PENDING': return 'Requested';
            case 'IN_PROGRESS': return 'In Progress';
            default: return status;
        }
    };

    const openManageModal = (request) => {
        setSelectedRequest(request);
        setShowManageModal(true);
    };

    const handleFulfillItem = async (itemId, action, extraData = {}) => {
        try {
            await api.put(`/requests/items/${itemId}/fulfill`, { action, ...extraData });
            const res = await api.get('/requests');
            setRequests(res.data);
            if (selectedRequest) {
                const updated = res.data.find(r => r.id === selectedRequest.id);
                setSelectedRequest(updated);
            }
            if (action === 'PROCURE_CONVERT') setShowConvertModal(false);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update item');
        }
    };

    const handleAddSite = async () => {
        if (user.role !== 'PROJECT_MANAGER') return;

        const name = window.prompt('Enter new site name');
        if (!name) return;
        const code = window.prompt('Enter site code (optional)');
        const address = window.prompt('Enter site address (optional)');

        try {
            await api.post('/requests/sites', { name, code, address });
            await fetchSites();
            alert('Site created. Admin must map it to a store before stock can flow.');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create site');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Requisitions (MR)</h1>
                {(user.role === 'PROJECT_MANAGER' || user.role === 'STORE_KEEPER') && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-safety-orange text-white px-4 py-2 rounded-lg hover:bg-orange-600 font-medium inline-flex items-center shadow-md"
                    >
                        <Plus className="w-4 h-4 mr-2" /> New Request
                    </button>
                )}
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store/Node</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project/Site</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requester</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Req. Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Status</th>
                            {(user.role !== 'PROJECT_MANAGER' || true) && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {requests.map(req => (
                            <tr key={req.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {req.id.slice(0, 8)}...
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${req.type === 'MR' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                        {req.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="font-bold text-gray-700">{req.store?.name || '-'}</div>
                                    <div className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase">{req.store?.code || 'NO-ID'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="font-medium text-gray-700">{req.Project?.reference_number || 'N/A'}</div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-tighter">{req.site?.name || 'General Storage'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className={`font-bold ${user.role === 'STORE_MANAGER' ? 'text-indigo-600' : 'text-gray-700'}`}>{req.requester?.name}</div>
                                    <div className="text-[10px] text-gray-400 uppercase tracking-tighter">{req.requester?.role?.replace('_', ' ')}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(req.required_date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap flex items-center border-r">
                                    {getStatusIcon(req.status)}
                                    <span className="ml-2 text-sm text-gray-700 font-medium">
                                        {getStatusLabel(req.status)}
                                    </span>
                                </td>
                                {(user.role !== 'PROJECT_MANAGER' || true) && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {(user.role === 'OWNER' || user.role === 'STORE_MANAGER') &&
                                            (req.type === 'PR' || req.type === 'PR_STORE') && req.status === 'PENDING' && (
                                                <div className="space-x-2">
                                                    <button onClick={() => updateStatus(req.id, 'APPROVED')} className="text-green-600 hover:text-green-900 font-medium">Approve</button>
                                                    <button onClick={() => updateStatus(req.id, 'REJECTED')} className="text-red-600 hover:text-red-900 font-medium">Reject</button>
                                                </div>
                                            )}

                                        <div className="space-x-2 mt-1">
                                            {(user.role === 'OWNER' || user.role === 'STORE_MANAGER' || user.role === 'PROJECT_MANAGER') && req.status !== 'PENDING' && (
                                                <button onClick={() => openManageModal(req)} className="text-blue-600 hover:text-blue-900 font-medium">
                                                    {req.status === 'FULFILLED' || req.status === 'COMPLETED' ? 'View' : (user.role === 'PROJECT_MANAGER' ? 'Update Status' : 'Manage')}
                                                </button>
                                            )}

                                            {user.role === 'STORE_KEEPER' && (
                                                <>
                                                    {req.type === 'MR' && (req.status === 'REQUESTED' || req.status === 'APPROVED' || req.status === 'PARTIALLY_FULFILLED' || req.status === 'PENDING' || req.status === 'FULFILLED') && (
                                                        <button onClick={() => openManageModal(req)} className="text-blue-600 hover:text-blue-900 font-medium">{req.status === 'FULFILLED' ? 'View' : 'Manage'}</button>
                                                    )}
                                                    {req.type === 'PR' && (
                                                        <button onClick={() => openManageModal(req)} className="text-blue-600 hover:text-blue-900 font-medium">{req.status === 'FULFILLED' ? 'View' : 'Manage'}</button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Manage Request Modal */}
            {showManageModal && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold">Manage Request: {selectedRequest.id.slice(0, 8)}...</h2>
                                <p className="text-xs text-gray-500">Status: <span className="font-bold uppercase">{selectedRequest.status}</span></p>
                            </div>
                            <div className="flex items-center space-x-3">
                                {user.role === 'PROJECT_MANAGER' && selectedRequest.status === 'FULFILLED' && (
                                    <button
                                        onClick={async () => {
                                            for (const item of selectedRequest.RequestItems) {
                                                if (item.status === 'ISSUED') await handleFulfillItem(item.id, 'PM_RECEIVE');
                                            }
                                        }}
                                        className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-md"
                                    >
                                        Mark All Received
                                    </button>
                                )}
                                {user.role === 'PROJECT_MANAGER' && selectedRequest.status === 'RECEIVED' && (
                                    <button
                                        onClick={async () => {
                                            for (const item of selectedRequest.RequestItems) {
                                                if (item.status === 'RECEIVED') await handleFulfillItem(item.id, 'PM_COMPLETE');
                                            }
                                        }}
                                        className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-md"
                                    >
                                        Mark All Completed
                                    </button>
                                )}
                                <button onClick={() => setShowManageModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <table className="min-w-full divide-y divide-gray-200 mb-6 font-sans">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Item</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Qty</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Issued</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Stock</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase border-r text-center">Status</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {selectedRequest.RequestItems?.map(item => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="font-bold text-gray-900">{item.Item?.name || item.custom_item_name}</div>
                                            <div className="text-[10px] text-gray-500 uppercase tracking-tighter font-medium">{item.Item?.make || 'Custom/Other'}</div>
                                            {item.specifications && Object.keys(item.specifications).length > 0 && (
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {Object.entries(item.specifications).map(([k, v]) => (
                                                        <span key={k} className="text-[9px] bg-gray-100 px-1 rounded text-gray-600 font-bold">{k}: {v}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium">{item.quantity} {item.Item?.unit || 'pcs'}</td>
                                        <td className="px-4 py-3 text-sm text-blue-600 font-bold">{item.issued_quantity}</td>
                                        <td className="px-4 py-3 text-sm">
                                            {item.item_id ? (
                                                <div className="flex flex-col">
                                                    <span className={`font-bold ${item.Item?.current_stock < (item.quantity - item.issued_quantity) ? 'text-red-500' : 'text-green-600'}`}>
                                                        {item.Item?.current_stock}
                                                    </span>
                                                    <button
                                                        onClick={() => fetchDistribution(item.item_id)}
                                                        className="text-[9px] text-blue-500 font-bold hover:underline mt-1"
                                                    >
                                                        Check Other Sites
                                                    </button>
                                                </div>
                                            ) : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-center border-r">
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${item.status === 'ISSUED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                item.status === 'NEEDS_PROCUREMENT' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-blue-50 text-blue-700 border-blue-200'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm space-x-2">
                                            {item.status !== 'ISSUED' && (
                                                <>
                                                    {/* ===== MR ACTIONS ===== */}
                                                    {(user.role === 'STORE_KEEPER' || user.role === 'OWNER' || user.role === 'STORE_MANAGER' || user.role === 'PROJECT_MANAGER') && selectedRequest.type === 'MR' && (() => {
                                                        const stock = item.Item?.current_stock ?? 0;
                                                        const needed = item.quantity - item.issued_quantity;
                                                        return (
                                                            <>
                                                                {/* Case 1: Inventory item WITH enough stock → Issue */}
                                                                {item.item_id && stock >= needed && item.status !== 'NEEDS_PROCUREMENT' && (
                                                                    <button
                                                                        onClick={() => handleFulfillItem(item.id, 'ISSUE')}
                                                                        className="text-xs px-2 py-1 rounded-lg border font-bold transition-all bg-green-600 text-white border-green-700 hover:bg-green-700 shadow-md"
                                                                    >
                                                                        Issue Stock
                                                                    </button>
                                                                )}

                                                                {/* Case 2: Inventory item WITHOUT enough stock → Raise PR */}
                                                                {item.item_id && stock < needed && item.status !== 'NEEDS_PROCUREMENT' && (
                                                                    <button
                                                                        onClick={() => handleFulfillItem(item.id, 'PROCUREMENT')}
                                                                        className="text-xs px-2 py-1 rounded-lg border font-bold transition-all bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-md"
                                                                    >
                                                                        Raise PR
                                                                    </button>
                                                                )}

                                                                {/* Show "PR Raised" badge if already raised */}
                                                                {item.item_id && item.status === 'NEEDS_PROCUREMENT' && (
                                                                    <span className="text-xs px-2 py-1 rounded-lg border font-bold bg-gray-100 text-gray-400 border-gray-200">
                                                                        PR Raised
                                                                    </span>
                                                                )}

                                                                {/* Case 3: Custom item (no item_id) → Raise PR & Add to Inventory */}
                                                                {!item.item_id && (
                                                                    <button
                                                                        onClick={() => { setItemToConvert(item); setShowConvertModal(true); }}
                                                                        disabled={item.status === 'NEEDS_PROCUREMENT'}
                                                                        className={`text-xs px-2 py-1 rounded-lg border font-bold transition-all ${item.status === 'NEEDS_PROCUREMENT'
                                                                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                                            : 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-md'
                                                                            }`}
                                                                    >
                                                                        {item.status === 'NEEDS_PROCUREMENT' ? 'PR Raised' : 'Raise PR & Add to Inventory'}
                                                                    </button>
                                                                )}
                                                            </>
                                                        );
                                                    })()}

                                                    {/* ===== PR / PR_STORE ACTIONS ===== */}
                                                    {/* Owner/Manager: Add custom items to Inventory on PR / PR_STORE */}
                                                    {(user.role === 'OWNER' || user.role === 'STORE_MANAGER') && (selectedRequest.type === 'PR' || selectedRequest.type === 'PR_STORE') && !item.item_id && (
                                                        <button
                                                            onClick={() => { setItemToConvert(item); setShowConvertModal(true); }}
                                                            className="text-xs px-2 py-1 rounded-lg border font-bold bg-blue-600 text-white border-blue-700 hover:bg-blue-700 shadow-md"
                                                        >
                                                            Add to Inventory
                                                        </button>
                                                    )}

                                                    {/* Store Keeper: Confirm Receipt for PR (Issue to site) or PR_STORE (Add to store stock) */}
                                                    {user.role === 'STORE_KEEPER' && (selectedRequest.type === 'PR' || selectedRequest.type === 'PR_STORE') && item.item_id && (
                                                        <button
                                                            onClick={() => handleFulfillItem(item.id, selectedRequest.type === 'PR' ? 'ISSUE' : 'RECEIVE')}
                                                            className="text-xs px-2 py-1 rounded-lg border font-bold bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-md"
                                                        >
                                                            {selectedRequest.type === 'PR' ? 'Confirm Receipt & Issue' : 'Confirm Receipt & Add to Stock'}
                                                        </button>
                                                    )}

                                                    {/* PM Status Updates */}
                                                    {user.role === 'PROJECT_MANAGER' && item.status === 'ISSUED' && (
                                                        <button
                                                            onClick={() => handleFulfillItem(item.id, 'PM_RECEIVE')}
                                                            className="text-xs px-2 py-1 rounded-lg border font-bold bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 shadow-md"
                                                        >
                                                            Mark Received
                                                        </button>
                                                    )}
                                                    {user.role === 'PROJECT_MANAGER' && item.status === 'RECEIVED' && (
                                                        <button
                                                            onClick={() => handleFulfillItem(item.id, 'PM_COMPLETE')}
                                                            className="text-xs px-2 py-1 rounded-lg border font-bold bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-md"
                                                        >
                                                            Mark Completed
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* New Request Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">Create Requisition</h2>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">Project <span className="text-red-500">*</span></label>
                                    <select {...register('project_id', { required: user.role === 'PROJECT_MANAGER' })} className="border p-2 rounded-lg w-full bg-gray-50">
                                        <option value="">{user.role === 'STORE_KEEPER' ? 'General Stock (Optional)' : 'Select Project'}</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.reference_number} - {p.location}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700">Required Date <span className="text-red-500">*</span></label>
                                    <input type="date" {...register('required_date', { required: true })} className="border p-2 rounded-lg w-full bg-gray-50" />
                                </div>

                                {user.role === 'PROJECT_MANAGER' && (
                                    <div className="col-span-2">
                                        <div className="flex justify-between items-center">
                                            <label className="block text-sm font-bold text-gray-700">
                                                Destination Site <span className="text-red-500">*</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleAddSite}
                                                className="text-xs font-bold text-blue-600 hover:underline"
                                            >
                                                + Add New Site
                                            </button>
                                        </div>
                                        <select {...register('site_location_id', { required: true })} className="border p-2 rounded-lg w-full bg-gray-50 mt-1">
                                            <option value="">Select Project Site</option>
                                            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {user.role === 'STORE_KEEPER' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700">Request Type <span className="text-red-500">*</span></label>
                                            <select {...register('type', { required: true })} className="border p-2 rounded-lg w-full bg-gray-50">
                                                <option value="PR_STORE">Purchase Requisition (Store Restock)</option>
                                                <option value="TRANSFER_REQUEST">Transfer Request (Store to Site)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700">Source Store</label>
                                            <select {...register('store_node_id', { required: true })} className="border p-2 rounded-lg w-full bg-gray-50">
                                                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-bold text-gray-700">Destination Site (If Transfer)</label>
                                            <select {...register('site_location_id')} className="border p-2 rounded-lg w-full bg-gray-50">
                                                <option value="">-- None --</option>
                                                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 mb-4 text-[10px] text-blue-700">
                                <p className="font-bold mb-1 uppercase tracking-widest">💡 Instructions:</p>
                                <ul className="list-disc ml-4 space-y-0.5 font-medium">
                                    <li>Select an item from Inventory <b>OR</b> type a custom name.</li>
                                    <li>If you are a Project Manager, a <b>Project</b> is mandatory.</li>
                                </ul>
                            </div>

                            {fields.map((field, index) => (
                                <div key={field.id} className="space-y-4 mt-6 p-6 border rounded-3xl bg-gray-50/50 shadow-sm relative group/row">
                                    <div className="absolute -top-3 -right-3">
                                        <button type="button" onClick={() => remove(index)} className="bg-white text-red-400 p-2 hover:bg-red-50 rounded-full shadow-md border border-red-50 transition-all opacity-0 group-hover/row:opacity-100">
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Step 1: Choose Item */}
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">1. Select from Inventory (OR leave empty for New Item)</label>
                                            <select {...register(`items.${index}.item_id`)} className="border p-2 rounded-xl w-full bg-white text-sm font-bold focus:ring-2 focus:ring-safety-orange outline-none shadow-inner transition-all">
                                                <option value="">-- NEW ITEM --</option>
                                                {items.map(i => (
                                                    <option key={i.id} value={i.id}>
                                                        {i.name} {user.role !== 'PROJECT_MANAGER' ? `(Stock: ${i.current_stock})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            {(() => {
                                                const selectedId = watchedItems[index]?.item_id;
                                                const item = items.find(i => i.id === selectedId);
                                                if (item?.specifications && Object.keys(item.specifications).length > 0) {
                                                    return (
                                                        <div className="mt-2 flex flex-wrap gap-1 p-1.5 bg-white/50 rounded-lg">
                                                            {Object.entries(item.specifications).map(([k, v]) => (
                                                                <span key={k} className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold border border-indigo-100">
                                                                    {k}: {v}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>

                                        {!watchedItems[index]?.item_id && (
                                            <div>
                                                <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">New Item Name</label>
                                                <input
                                                    type="text"
                                                    {...register(`items.${index}.custom_item_name`, {
                                                        validate: (val, formValues) => {
                                                            const itemId = formValues.items[index].item_id;
                                                            if (!itemId && !val) return "Name required for new item";
                                                            return true;
                                                        }
                                                    })}
                                                    placeholder="e.g. Specialized Tool"
                                                    className={`border p-2.5 rounded-xl w-full bg-white text-sm font-bold focus:ring-2 outline-none shadow-inner ${errors.items?.[index]?.custom_item_name ? 'border-red-500' : 'focus:ring-safety-orange'}`}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Step 2 & 3: Quantity & Category */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">2. Quantity</label>
                                            <input type="number" {...register(`items.${index}.quantity`, { required: true, min: 1 })} placeholder="Qty" className="border p-2.5 rounded-xl w-full bg-white text-sm font-bold focus:ring-2 focus:ring-safety-orange outline-none shadow-inner" />
                                        </div>
                                        {!watchedItems[index]?.item_id && (
                                            <div>
                                                <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">3. Item Category</label>
                                                <select
                                                    {...register(`items.${index}.category_id`, { required: !field.item_id })}
                                                    className="border p-2.5 rounded-xl w-full bg-white text-sm font-bold focus:ring-2 focus:ring-safety-orange outline-none shadow-inner"
                                                >
                                                    <option value="">-- Select Category --</option>
                                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Step 4: Specifications (Overrides for Existing OR Specs for New) */}
                                    {(() => {
                                        const selectedId = watchedItems[index]?.item_id;
                                        const existingItem = items.find(i => i.id === selectedId);
                                        const catId = selectedId ? existingItem?.category_id : watchedItems[index]?.category_id;
                                        const selectedCat = categories.find(c => c.id === catId);

                                        if (selectedCat?.specification_schema?.fields?.length > 0) {
                                            return (
                                                <div className="mt-2">
                                                    <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                                        <div className="flex items-center space-x-2 mb-3">
                                                            <div className="h-px bg-gray-100 flex-1"></div>
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                                {selectedId ? '4. Specification Overrides (Optional)' : '4. Specifications'}
                                                            </span>
                                                            <div className="h-px bg-gray-100 flex-1"></div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {selectedCat.specification_schema.fields.map(f => (
                                                                <div key={f.key}>
                                                                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-tighter mb-1">{f.label}</label>
                                                                    {f.type === 'select' ? (
                                                                        <select
                                                                            {...register(`items.${index}.specifications.${f.key}`)}
                                                                            className="border p-2.5 rounded-xl w-full text-xs font-bold bg-gray-50 focus:ring-2 focus:ring-safety-orange outline-none"
                                                                        >
                                                                            <option value="">-- Use Standard --</option>
                                                                            {f.options.split(',').map(opt => (
                                                                                <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                                                                            ))}
                                                                        </select>
                                                                    ) : (
                                                                        <input
                                                                            type="text"
                                                                            {...register(`items.${index}.specifications.${f.key}`)}
                                                                            className="border p-2.5 rounded-xl w-full text-xs font-bold bg-gray-50 focus:ring-2 focus:ring-safety-orange outline-none"
                                                                            placeholder={`Enter ${f.label} Override`}
                                                                        />
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            ))}
                            <button type="button" onClick={() => append({ item_id: '', quantity: 1, custom_item_name: '' })} className="mt-4 text-[10px] text-blue-600 font-extrabold hover:underline flex items-center transition-all bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100 uppercase tracking-widest">
                                <Plus className="w-3 h-3 mr-1" /> Add Another Item
                            </button>

                            {Object.keys(errors).length > 0 && (
                                <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[10px] font-bold uppercase tracking-wider text-center">
                                    Check for missing fields or custom item names.
                                </div>
                            )}

                            <div className="mt-8 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl">Cancel</button>
                                <button type="submit" className="px-8 py-2.5 bg-safety-orange text-white font-bold rounded-xl shadow-lg shadow-orange-100 hover:bg-orange-600 transform transition-all active:scale-95">Send Request</button>
                            </div>
                        </form>
                    </div>
                </div >
            )}

            {/* Convert Custom Item to Inventory Modal */}
            {
                showConvertModal && itemToConvert && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
                        <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-100">
                            <h2 className="text-2xl font-black text-gray-900 mb-2">New Item Onboarding</h2>
                            <p className="text-sm text-gray-500 mb-6 font-medium italic">
                                Converting: <span className="text-blue-600 font-black decoration-blue-200 underline decoration-4 underline-offset-4">{itemToConvert.custom_item_name}</span>
                            </p>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Inventory Category</label>
                                    <select
                                        id="convert-category"
                                        className="border border-gray-100 p-4 rounded-2xl w-full bg-gray-50 text-sm font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                    >
                                        <option value="">-- Select Category --</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Unit of Measure</label>
                                    <input
                                        id="convert-unit"
                                        placeholder="e.g. pcs, meter, kg"
                                        className="border border-gray-100 p-4 rounded-2xl w-full bg-gray-50 text-sm font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                        defaultValue="pcs"
                                    />
                                </div>
                                {itemToConvert.specifications && Object.keys(itemToConvert.specifications).length > 0 && (
                                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                                        <label className="block text-[8px] font-black text-blue-400 uppercase tracking-widest mb-2">Original Specifications</label>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(itemToConvert.specifications).map(([k, v]) => (
                                                <span key={k} className="text-[10px] bg-white text-blue-700 px-2 py-1 rounded-lg border border-blue-100 font-bold shadow-sm">
                                                    {k}: {v}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-10 flex flex-col space-y-2">
                                <button
                                    onClick={() => {
                                        const catId = document.getElementById('convert-category').value;
                                        const unit = document.getElementById('convert-unit').value;
                                        handleFulfillItem(itemToConvert.id, 'PROCURE_CONVERT', { category_id: catId, unit });
                                    }}
                                    className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 transform active:scale-[0.98] uppercase tracking-widest text-xs"
                                >
                                    Add to Inventory & Raise PR
                                </button>
                                <button
                                    onClick={() => setShowConvertModal(false)}
                                    className="w-full py-4 text-xs font-black text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-2xl transition-all uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Distribution Modal */}
            {showDistributionModal && distributionData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70]">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Stock Distribution</h3>
                            <button onClick={() => setShowDistributionModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-3">
                            {distributionData.length === 0 && <p className="text-center text-sm text-gray-500 italic">No stock found in any store.</p>}
                            {distributionData.map((d, i) => (
                                <div key={i} className="flex justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div>
                                        <div className="font-bold text-sm text-gray-800">{d.store?.name || 'Unknown Store'}</div>
                                        <div className="text-[10px] text-gray-500 font-mono uppercase">{d.site?.name || 'Main Warehouse'}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-black text-gray-900">{d.current_stock}</div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase">Available</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowDistributionModal(false)}
                            className="w-full mt-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all font-sans uppercase tracking-widest text-[10px]"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
};

export default Requests;

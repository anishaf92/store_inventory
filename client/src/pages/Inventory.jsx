import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../services/api';
import { Plus, Search, Tag, Package } from 'lucide-react';

const Inventory = () => {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]); // Fetch for dropdown
    const [showItemModal, setShowItemModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showGRNModal, setShowGRNModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [grnItem, setGrnItem] = useState(null);

    // Forms
    const { register: registerItem, control, handleSubmit: handleItemSubmit, reset: resetItem, setValue } = useForm({
        defaultValues: { name: '', make: '', grade: '', unit: '', low_stock_threshold: '', initial_stock: 0, specifications: [{ key: '', value: '' }] }
    });
    const { fields, append, remove } = useFieldArray({ control, name: "specifications" });

    const { register: registerCat, handleSubmit: handleCatSubmit, reset: resetCat } = useForm();
    const { register: registerGRN, handleSubmit: handleGRNSubmit, reset: resetGRN } = useForm();

    useEffect(() => {
        fetchItems();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await api.get('/inventory/categories');
            setCategories(res.data);
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

    const openEditModal = (item) => {
        setEditingItem(item);
        const specs = item.specifications ? Object.entries(item.specifications).map(([key, value]) => ({ key, value })) : [{ key: '', value: '' }];

        resetItem({
            name: item.name,
            make: item.make,
            grade: item.grade,
            unit: item.unit,
            low_stock_threshold: item.low_stock_threshold,
            specifications: specs
        });
        setShowItemModal(true);
    };

    const openAddModal = () => {
        setEditingItem(null);
        resetItem({ name: '', make: '', grade: '', unit: '', low_stock_threshold: '', specifications: [{ key: '', value: '' }] });
        setShowItemModal(true);
    };

    const onItemSubmit = async (data) => {
        try {
            // Convert specs array to object
            const specsObj = {};
            data.specifications.forEach(spec => {
                if (spec.key) specsObj[spec.key] = spec.value;
            });

            const payload = { ...data, specifications: specsObj };

            if (editingItem) {
                const res = await api.put(`/inventory/items/${editingItem.id}`, payload);
                alert(res.data.message || 'Item updated');
            } else {
                await api.post('/inventory/items', payload);
                alert('Item created successfully');
            }

            setShowItemModal(false);
            resetItem();
            fetchItems();
            setEditingItem(null);
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || 'Failed to save item';
            alert(`Error: ${msg}`);
        }
    };

    const onCatSubmit = async (data) => {
        try {
            await api.post('/inventory/categories', data);
            setShowCategoryModal(false);
            resetCat();
            // fetchCategories();
        } catch (err) {
            alert('Failed to create category');
        }
    };

    const openGRNModal = (item) => {
        setGrnItem(item);
        resetGRN({ quantity: 1, referenceId: '' });
        setShowGRNModal(true);
    };

    const onGRNSubmit = async (data) => {
        try {
            await api.post('/inventory/grn', {
                itemId: grnItem.id,
                quantity: parseInt(data.quantity),
                referenceId: data.referenceId
            });
            alert('Stock updated successfully');
            setShowGRNModal(false);
            fetchItems();
        } catch (err) {
            console.error(err);
            alert('Failed to update stock');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Inventory Management</h1>
                <div className="space-x-3">
                    <button
                        onClick={() => setShowCategoryModal(true)}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium inline-flex items-center"
                    >
                        <Tag className="w-4 h-4 mr-2" /> Add Category
                    </button>
                    <button
                        onClick={openAddModal}
                        className="bg-safety-orange text-white px-4 py-2 rounded-lg hover:bg-orange-600 font-medium inline-flex items-center shadow-md"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Item
                    </button>
                </div>
            </div>

            {/* Item List */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specs</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {items.map(item => (
                            <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <Package className="w-8 h-8 text-gray-400 mr-3" />
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                            <div className="text-sm text-gray-500">{item.make}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.Category?.name || '-'}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {item.specifications && Object.entries(item.specifications).map(([k, v]) => (
                                        <div key={k}><span className="font-semibold">{k}:</span> {v}</div>
                                    ))}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className={`px-2 inline-flex text-[10px] leading-4 font-bold rounded-t border-x border-t ${item.current_stock < item.low_stock_threshold ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                                            CURRENT STOCK
                                        </span>
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-b border-x border-b ${item.current_stock < item.low_stock_threshold ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
                                            {item.current_stock} <span className="ml-1 text-[10px] opacity-70 underline decoration-dotted">{item.unit || 'units'}</span>
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                                    <button onClick={() => openEditModal(item)} className="text-blue-600 hover:text-blue-900">Edit</button>
                                    <button onClick={() => openGRNModal(item)} className="text-safety-orange hover:text-orange-900">Receive Stock</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Item Modal */}
            {showItemModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
                        <h2 className="text-xl font-bold mb-4">{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
                        <form onSubmit={handleItemSubmit(onItemSubmit)}>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item Name</label>
                                    <input {...registerItem('name')} placeholder="e.g. Cement Bag" className="border p-2 rounded w-full" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                                    <select {...registerItem('category_id')} className="border p-2 rounded w-full" required>
                                        <option value="">Select Category</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unit</label>
                                    <input {...registerItem('unit')} placeholder="e.g. pcs, kg, bags" className="border p-2 rounded w-full" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Make/Brand</label>
                                    <input {...registerItem('make')} placeholder="e.g. UltraTech" className="border p-2 rounded w-full" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Grade</label>
                                    <input {...registerItem('grade')} placeholder="e.g. 53" className="border p-2 rounded w-full" />
                                </div>
                                {!editingItem && (
                                    <div className="bg-blue-50 p-2 rounded border border-blue-100">
                                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Initial Stock</label>
                                        <input {...registerItem('initial_stock')} type="number" placeholder="0" className="bg-white border p-2 rounded w-full" />
                                    </div>
                                )}
                                <div className="bg-amber-50 p-2 rounded border border-amber-100">
                                    <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Low Stock Alert Level</label>
                                    <input {...registerItem('low_stock_threshold')} type="number" placeholder="5" className="bg-white border p-2 rounded w-full" />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700">Specifications</label>
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex gap-2 mt-2">
                                        <input {...registerItem(`specifications.${index}.key`)} placeholder="Key (e.g., Voltage)" className="border p-2 rounded w-1/3" />
                                        <input {...registerItem(`specifications.${index}.value`)} placeholder="Value (e.g., 220V)" className="border p-2 rounded w-1/3" />
                                        <button type="button" onClick={() => remove(index)} className="text-red-500">Remove</button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => append({ key: '', value: '' })} className="mt-2 text-sm text-blue-600">+ Add Spec</button>
                            </div>

                            <div className="mt-6 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowItemModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-safety-orange text-white rounded">
                                    {editingItem ? 'Update Item' : 'Save Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Category Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Add New Category</h2>
                        <form onSubmit={handleCatSubmit(onCatSubmit)}>
                            <input {...registerCat('name')} placeholder="Category Name" className="border p-2 rounded w-full mb-4" required />
                            <textarea {...registerCat('description')} placeholder="Description" className="border p-2 rounded w-full mb-4" />
                            <div className="flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-safety-orange text-white rounded">Save Category</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Receive Stock (GRN) Modal */}
            {showGRNModal && grnItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-2">Receive Stock</h2>
                        <p className="text-sm text-gray-500 mb-4">Item: <span className="font-semibold text-gray-700">{grnItem.name}</span></p>

                        <form onSubmit={handleGRNSubmit(onGRNSubmit)}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Quantity to Add ({grnItem.unit})</label>
                                    <input
                                        type="number"
                                        {...registerGRN('quantity', { required: true, min: 1 })}
                                        className="border p-2 rounded w-full mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Reference ID (e.g. PO#, Invoice#)</label>
                                    <input
                                        type="text"
                                        {...registerGRN('referenceId', { required: true })}
                                        placeholder="Enter reference number"
                                        className="border p-2 rounded w-full mt-1"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowGRNModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700">Confirm Receipt</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;

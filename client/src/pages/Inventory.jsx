import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../services/api';
import { Plus, Search, Tag, Package, X } from 'lucide-react';

const Inventory = () => {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]); // Fetch for dropdown
    const [showItemModal, setShowItemModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showGRNModal, setShowGRNModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [grnItem, setGrnItem] = useState(null);

    // Forms
    const { register: registerItem, control, handleSubmit: handleItemSubmit, reset: resetItem, setValue, watch } = useForm({
        defaultValues: { name: '', item_code: '', make: '', grade: '', unit: '', low_stock_threshold: '', initial_stock: 0, specs: [] }
    });

    const { fields: itemSpecFields, append: appendItemSpec, remove: removeItemSpec } = useFieldArray({
        control,
        name: 'specs'
    });

    const watchedCategoryId = watch('category_id');
    const selectedCategory = categories.find(c => c.id === watchedCategoryId);

    const { register: registerCat, handleSubmit: handleCatSubmit, reset: resetCat, control: catControl } = useForm({
        defaultValues: { name: '', description: '', specification_schema: { fields: [] } }
    });

    const { fields: catSpecFields, append: appendCatSpec, remove: removeCatSpec } = useFieldArray({
        control: catControl,
        name: 'specification_schema.fields'
    });
    const { register: registerGRN, handleSubmit: handleGRNSubmit, reset: resetGRN } = useForm();

    const lastCatIdRef = useRef(null);

    useEffect(() => {
        if (lastCatIdRef.current && watchedCategoryId !== lastCatIdRef.current) {
            resetItem({ ...watch(), specs: [] });
        }
        lastCatIdRef.current = watchedCategoryId;
    }, [watchedCategoryId, resetItem, watch]);

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

        // Convert specifications object to array of { name, value }
        const specsArray = item.specifications ? Object.entries(item.specifications).map(([name, value]) => ({ name, value })) : [];

        resetItem({
            name: item.name,
            item_code: item.item_code,
            category_id: item.category_id,
            make: item.make,
            grade: item.grade,
            unit: item.unit,
            low_stock_threshold: item.low_stock_threshold,
            specs: specsArray
        });
        setShowItemModal(true);
    };

    const openAddModal = () => {
        setEditingItem(null);
        resetItem({
            name: '',
            item_code: `ITEM-${Math.floor(1000 + Math.random() * 9000)}`,
            make: '',
            grade: '',
            unit: '',
            low_stock_threshold: '',
            specs: []
        });
        setShowItemModal(true);
    };

    const onItemSubmit = async (data) => {
        // Convert specs array back to specifications object
        const specifications = {};
        if (data.specs) {
            data.specs.forEach(s => {
                if (s.name && s.value) specifications[s.name] = s.value;
            });
        }

        const payload = { ...data, specifications };
        delete payload.specs;

        try {
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
            await api.post('/inventory/categories', data);
            setShowCategoryModal(false);
            resetCat();
            fetchCategories();
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
                invoiceNumber: data.referenceId // Renamed parameter to align with backend changes
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
                        onClick={() => { resetCat(); setShowCategoryModal(true); }}
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
                                            <div className="text-xs text-gray-500 font-mono">{item.item_code}</div>
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
                                        {(() => {
                                            // Extract stock from nested Inventories array
                                            const stock = item.Inventories && item.Inventories.length > 0 ? item.Inventories[0].current_stock : 0;
                                            const threshold = item.low_stock_threshold || 0;
                                            const isLow = stock < threshold;

                                            return (
                                                <>
                                                    <span className={`px-2 inline-flex text-[10px] leading-4 font-bold rounded-t border-x border-t ${isLow ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                                                        CURRENT STOCK
                                                    </span>
                                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-b border-x border-b ${isLow ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
                                                        {stock} <span className="ml-1 text-[10px] opacity-70 underline decoration-dotted">{item.unit || 'units'}</span>
                                                    </span>
                                                </>
                                            )
                                        })()}
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
                        <form onSubmit={handleItemSubmit(onItemSubmit)}>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Item Code</label>
                                    <input {...registerItem('item_code')} disabled={editingItem} className="border p-2 rounded w-full bg-gray-50 font-mono" required />
                                </div>
                                <div>
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

                            {/* Dynamic Specifications */}
                            {watchedCategoryId && (
                                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Dynamic Specifications</h3>
                                        {selectedCategory?.specification_schema?.fields?.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => appendItemSpec({ name: '', value: '' })}
                                                className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-100 uppercase"
                                            >
                                                + Add Specification
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        {itemSpecFields.map((field, index) => {
                                            const specName = watch(`specs.${index}.name`);
                                            const specDef = selectedCategory?.specification_schema?.fields?.find(f => f.name === specName);

                                            return (
                                                <div key={field.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-white rounded border border-gray-100 relative group">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItemSpec(index)}
                                                        className="absolute -top-1 -right-1 bg-red-100 text-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                    <div className="col-span-5">
                                                        <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Specification Name</label>
                                                        <select
                                                            {...registerItem(`specs.${index}.name`, { required: true })}
                                                            className="w-full bg-gray-50 rounded p-1.5 text-xs border border-gray-200"
                                                        >
                                                            <option value="">-- Select --</option>
                                                            {selectedCategory?.specification_schema?.fields?.map(f => (
                                                                <option key={f.key} value={f.name}>{f.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="col-span-7">
                                                        <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Value</label>
                                                        {specDef?.options ? (
                                                            <select
                                                                {...registerItem(`specs.${index}.value`, { required: true })}
                                                                className="w-full bg-gray-50 rounded p-1.5 text-xs border border-gray-200"
                                                            >
                                                                <option value="">-- Select --</option>
                                                                {specDef.options.split(',').map(opt => (
                                                                    <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input
                                                                {...registerItem(`specs.${index}.value`, { required: true })}
                                                                className="w-full bg-gray-50 rounded p-1.5 text-xs border border-gray-200"
                                                                placeholder={specDef ? `Enter ${specDef.label}` : "Select name first"}
                                                                type={specDef?.type === 'number' ? 'number' : 'text'}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {itemSpecFields.length === 0 && (
                                            <p className="text-[10px] text-gray-400 text-center py-4 italic">No specifications added. Click the button above to add some.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowItemModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-safety-orange text-white rounded shadow-lg font-bold">
                                    {editingItem ? 'Update Item' : 'Save Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Category Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">Add New Category Blueprint</h2>
                        <form onSubmit={handleCatSubmit(onCatSubmit)}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category Name</label>
                                    <input {...registerCat('name')} placeholder="e.g. Electrical Cables" className="border p-2 rounded w-full" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                                    <textarea {...registerCat('description')} placeholder="Description" className="border p-2 rounded w-full h-20" />
                                </div>

                                <div className="border-t pt-4 mt-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Specification Blueprint</h3>
                                        <button
                                            type="button"
                                            onClick={() => appendCatSpec({ name: '', options: '' })}
                                            className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-100 uppercase transition-all"
                                        >
                                            + Add Field
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {catSpecFields.map((field, index) => (
                                            <div key={field.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded border border-gray-100 relative group">
                                                <button type="button" onClick={() => removeCatSpec(index)} className="absolute -top-1 -right-1 bg-red-100 text-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X className="w-3 h-3" />
                                                </button>
                                                <div className="col-span-5">
                                                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Spec Name</label>
                                                    <input
                                                        {...registerCat(`specification_schema.fields.${index}.name`, { required: true })}
                                                        className="w-full bg-white rounded p-1.5 text-xs border border-gray-200"
                                                        placeholder="e.g. Diameter"
                                                    />
                                                </div>
                                                <div className="col-span-7">
                                                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Options / Values (Comma Separated)</label>
                                                    <input
                                                        {...registerCat(`specification_schema.fields.${index}.options`)}
                                                        className="w-full bg-white rounded p-1.5 text-xs border border-gray-200"
                                                        placeholder="e.g. PVC, GI (Optional)"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        {catSpecFields.length === 0 && (
                                            <p className="text-[10px] text-gray-400 text-center py-4 italic">No custom specifications defined.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end mt-6 space-x-3 border-t pt-4">
                                <button type="button" onClick={() => { setShowCategoryModal(false); resetCat(); }} className="px-4 py-2 border rounded font-medium text-gray-500 hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="px-6 py-2 bg-safety-orange text-white rounded font-bold shadow-md hover:bg-orange-600">Save Blueprint</button>
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

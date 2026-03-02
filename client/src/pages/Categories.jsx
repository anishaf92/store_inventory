import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../services/api';
import { Layers, Plus, Tag, Edit2, Trash2, X } from 'lucide-react';

export default function Categories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const { register, handleSubmit, reset, setValue, control } = useForm({
        defaultValues: { specification_schema: { fields: [] } }
    });
    const { fields: specFields, append: appendSpec, remove: removeSpec } = useFieldArray({
        control,
        name: 'specification_schema.fields'
    });

    const fetchCategories = async () => {
        try {
            setLoading(true);
            setErrorMsg('');
            const res = await api.get('/inventory/categories');
            setCategories(res.data || []);
        } catch (err) {
            setErrorMsg(err.response?.data?.message || 'Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const onSubmit = async (data) => {
        if (data.specification_schema?.fields) {
            data.specification_schema.fields = data.specification_schema.fields.map((f) => ({
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
            closeModal();
            fetchCategories();
        } catch (err) {
            alert(err.response?.data?.message || 'Operation failed');
        }
    };

    const openEdit = (cat) => {
        setEditingCategory(cat);
        setValue('name', cat.name);
        setValue('description', cat.description);
        setValue('specification_schema.fields', cat.specification_schema?.fields || []);
        setShowCategoryModal(true);
    };

    const closeModal = () => {
        setEditingCategory(null);
        reset({ specification_schema: { fields: [] } });
        setShowCategoryModal(false);
    };

    const deleteCat = async (id) => {
        if (!window.confirm('Delete this category? Items linked to it may be affected.')) return;
        try {
            await api.delete(`/inventory/categories/${id}`);
            fetchCategories();
        } catch (err) {
            alert(err.response?.data?.message || 'Delete failed');
        }
    };

    if (loading) return <div className="p-8">Loading categories...</div>;

    return (
        <div className="space-y-6 pb-24 relative">
            {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                    {errorMsg}
                </div>
            )}

            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Material Categories</h1>
                    <p className="text-gray-500 text-sm mt-1">Define reusable groups and specification schemas.</p>
                </div>
                <button
                    onClick={() => {
                        closeModal();
                        setShowCategoryModal(true);
                    }}
                    className="flex items-center text-sm bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-all font-bold"
                >
                    <Plus className="w-4 h-4 mr-2" /> Add Category
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center bg-gray-50/50">
                    <Layers className="w-5 h-5 text-purple-600 mr-2" />
                    <h2 className="text-lg font-bold text-gray-900">Blueprints</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((cat) => (
                        <div
                            key={cat.id}
                            className="border border-gray-100 p-5 rounded-2xl bg-gray-50/30 group hover:border-purple-200 transition-all"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-black text-gray-900 flex items-center">
                                        <Tag className="w-3.5 h-3.5 mr-2 text-purple-400" /> {cat.name}
                                    </h4>
                                    <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">
                                        {cat.description || 'No description'}
                                    </p>
                                </div>
                                <div className="flex space-x-1">
                                    <button
                                        onClick={() => openEdit(cat)}
                                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => deleteCat(cat.id)}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-4">
                                {cat.specification_schema?.fields?.length ? (
                                    cat.specification_schema.fields.map((f) => (
                                        <span
                                            key={f.key}
                                            className="px-2 py-0.5 rounded-lg bg-white border border-gray-100 text-[8px] font-bold text-gray-400 uppercase tracking-tighter"
                                        >
                                            {f.label} ({f.type})
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-[8px] text-gray-300 italic">No custom specs</span>
                                )}
                            </div>
                        </div>
                    ))}
                    {categories.length === 0 && (
                        <p className="text-xs text-gray-400 col-span-full text-center italic">No categories defined yet.</p>
                    )}
                </div>
            </div>

            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                    <div className="bg-white rounded-[2rem] p-10 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="mb-8">
                            <h2 className="text-3xl font-black text-gray-900 mb-1">
                                {editingCategory ? 'Edit Blueprints' : 'New Material Category'}
                            </h2>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em]">
                                Define custom specification schemas
                            </p>
                        </div>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-2 gap-5 text-left">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                        Category Name
                                    </label>
                                    <input
                                        {...register('name', { required: true })}
                                        className="w-full border-gray-100 bg-gray-50/50 rounded-2xl p-4 text-sm font-bold border outline-none"
                                        placeholder="e.g. Electrical Cables"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        {...register('description')}
                                        className="w-full border-gray-100 bg-gray-50/50 rounded-2xl p-4 text-sm font-bold border outline-none h-24"
                                        placeholder="Brief metadata..."
                                    />
                                </div>

                                <div className="col-span-2 bg-gray-50/50 p-6 rounded-3xl border border-dashed border-gray-200">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-900">
                                            Specification Blueprint
                                        </h3>
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
                                            <div
                                                key={field.id}
                                                className="grid grid-cols-12 gap-3 items-end p-4 bg-white rounded-2xl border border-gray-100 shadow-sm relative group"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => removeSpec(index)}
                                                    className="absolute -top-2 -right-2 bg-red-50 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                                <div className="col-span-5">
                                                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">
                                                        Spec Name
                                                    </label>
                                                    <input
                                                        {...register(`specification_schema.fields.${index}.name`, { required: true })}
                                                        className="w-full bg-gray-50 rounded-lg p-3 text-[10px] font-bold border-none"
                                                        placeholder="e.g. Diameter"
                                                    />
                                                </div>
                                                <div className="col-span-7">
                                                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">
                                                        Options / Values (Comma Separated)
                                                    </label>
                                                    <input
                                                        {...register(`specification_schema.fields.${index}.options`)}
                                                        className="w-full bg-gray-50 rounded-lg p-3 text-[10px] font-bold border-none"
                                                        placeholder="e.g. PVC, GI, CPVC (Optional)"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        {specFields.length === 0 && (
                                            <p className="text-[10px] text-gray-400 text-center py-4 italic">
                                                No custom specifications defined for this category.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="pt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 rounded-2xl transition-all"
                                >
                                    Dismiss
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-4 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-purple-700 transition-all shadow-xl shadow-purple-100"
                                >
                                    {editingCategory ? 'Finalize Schema' : 'Initialize Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}


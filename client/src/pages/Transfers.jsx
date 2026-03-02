import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { Truck, CheckCircle, Clock } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function Transfers() {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useContext(AuthContext);

    const fetchTransfers = async () => {
        try {
            const res = await api.get('/transfers');
            setTransfers(res.data);
        } catch (error) {
            console.error('Failed to fetch transfers', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcknowledge = async (id) => {
        try {
            await api.put(`/transfers/${id}/acknowledge`);
            fetchTransfers();
        } catch (error) {
            alert('Failed to acknowledge transfer');
        }
    };

    const handleMarkCompleted = async (id) => {
        try {
            await api.put(`/transfers/${id}/status`, { status: 'COMPLETED' });
            fetchTransfers();
        } catch (error) {
            alert('Failed to update transfer status');
        }
    };

    useEffect(() => {
        fetchTransfers();
    }, []);

    if (loading) return <div className="p-8">Loading transfers...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inter-Location Transfers</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage stock movement between Stores and Sites.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold">TID</th>
                                <th className="px-6 py-4 font-semibold">Item</th>
                                <th className="px-6 py-4 font-semibold">Destination Site</th>
                                <th className="px-6 py-4 font-semibold text-right">Quantity</th>
                                <th className="px-6 py-4 font-semibold text-center">Status</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transfers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No transfers found.
                                    </td>
                                </tr>
                            ) : (
                                transfers.map((tx) => (
                                    <tr key={tx.id} className="bg-white border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-gray-500">{tx.id.slice(0, 8)}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {tx.Item?.name} <span className="text-xs text-gray-400">({tx.Item?.item_code})</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{tx.site?.name}</td>
                                        <td className="px-6 py-4 text-right font-medium">{tx.quantity} {tx.Item?.unit}</td>
                                        <td className="px-6 py-4 text-center">
                                            {tx.status === 'COMPLETED' && !tx.pm_acknowledged && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    Delivered (Unacknowledged)
                                                </span>
                                            )}
                                            {tx.pm_acknowledged && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Acknowledged
                                                </span>
                                            )}
                                            {tx.status === 'PENDING' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    <Clock className="w-3 h-3 mr-1" /> Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {user?.role === 'STORE_KEEPER' && tx.status === 'PENDING' && (
                                                <button
                                                    onClick={() => handleMarkCompleted(tx.id)}
                                                    className="text-xs text-white bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded"
                                                >
                                                    Ship
                                                </button>
                                            )}
                                            {user?.role === 'PROJECT_MANAGER' && tx.status === 'COMPLETED' && !tx.pm_acknowledged && (
                                                <button
                                                    onClick={() => handleAcknowledge(tx.id)}
                                                    className="text-xs text-white bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded flex items-center inline-flex"
                                                >
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Acknowledge
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

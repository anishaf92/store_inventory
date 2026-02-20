import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ShieldCheck, Search, Clock, User, HardDrive } from 'lucide-react';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await api.get('/audit');
            setLogs(res.data);
        } catch (err) {
            console.error("Failed to fetch audit logs", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.performer?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                        <ShieldCheck className="w-6 h-6 mr-2 text-safety-orange" />
                        System Audit Logs
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Track all modifications and system activities</p>
                </div>
                <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:ring-2 focus:ring-safety-orange focus:border-transparent outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-100">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Entity</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Performed By</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-10 text-center text-gray-400">Loading system logs...</td>
                            </tr>
                        ) : filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic">No audit records found</td>
                            </tr>
                        ) : (
                            filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                        <div className="flex items-center">
                                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                            {new Date(log.createdAt).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${log.action === 'INSERT' ? 'bg-green-100 text-green-700' :
                                                log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        <div className="flex items-center">
                                            <HardDrive className="w-4 h-4 mr-2 text-gray-400" />
                                            <span className="capitalize">{log.table_name}</span>
                                            <span className="ml-1 text-[10px] text-gray-400">({log.record_id.slice(0, 8)}...)</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        <div className="flex items-center font-medium">
                                            <div className="w-6 h-6 rounded-full bg-industrial-gray flex items-center justify-center text-[10px] text-white mr-2">
                                                {log.performer?.name?.charAt(0)}
                                            </div>
                                            {log.performer?.name || 'System'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-500 max-w-xs overflow-hidden">
                                        <div className="truncate bg-gray-50 p-2 rounded border border-gray-100">
                                            {log.action === 'UPDATE' ? (
                                                <span>Modified {Object.keys(log.new_values || {}).join(', ')}</span>
                                            ) : (
                                                <span>Added new {log.table_name} record</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuditLogs;

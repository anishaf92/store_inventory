import React, { useEffect, useState, useContext } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Package, ClipboardList, AlertTriangle, Layers, Briefcase, Clock } from 'lucide-react';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const [stats, setStats] = useState({ recentActivity: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/inventory/dashboard');
            setStats(res.data);
        } catch (err) {
            console.error("Failed to fetch dashboard stats", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;

    const isPM = user.role === 'PROJECT_MANAGER';

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Hello, {user?.name}!</h1>
                <p className="text-gray-500 mt-1">Here's what's happening in the system today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {isPM ? (
                    <>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                            <div className="p-3 bg-blue-50 rounded-lg mr-4">
                                <Briefcase className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Projects</h3>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalProjects || 0}</p>
                                <Link to="/projects" className="text-[10px] text-blue-600 font-bold hover:underline">View All &rarr;</Link>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                            <div className="p-3 bg-indigo-50 rounded-lg mr-4">
                                <ClipboardList className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">My Requests</h3>
                                <p className="text-2xl font-bold text-gray-900">{stats.myRequests || 0}</p>
                                <Link to="/requests" className="text-[10px] text-indigo-600 font-bold hover:underline">Manage &rarr;</Link>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                            <div className="p-3 bg-amber-50 rounded-lg mr-4">
                                <Clock className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Pending Approval</h3>
                                <p className="text-2xl font-bold text-gray-900">{stats.pendingApprovals || 0}</p>
                                <p className="text-[10px] text-gray-400">Waiting for manager</p>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                            <div className="p-3 bg-orange-50 rounded-lg mr-4">
                                <AlertTriangle className="w-6 h-6 text-safety-orange" />
                            </div>
                            <div>
                                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Low Stock Items</h3>
                                <p className="text-2xl font-bold text-gray-900 text-safety-orange">{stats.lowStock || 0}</p>
                                <Link to="/inventory" className="text-[10px] text-safety-orange font-bold hover:underline">Refill Stock &rarr;</Link>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                            <div className="p-3 bg-blue-50 rounded-lg mr-4">
                                <Package className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Pending MRs</h3>
                                <p className="text-2xl font-bold text-gray-900">{stats.pendingRequests || 0}</p>
                                <Link to="/requests" className="text-[10px] text-blue-600 font-bold hover:underline">Review &rarr;</Link>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
                            <div className="p-3 bg-green-50 rounded-lg mr-4">
                                <Layers className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Items</h3>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalItems || 0}</p>
                                <p className="text-[10px] text-gray-400">Active SKUs</p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h2>
                <div className="space-y-4">
                    {!stats.recentActivity || stats.recentActivity.length === 0 ? (
                        <p className="text-gray-500 italic">No recent activity.</p>
                    ) : (
                        stats.recentActivity.map((act) => (
                            <div key={act.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                                <div>
                                    <p className="font-medium text-gray-800">
                                        {act.type === 'GRN' ? 'Received' : 'Issued'}: {act.Item?.name}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Ref: {act.reference_id || 'N/A'} • {new Date(act.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${act.type === 'GRN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {act.type === 'GRN' ? '+' : '-'} {Math.abs(act.quantity)} <span className="text-[10px] ml-1 opacity-70">{act.Item?.unit}</span>
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

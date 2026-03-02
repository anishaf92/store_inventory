import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, Box, FileText, LogOut, ShieldCheck, Truck, Settings } from 'lucide-react';

const Layout = ({ children }) => {
    const { user, logout } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'OWNER', 'STORE_MANAGER', 'STORE_KEEPER', 'PROJECT_MANAGER'] },
        { name: 'Inventory', path: '/inventory', icon: Box, roles: ['ADMIN', 'OWNER', 'STORE_MANAGER', 'STORE_KEEPER'] },
        { name: 'Transfers', path: '/transfers', icon: Truck, roles: ['ADMIN', 'OWNER', 'STORE_MANAGER', 'STORE_KEEPER', 'PROJECT_MANAGER'] },
        // For PM, show "Sites" instead of "Projects" in sidebar (same route)
        { name: user?.role === 'PROJECT_MANAGER' ? 'Sites' : 'Projects', path: '/projects', icon: FileText, roles: ['ADMIN', 'OWNER', 'PROJECT_MANAGER'] },
        { name: 'Requests', path: '/requests', icon: FileText, roles: ['ADMIN', 'OWNER', 'STORE_MANAGER', 'STORE_KEEPER', 'PROJECT_MANAGER'] },
        { name: 'Audit Logs', path: '/audit', icon: ShieldCheck, roles: ['ADMIN', 'OWNER', 'STORE_MANAGER'] },
        { name: 'Categories', path: '/categories', icon: FileText, roles: ['ADMIN', 'OWNER', 'STORE_MANAGER'] },
        { name: 'Manage Users', path: '/admin', icon: Settings, roles: ['ADMIN'] },
    ];

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-industrial-dark text-white flex flex-col">
                <div className="p-6">
                    <h1 className="text-2xl font-bold tracking-wider text-safety-orange">ARTHAQ</h1>
                    <p className="text-xs text-gray-400 mt-1">INVENTORY SYSTEM</p>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {navItems.map((item) => {
                        if (user && item.roles.includes(user.role)) {
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${isActive
                                        ? 'bg-safety-orange text-white shadow-lg'
                                        : 'text-gray-300 hover:bg-industrial-gray hover:text-white'
                                        }`}
                                >
                                    <item.icon className="w-5 h-5 mr-3" />
                                    <span className="font-medium">{item.name}</span>
                                </Link>
                            );
                        }
                        return null;
                    })}
                </nav>

                <div className="p-4 border-t border-industrial-gray">
                    <div className="flex items-center mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-industrial-gray flex items-center justify-center text-sm font-bold text-safety-yellow">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-white">{user?.name}</p>
                            <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ').toLowerCase()}</p>
                            {user?.store_name && (
                                <p className="text-[10px] text-safety-orange font-bold uppercase tracking-tighter mt-0.5">
                                    {user.store_name}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-400 bg-industrial-gray/50 rounded-lg hover:bg-red-900/20 hover:text-red-300 transition-colors"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8">
                {children}
            </main>
        </div>
    );
};

export default Layout;

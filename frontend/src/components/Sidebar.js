import React from 'react';
import {
    LayoutDashboard,
    Search,
    History,
    Settings,
    Shield,
    LogOut,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scanner', label: 'New Scan', icon: Search },
    { id: 'history', label: 'Scan History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
];

function Sidebar({ currentView, setCurrentView, collapsed, setCollapsed }) {
    return (
        <motion.aside
            className={`sidebar ${collapsed ? 'w-20' : 'w-64'}`}
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{ width: collapsed ? '80px' : '256px' }}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8 px-2">
                <motion.div
                    className="p-2 rounded-xl bg-gradient-to-br from-accent to-cyber-purple"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <Shield className="w-6 h-6 text-white" />
                </motion.div>
                <AnimatePresence>
                    {!collapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                        >
                            <h1 className="text-lg font-bold gradient-text">Security SNL</h1>
                            <p className="text-xs text-gray-500">v2.0 Pro</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;

                    return (
                        <motion.button
                            key={item.id}
                            onClick={() => setCurrentView(item.id)}
                            className={`sidebar-link w-full ${isActive ? 'active' : ''}`}
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-accent' : ''}`} />
                            <AnimatePresence>
                                {!collapsed && (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                            {isActive && !collapsed && (
                                <motion.div
                                    className="ml-auto w-1.5 h-1.5 rounded-full bg-accent"
                                    layoutId="activeIndicator"
                                />
                            )}
                        </motion.button>
                    );
                })}
            </nav>

            {/* Collapse Toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="btn-icon w-full flex justify-center mt-4"
            >
                {collapsed ? (
                    <ChevronRight className="w-5 h-5" />
                ) : (
                    <ChevronLeft className="w-5 h-5" />
                )}
            </button>

            {/* Footer */}
            <div className="mt-auto pt-4 border-t border-white/5">
                <button className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <LogOut className="w-5 h-5" />
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                Exit
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div>
        </motion.aside>
    );
}

export default Sidebar;

import React from 'react';
import { motion } from 'framer-motion';
import {
    Target,
    Bug,
    Clock,
    TrendingUp,
    Shield,
    Activity,
    ArrowUpRight,
    ExternalLink
} from 'lucide-react';

function Dashboard({ scanHistory, onStartScan, stats }) {
    const totalScans = scanHistory?.length || 0;
    const completedScans = scanHistory?.filter(s => s.status === 'completed').length || 0;
    const totalVulns = scanHistory?.reduce((acc, scan) => {
        return acc + (scan.result?.summary?.top_issues_count || 0);
    }, 0) || 0;
    const avgDuration = scanHistory?.length
        ? (scanHistory.reduce((acc, s) => acc + (s.result?.summary?.duration_seconds || 0), 0) / scanHistory.length).toFixed(1)
        : 0;

    const statCards = [
        {
            label: 'Total Scans',
            value: totalScans,
            icon: Target,
            color: 'from-blue-500 to-cyan-400',
            change: '+3 this week'
        },
        {
            label: 'Vulnerabilities Found',
            value: totalVulns,
            icon: Bug,
            color: 'from-red-500 to-orange-400',
            change: 'Across all scans'
        },
        {
            label: 'Success Rate',
            value: totalScans ? `${Math.round((completedScans / totalScans) * 100)}%` : '0%',
            icon: TrendingUp,
            color: 'from-green-500 to-emerald-400',
            change: 'Completion rate'
        },
        {
            label: 'Avg. Duration',
            value: `${avgDuration}s`,
            icon: Clock,
            color: 'from-purple-500 to-pink-400',
            change: 'Per scan'
        },
    ];

    const recentScans = scanHistory?.slice(0, 5) || [];

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-between items-start"
            >
                <div>
                    <h1 className="text-3xl font-bold mb-2">
                        Welcome to <span className="gradient-text">Security Dashboard</span>
                    </h1>
                    <p className="text-gray-400">
                        Monitor your security scans and track vulnerabilities in real-time.
                    </p>
                </div>
                <motion.button
                    onClick={onStartScan}
                    className="btn-primary flex items-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Shield className="w-5 h-5" />
                    <span>New Scan</span>
                    <ArrowUpRight className="w-4 h-4" />
                </motion.button>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={stat.label}
                            className="stat-card group"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -4 }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                                <Activity className="w-4 h-4 text-gray-600 group-hover:text-accent transition-colors" />
                            </div>
                            <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
                            <p className="text-gray-400 text-sm">{stat.label}</p>
                            <p className="text-xs text-gray-500 mt-2">{stat.change}</p>
                        </motion.div>
                    );
                })}
            </div>

            {/* Recent Scans Section */}
            <motion.div
                className="glass rounded-2xl p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">Recent Activity</h2>
                    <button className="text-sm text-accent hover:text-accent-hover transition-colors">
                        View All →
                    </button>
                </div>

                {recentScans.length > 0 ? (
                    <div className="space-y-3">
                        {recentScans.map((scan, index) => (
                            <motion.div
                                key={scan.scan_id}
                                className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + index * 0.1 }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-2 h-2 rounded-full ${scan.status === 'completed' ? 'bg-success' :
                                            scan.status === 'running' ? 'bg-accent animate-pulse' :
                                                scan.status === 'failed' ? 'bg-danger' : 'bg-warning'
                                        }`} />
                                    <div>
                                        <p className="font-medium text-sm truncate max-w-xs">
                                            {scan.target || 'Unknown target'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {scan.submitted_at ? new Date(scan.submitted_at).toLocaleString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`
                    ${scan.status === 'completed' ? 'status-completed' :
                                            scan.status === 'running' ? 'status-running' :
                                                scan.status === 'failed' ? 'status-failed' : 'status-pending'}
                  `}>
                                        {scan.status}
                                    </span>
                                    <ExternalLink className="w-4 h-4 text-gray-500 hover:text-accent" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <Target className="w-16 h-16 empty-state-icon" />
                        <h3 className="text-lg font-medium text-gray-400 mb-2">No scans yet</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Start your first security scan to see activity here.
                        </p>
                        <button
                            onClick={onStartScan}
                            className="btn-primary"
                        >
                            Run First Scan
                        </button>
                    </div>
                )}
            </motion.div>

            {/* Quick Tips */}
            <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
            >
                <div className="glass rounded-xl p-5 border-l-4 border-l-accent">
                    <h4 className="font-semibold mb-2">💡 Pro Tip</h4>
                    <p className="text-sm text-gray-400">
                        Use Deep Scan mode for comprehensive vulnerability detection on production applications.
                    </p>
                </div>
                <div className="glass rounded-xl p-5 border-l-4 border-l-cyber-green">
                    <h4 className="font-semibold mb-2">🔒 Security Note</h4>
                    <p className="text-sm text-gray-400">
                        Always get permission before scanning third-party websites or applications.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

export default Dashboard;

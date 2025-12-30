import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    History,
    Search,
    Trash2,
    RefreshCw,
    ExternalLink,
    ChevronDown,
    Filter,
    Calendar,
    Target,
    AlertCircle
} from 'lucide-react';

function ScanHistory({ scans, onRescan, onDelete, onViewResult }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    const filteredScans = scans?.filter(scan => {
        const matchesSearch = scan.target?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || scan.status === statusFilter;
        return matchesSearch && matchesStatus;
    }) || [];

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return 'status-completed';
            case 'running':
                return 'status-running';
            case 'failed':
                return 'status-failed';
            default:
                return 'status-pending';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <History className="w-7 h-7 text-accent" />
                        Scan History
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        View and manage your previous security scans
                    </p>
                </div>

                {/* Search & Filter */}
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search scans..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input pl-10 py-2 w-64"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn-icon ${showFilters ? 'bg-accent/10 text-accent border-accent/20' : ''}`}
                    >
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </motion.div>

            {/* Filters */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        className="glass rounded-xl p-4 flex flex-wrap gap-3"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">Status:</span>
                            <div className="tabs">
                                {['all', 'completed', 'running', 'failed'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={`tab ${statusFilter === status ? 'active' : ''}`}
                                    >
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scan List */}
            <motion.div
                className="glass rounded-2xl overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                {filteredScans.length > 0 ? (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Target</th>
                                    <th>Status</th>
                                    <th>Findings</th>
                                    <th>Duration</th>
                                    <th>Date</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredScans.map((scan, index) => (
                                    <motion.tr
                                        key={scan.scan_id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="group cursor-pointer"
                                        onClick={() => onViewResult && onViewResult(scan)}
                                    >
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-accent/10">
                                                    <Target className="w-4 h-4 text-accent" />
                                                </div>
                                                <div>
                                                    <p className="font-medium truncate max-w-xs">
                                                        {scan.target || 'Unknown'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 font-mono">
                                                        {scan.scan_id?.slice(0, 8)}...
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={getStatusBadge(scan.status)}>
                                                {scan.status}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`font-semibold ${(scan.result?.summary?.top_issues_count || 0) > 0
                                                    ? 'text-danger'
                                                    : 'text-success'
                                                }`}>
                                                {scan.result?.summary?.top_issues_count || 0}
                                            </span>
                                        </td>
                                        <td className="text-gray-400">
                                            {scan.result?.summary?.duration_seconds
                                                ? `${scan.result.summary.duration_seconds}s`
                                                : '-'}
                                        </td>
                                        <td className="text-gray-400">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                {formatDate(scan.submitted_at)}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {scan.status === 'completed' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onRescan && onRescan(scan.target);
                                                        }}
                                                        className="btn-icon"
                                                        title="Rescan"
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete && onDelete(scan.scan_id);
                                                    }}
                                                    className="btn-icon text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onViewResult && onViewResult(scan);
                                                    }}
                                                    className="btn-icon"
                                                    title="View Details"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state py-20">
                        <AlertCircle className="w-16 h-16 empty-state-icon mx-auto" />
                        <h3 className="text-lg font-medium text-gray-400 mb-2">
                            {searchQuery || statusFilter !== 'all'
                                ? 'No matching scans found'
                                : 'No scan history yet'}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {searchQuery || statusFilter !== 'all'
                                ? 'Try adjusting your search or filters'
                                : 'Run your first scan to see it here'}
                        </p>
                    </div>
                )}
            </motion.div>

            {/* Stats Footer */}
            {filteredScans.length > 0 && (
                <motion.div
                    className="flex items-center justify-between text-sm text-gray-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <span>
                        Showing {filteredScans.length} of {scans?.length || 0} scans
                    </span>
                    <span>
                        Total vulnerabilities found: {
                            filteredScans.reduce((acc, s) => acc + (s.result?.summary?.top_issues_count || 0), 0)
                        }
                    </span>
                </motion.div>
            )}
        </div>
    );
}

export default ScanHistory;

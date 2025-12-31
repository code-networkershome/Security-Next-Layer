import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Shield,
  Search,
  AlertTriangle,
  ArrowRight,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap,
  Radar,
  Bell,
  Info,
  StopCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ScanHistory from './components/ScanHistory';
import ThemeToggle from './components/ThemeToggle';
import ScanProgress from './components/ScanProgress';
import ExportButton from './components/ExportButton';

const API_BASE = 'http://localhost:8000';

function App() {
  // View state
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Scan state
  const [url, setUrl] = useState('');
  const [scanMode, setScanMode] = useState('quick'); // quick or deep
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('discovery');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [currentScanId, setCurrentScanId] = useState(null);

  // History state
  const [scanHistory, setScanHistory] = useState([]);

  // URL validation state
  const [urlError, setUrlError] = useState(null);

  // Refs for intervals (to allow stopping)
  const pollIntervalRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Theme effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  // Load history on mount
  useEffect(() => {
    loadScanHistory();
  }, []);

  const loadScanHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE}/scans`);
      setScanHistory(response.data || []);
    } catch (err) {
      console.log('Could not load scan history:', err.message);
    }
  };

  const simulateStepProgress = () => {
    const steps = ['discovery', 'detection', 'analysis', 'report'];
    let stepIndex = 0;

    const interval = setInterval(() => {
      stepIndex++;
      if (stepIndex < steps.length) {
        setCurrentStep(steps[stepIndex]);
      } else {
        clearInterval(interval);
      }
    }, 3000);

    return interval;
  };

  const handleScan = async (e) => {
    if (e) e.preventDefault();
    if (!url) return;

    // Quick URL validation
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        setUrlError('URL must start with http:// or https://');
        return;
      }
    } catch {
      setUrlError('Please enter a valid URL (e.g., http://example.com)');
      return;
    }
    setUrlError(null);

    setLoading(true);
    setResult(null);
    setError(null);
    setCurrentStep('discovery');
    setCurrentView('scanner');

    progressIntervalRef.current = simulateStepProgress();

    try {
      // Start the scan
      const startResponse = await axios.post(`${API_BASE}/scan`, {
        url,
        mode: scanMode
      });
      const { scan_id } = startResponse.data;
      setCurrentScanId(scan_id);

      // Poll for results
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusResponse = await axios.get(`${API_BASE}/scan/${scan_id}`);
          const { status, result: scanResult, error: scanError } = statusResponse.data;

          if (status === 'completed') {
            clearInterval(pollIntervalRef.current);
            clearInterval(progressIntervalRef.current);
            setCurrentStep('report');
            setResult(scanResult);
            setLoading(false);
            loadScanHistory(); // Refresh history
          } else if (status === 'failed' || status === 'cancelled') {
            clearInterval(pollIntervalRef.current);
            clearInterval(progressIntervalRef.current);
            setError(scanError || 'Scan failed.');
            setLoading(false);
          }
        } catch (pollErr) {
          clearInterval(pollIntervalRef.current);
          clearInterval(progressIntervalRef.current);
          setError('Failed to check scan status.');
          setLoading(false);
        }
      }, 2000);

    } catch (err) {
      clearInterval(progressIntervalRef.current);
      setLoading(false);
      setError(err.response?.data?.detail || 'Failed to start scan.');
    }
  };

  const handleStopScan = async () => {
    if (!currentScanId) return;

    try {
      await axios.post(`${API_BASE}/scan/${currentScanId}/cancel`);
      clearInterval(pollIntervalRef.current);
      clearInterval(progressIntervalRef.current);
      setLoading(false);
      setError('Scan was stopped by user.');
      loadScanHistory();
    } catch (err) {
      console.log('Failed to stop scan:', err.message);
    }
  };

  const handleRescan = (targetUrl) => {
    setUrl(targetUrl);
    setCurrentView('scanner');
    // Auto-start scan after short delay
    setTimeout(() => {
      handleScan();
    }, 100);
  };

  const handleDeleteScan = async (scanId) => {
    try {
      await axios.delete(`${API_BASE}/scan/${scanId}`);
      loadScanHistory();
    } catch (err) {
      console.log('Failed to delete scan:', err.message);
    }
  };

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getSeverityBadge = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'badge-critical';
      case 'high':
        return 'badge-high';
      case 'medium':
        return 'badge-medium';
      case 'low':
        return 'badge-low';
      default:
        return 'badge-info';
    }
  };

  // Render main content based on current view
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            scanHistory={scanHistory}
            onStartScan={() => setCurrentView('scanner')}
          />
        );

      case 'history':
        return (
          <ScanHistory
            scans={scanHistory}
            onRescan={handleRescan}
            onDelete={handleDeleteScan}
            onViewResult={(scan) => {
              if (scan.result) {
                setResult(scan.result);
                setCurrentScanId(scan.scan_id);
                setCurrentView('scanner');
              }
            }}
          />
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Settings</h1>
            <div className="glass rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Theme</h3>
                  <p className="text-sm text-gray-400">Toggle between dark and light mode</p>
                </div>
                <ThemeToggle isDark={isDarkMode} setIsDark={setIsDarkMode} />
              </div>
              <div className="border-t border-white/5" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Default Scan Mode</h3>
                  <p className="text-sm text-gray-400">Choose your preferred scan depth</p>
                </div>
                <div className="tabs">
                  <button
                    className={`tab ${scanMode === 'quick' ? 'active' : ''}`}
                    onClick={() => setScanMode('quick')}
                  >
                    Quick
                  </button>
                  <button
                    className={`tab ${scanMode === 'deep' ? 'active' : ''}`}
                    onClick={() => setScanMode('deep')}
                  >
                    Deep
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'scanner':
      default:
        return renderScanner();
    }
  };

  const renderScanner = () => (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Search className="w-7 h-7 text-accent" />
            Security Scanner
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Enter a URL to discover vulnerabilities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle isDark={isDarkMode} setIsDark={setIsDarkMode} />
          {result && <ExportButton scanResult={result} scanId={currentScanId} />}
        </div>
      </motion.div>

      {/* Scan Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-glow rounded-2xl p-6"
      >
        <form onSubmit={handleScan} className="space-y-4">
          <div className="relative group">
            <input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input text-lg !pl-12 !pr-44"
              required
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-accent transition-colors" />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary py-2 flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span>{loading ? 'Scanning...' : 'Scan'}</span>
            </button>
          </div>

          {/* Scan Mode Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Info className="w-4 h-4" />
              <span>Choose scan depth for your analysis</span>
            </div>
            <div className="tabs w-full sm:w-auto">
              <button
                type="button"
                className={`tab flex-1 sm:flex-none flex items-center justify-center gap-2 ${scanMode === 'quick' ? 'active' : ''}`}
                onClick={() => setScanMode('quick')}
              >
                <Zap className="w-4 h-4" />
                Quick Scan
              </button>
              <button
                type="button"
                className={`tab flex-1 sm:flex-none flex items-center justify-center gap-2 ${scanMode === 'deep' ? 'active' : ''}`}
                onClick={() => setScanMode('deep')}
              >
                <Radar className="w-4 h-4" />
                Deep Scan
              </button>
            </div>
          </div>
        </form>

        {/* URL Error */}
        {urlError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-danger text-sm flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            {urlError}
          </motion.div>
        )}
      </motion.div>

      {/* Progress */}
      <AnimatePresence mode="wait">
        {loading && (
          <div className="space-y-4">
            <ScanProgress currentStep={currentStep} isComplete={false} />

            {/* Stop Scan Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center"
            >
              <button
                onClick={handleStopScan}
                className="btn-danger py-3 px-6 flex items-center gap-2 text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all"
              >
                <StopCircle className="w-5 h-5" />
                <span>Stop Scan</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass rounded-xl p-4 border-l-4 border-l-danger flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-danger mt-0.5" />
            <div>
              <h4 className="font-semibold text-danger">Scan Failed</h4>
              <p className="text-sm text-gray-400">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <motion.div
                className="stat-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <p className="text-sm text-gray-400 mb-1">Target</p>
                <p className="font-semibold truncate" title={result.summary.target}>
                  {new URL(result.summary.target).hostname}
                </p>
              </motion.div>
              <motion.div
                className="stat-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-sm text-gray-400 mb-1">Endpoints Found</p>
                <p className="text-2xl font-bold text-accent">{result.summary.total_endpoints}</p>
              </motion.div>
              <motion.div
                className="stat-card border-l-4 border-l-danger"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-sm text-gray-400 mb-1">Vulnerabilities</p>
                <p className="text-2xl font-bold text-danger">{result.summary.top_issues_count}</p>
              </motion.div>
              <motion.div
                className="stat-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <p className="text-sm text-gray-400 mb-1">Scan Duration</p>
                <p className="text-2xl font-bold">{result.summary.duration_seconds}s</p>
              </motion.div>
            </div>

            {/* Findings */}
            {result.findings && result.findings.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-accent" />
                    Priority Fixes
                  </h3>
                  <span className="text-sm text-gray-400">
                    {result.findings.length} issues to address
                  </span>
                </div>

                <div className="space-y-4">
                  {result.findings.map((finding, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + idx * 0.1 }}
                      className="glass rounded-2xl overflow-hidden hover:border-accent/30 transition-all"
                    >
                      <div
                        className="p-5 cursor-pointer flex items-start justify-between"
                        onClick={() => toggleExpand(idx)}
                      >
                        <div className="flex gap-4">
                          <div className={`p-2 rounded-xl ${finding.severity === 'critical' || finding.severity === 'high'
                            ? 'bg-danger/20 text-danger'
                            : finding.severity === 'medium'
                              ? 'bg-warning/20 text-warning'
                              : 'bg-info/20 text-info'
                            }`}>
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="font-semibold">{finding.name}</h4>
                              <span className={getSeverityBadge(finding.severity)}>
                                {finding.severity}
                              </span>
                            </div>
                            <p className="text-sm text-gray-400 flex items-center gap-1 truncate max-w-lg">
                              <ExternalLink className="w-3 h-3" />
                              {finding.url}
                            </p>
                          </div>
                        </div>
                        <motion.div
                          animate={{ rotate: expanded[idx] ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        </motion.div>
                      </div>

                      <AnimatePresence>
                        {expanded[idx] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-white/5"
                          >
                            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-white/[0.01]">
                              <div className="space-y-4">
                                <div>
                                  <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                    What's Wrong
                                  </h5>
                                  <p className="text-sm leading-relaxed">
                                    {finding.interpretation?.what_is_wrong || 'No details available'}
                                  </p>
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                    Why It Matters
                                  </h5>
                                  <p className="text-sm text-gray-400 leading-relaxed">
                                    {finding.interpretation?.why_it_matters || 'No details available'}
                                  </p>
                                </div>
                              </div>
                              <div className="bg-accent/5 rounded-xl p-5 border border-accent/20">
                                <h5 className="text-xs font-bold uppercase tracking-wider text-accent mb-3">
                                  How to Fix
                                </h5>
                                <p className="text-sm leading-relaxed">
                                  {finding.interpretation?.how_to_fix || 'No fix recommendations available'}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              <motion.div
                className="glass rounded-2xl p-12 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-success" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Vulnerabilities Found</h3>
                <p className="text-gray-400">
                  Great news! The scan completed without detecting any security issues.
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!result && !loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center py-16"
        >
          <Shield className="w-20 h-20 mx-auto mb-6 text-gray-700" />
          <h2 className="text-2xl font-bold text-gray-500 mb-2">Ready to Scan</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Enter a URL above to discover endpoints and detect security vulnerabilities
            in your web application.
          </p>
        </motion.div>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen ${isDarkMode ? '' : 'light'}`}>
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Content */}
      <main
        className="transition-all duration-300 min-h-screen"
        style={{
          marginLeft: sidebarCollapsed ? '80px' : '256px',
          padding: '2rem'
        }}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Home</span>
            <span>/</span>
            <span className="text-foreground capitalize">{currentView}</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="btn-icon relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger rounded-full text-xs flex items-center justify-center text-white">
                2
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;

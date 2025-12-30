import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Download,
    FileJson,
    FileText,
    ChevronDown,
    Check
} from 'lucide-react';

function ExportButton({ scanResult, scanId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [exported, setExported] = useState(null);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const exportAsJSON = () => {
        const dataStr = JSON.stringify(scanResult, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `scan-report-${scanId || 'export'}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setExported('json');
        setTimeout(() => setExported(null), 2000);
        setIsOpen(false);
    };

    const exportAsText = () => {
        let textContent = `Security Scan Report\n`;
        textContent += `${'='.repeat(50)}\n\n`;
        textContent += `Target: ${scanResult.summary?.target || 'N/A'}\n`;
        textContent += `Total Endpoints: ${scanResult.summary?.total_endpoints || 0}\n`;
        textContent += `Issues Found: ${scanResult.summary?.top_issues_count || 0}\n`;
        textContent += `Duration: ${scanResult.summary?.duration_seconds || 0}s\n\n`;
        textContent += `${'='.repeat(50)}\n`;
        textContent += `FINDINGS\n`;
        textContent += `${'='.repeat(50)}\n\n`;

        if (scanResult.findings && scanResult.findings.length > 0) {
            scanResult.findings.forEach((finding, index) => {
                textContent += `[${index + 1}] ${finding.name}\n`;
                textContent += `    Severity: ${finding.severity?.toUpperCase() || 'Unknown'}\n`;
                textContent += `    URL: ${finding.url}\n`;
                if (finding.interpretation) {
                    textContent += `    Issue: ${finding.interpretation.what_is_wrong}\n`;
                    textContent += `    Impact: ${finding.interpretation.why_it_matters}\n`;
                    textContent += `    Fix: ${finding.interpretation.how_to_fix}\n`;
                }
                textContent += `\n${'-'.repeat(40)}\n\n`;
            });
        } else {
            textContent += `No vulnerabilities found.\n`;
        }

        const dataBlob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `scan-report-${scanId || 'export'}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setExported('txt');
        setTimeout(() => setExported(null), 2000);
        setIsOpen(false);
    };

    if (!scanResult) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="btn-secondary flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <Download className="w-4 h-4" />
                <span>Export</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="dropdown"
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                    >
                        <button
                            className="dropdown-item w-full"
                            onClick={exportAsJSON}
                        >
                            <FileJson className="w-4 h-4" />
                            <span>Export as JSON</span>
                            {exported === 'json' && <Check className="w-4 h-4 ml-auto text-success" />}
                        </button>
                        <button
                            className="dropdown-item w-full"
                            onClick={exportAsText}
                        >
                            <FileText className="w-4 h-4" />
                            <span>Export as Text</span>
                            {exported === 'txt' && <Check className="w-4 h-4 ml-auto text-success" />}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default ExportButton;

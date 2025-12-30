import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

function ThemeToggle({ isDark, setIsDark }) {
    return (
        <motion.button
            onClick={() => setIsDark(!isDark)}
            className="relative p-2 rounded-xl bg-white/5 border border-white/10 hover:border-accent/50 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
            <motion.div
                initial={false}
                animate={{ rotate: isDark ? 0 : 180 }}
                transition={{ duration: 0.3 }}
            >
                {isDark ? (
                    <Moon className="w-5 h-5 text-accent" />
                ) : (
                    <Sun className="w-5 h-5 text-yellow-400" />
                )}
            </motion.div>

            {/* Glow effect */}
            <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none"
                animate={{
                    boxShadow: isDark
                        ? '0 0 20px rgba(99, 102, 241, 0.2)'
                        : '0 0 20px rgba(250, 204, 21, 0.2)'
                }}
            />
        </motion.button>
    );
}

export default ThemeToggle;

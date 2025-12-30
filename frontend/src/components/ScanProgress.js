import React from 'react';
import { motion } from 'framer-motion';
import {
    Radar,
    Bug,
    Brain,
    FileCheck,
    CheckCircle2,
    Circle,
    Loader2
} from 'lucide-react';

const steps = [
    { id: 'discovery', label: 'Discovery', description: 'Finding endpoints', icon: Radar },
    { id: 'detection', label: 'Detection', description: 'Scanning vulnerabilities', icon: Bug },
    { id: 'analysis', label: 'Analysis', description: 'AI interpretation', icon: Brain },
    { id: 'report', label: 'Report', description: 'Generating results', icon: FileCheck },
];

function ScanProgress({ currentStep, isComplete }) {
    const getCurrentStepIndex = () => {
        return steps.findIndex(s => s.id === currentStep);
    };

    const currentIndex = getCurrentStepIndex();

    return (
        <motion.div
            className="glass-glow rounded-2xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Scan Progress</h3>
                {!isComplete && (
                    <div className="flex items-center gap-2 text-sm text-accent">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Scanning...</span>
                    </div>
                )}
            </div>

            {/* Progress Steps */}
            <div className="relative">
                {/* Connection Line */}
                <div className="absolute top-6 left-6 right-6 h-0.5 bg-white/10">
                    <motion.div
                        className="h-full bg-gradient-to-r from-accent to-cyber-purple"
                        initial={{ width: '0%' }}
                        animate={{
                            width: isComplete
                                ? '100%'
                                : `${(currentIndex / (steps.length - 1)) * 100}%`
                        }}
                        transition={{ duration: 0.5 }}
                    />
                </div>

                {/* Steps */}
                <div className="flex justify-between relative z-10">
                    {steps.map((step, index) => {
                        const Icon = step.icon;
                        const isActive = currentStep === step.id;
                        const isDone = isComplete || currentIndex > index;

                        return (
                            <motion.div
                                key={step.id}
                                className="flex flex-col items-center gap-2"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <motion.div
                                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isDone
                                            ? 'bg-gradient-to-br from-accent to-cyber-purple text-white'
                                            : isActive
                                                ? 'bg-accent/20 text-accent border-2 border-accent'
                                                : 'bg-white/5 text-gray-500 border border-white/10'
                                        }`}
                                    animate={isActive ? {
                                        boxShadow: ['0 0 0 0 rgba(99, 102, 241, 0.4)', '0 0 0 15px rgba(99, 102, 241, 0)', '0 0 0 0 rgba(99, 102, 241, 0)']
                                    } : {}}
                                    transition={isActive ? {
                                        duration: 1.5,
                                        repeat: Infinity
                                    } : {}}
                                >
                                    {isDone ? (
                                        <CheckCircle2 className="w-5 h-5" />
                                    ) : isActive ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                        >
                                            <Icon className="w-5 h-5" />
                                        </motion.div>
                                    ) : (
                                        <Icon className="w-5 h-5" />
                                    )}
                                </motion.div>

                                <div className="text-center">
                                    <p className={`text-sm font-medium ${isDone || isActive ? 'text-foreground' : 'text-gray-500'}`}>
                                        {step.label}
                                    </p>
                                    <p className="text-xs text-gray-500 hidden sm:block">
                                        {step.description}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Status Message */}
            <motion.div
                className="mt-6 text-center"
                key={currentStep}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                {isComplete ? (
                    <p className="text-success font-medium">✓ Scan completed successfully!</p>
                ) : (
                    <p className="text-gray-400">
                        {steps.find(s => s.id === currentStep)?.description || 'Initializing...'}
                    </p>
                )}
            </motion.div>
        </motion.div>
    );
}

export default ScanProgress;

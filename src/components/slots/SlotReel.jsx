import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SYMBOLS = ['Tony', 'Paulie', 'Silvio', 'Gabagool', '9mm', 'AJ', 'Meadow', 'BadaBing'];

export default function SlotReel({ positions, isSpinning, reelIndex, onSpinComplete }) {
    const [displaySymbols, setDisplaySymbols] = useState([0, 1, 2]);
    const [spinKey, setSpinKey] = useState(0);

    useEffect(() => {
        if (isSpinning) {
            setSpinKey(prev => prev + 1);
        }
    }, [isSpinning]);

    useEffect(() => {
        if (!isSpinning && positions) {
            const reelSymbols = [
                positions[reelIndex * 3],
                positions[reelIndex * 3 + 1],
                positions[reelIndex * 3 + 2]
            ];
            setDisplaySymbols(reelSymbols);
        }
    }, [isSpinning, positions, reelIndex]);

    return (
        <div className="relative w-20 sm:w-24 h-60 sm:h-72 overflow-hidden rounded-lg bg-gradient-to-b from-slate-900 to-slate-800 border-2 border-amber-500/30 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]">
            {/* Reel strip */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                    {isSpinning ? (
                        <motion.div
                            key={`spinning-${spinKey}`}
                            className="flex flex-col items-center"
                            initial={{ y: 0 }}
                            animate={{ y: [-300, 0] }}
                            transition={{
                                duration: 0.15,
                                repeat: Infinity,
                                ease: "linear",
                                delay: reelIndex * 0.1
                            }}
                        >
                            {[...Array(6)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-16 sm:w-20 h-16 sm:h-20 flex items-center justify-center text-2xl sm:text-3xl font-bold text-amber-400"
                                >
                                    {SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]}
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="stopped"
                            className="flex flex-col items-center"
                            initial={{ y: -50 }}
                            animate={{ y: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 20,
                                delay: reelIndex * 0.15
                            }}
                            onAnimationComplete={() => {
                                if (reelIndex === 4 && onSpinComplete) {
                                    onSpinComplete();
                                }
                            }}
                        >
                            {displaySymbols.map((symbolIndex, row) => (
                                <div
                                    key={row}
                                    className="w-16 sm:w-20 h-16 sm:h-20 flex items-center justify-center text-2xl sm:text-3xl font-bold text-amber-400"
                                >
                                    {SYMBOLS[symbolIndex]}
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5 pointer-events-none" />
            
            {/* Top/bottom shadows */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-900 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />
        </div>
    );
}

export { SYMBOLS };
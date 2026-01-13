import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Updated Theme
export const SYMBOLS = ['Tony', 'Paulie', 'Silvio', 'Gabagool', '9mm', 'AJ', 'Meadow', 'BadaBing'];

export default function SlotReel({ positions, isSpinning, reelIndex }) {
    const [displaySymbols, setDisplaySymbols] = useState([0, 1, 2]);
    const [spinKey, setSpinKey] = useState(0);

    useEffect(() => {
        if (isSpinning) setSpinKey(prev => prev + 1);
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
        <div className="relative w-20 sm:w-24 h-60 sm:h-72 overflow-hidden rounded-lg bg-slate-950 border-2 border-amber-500/30">
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                    {isSpinning ? (
                        <motion.div
                            key={`spinning-${spinKey}`}
                            initial={{ y: 0 }}
                            animate={{ y: [-300, 0] }}
                            transition={{ duration: 0.1, repeat: Infinity, ease: "linear", delay: reelIndex * 0.05 }}
                        >
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-20 flex items-center justify-center text-[10px] font-bold text-amber-400">
                                    {SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]}
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="stopped"
                            initial={{ y: -20 }}
                            animate={{ y: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 15, delay: reelIndex * 0.1 }}
                        >
                            {displaySymbols.map((symbolIndex, row) => (
                                <div key={row} className="h-20 flex items-center justify-center text-xs font-black text-amber-400 tracking-tighter uppercase">
                                    {SYMBOLS[symbolIndex]}
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none" />
        </div>
    );
}
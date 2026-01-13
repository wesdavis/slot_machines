import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const SYMBOLS = ['Tony', 'Paulie', 'Silvio', 'Gabagool', '9mm', 'AJ', 'Meadow', 'BadaBing'];

export default function SlotReel({ positions, isSpinning, reelIndex, isBonusMode }) {
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
        <div className={`relative w-24 h-[240px] overflow-hidden rounded-xl border-2 transition-all duration-500 ${isBonusMode ? 'bg-black border-red-900/50' : 'bg-slate-950 border-amber-500/20'}`}>
            <div className="absolute inset-0 flex flex-col items-center">
                <AnimatePresence mode="wait">
                    {isSpinning && !isBonusMode ? (
                        /* Standard Spin Animation: Visible symbols looping vertically */
                        <motion.div
                            key={`spinning-${spinKey}`}
                            className="flex flex-col"
                            initial={{ y: 0 }}
                            animate={{ y: [-1000, 0] }}
                            transition={{ duration: 0.15, repeat: Infinity, ease: "linear", delay: reelIndex * 0.05 }}
                        >
                            {[...Array(20)].map((_, i) => (
                                <div key={i} className="h-20 w-24 flex items-center justify-center text-[10px] font-bold text-amber-500/40 italic uppercase">
                                    {SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]}
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                        /* Result/Bonus Grid */
                        <motion.div
                            key="stopped"
                            className="flex flex-col"
                            initial={isBonusMode ? false : { y: -40 }}
                            animate={{ y: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20, delay: reelIndex * 0.1 }}
                        >
                            {displaySymbols.map((symbolIndex, row) => {
                                const isSticky = symbolIndex === 4; // 9mm
                                return (
                                    <motion.div
                                        key={row}
                                        className={`h-20 w-24 flex items-center justify-center text-center px-1 text-[11px] font-black uppercase tracking-tighter transition-all duration-300 ${isSticky ? 'text-white bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)] border-y border-white/20' : isBonusMode ? 'text-slate-800' : 'text-amber-500'}`}
                                        animate={isSpinning && isBonusMode && !isSticky ? { scale: [1, 0.9, 1], opacity: [0.5, 0.2, 0.5] } : {}}
                                        transition={{ repeat: Infinity, duration: 0.2 }}
                                    >
                                        {symbolIndex === 4 ? "9MM" : isBonusMode ? "?" : SYMBOLS[symbolIndex]}
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 pointer-events-none" />
            <div className="absolute inset-y-0 left-0 w-px bg-white/5 pointer-events-none" />
        </div>
    );
}

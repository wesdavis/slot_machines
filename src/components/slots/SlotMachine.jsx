import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, RotateCcw, Target } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import SlotReel from './SlotReel';
import SpinDetails from './SpinDetails';

const SYMBOLS = ['Tony', 'Paulie', 'Silvio', 'Gabagool', '9mm', 'AJ', 'Meadow', 'BadaBing'];

export default function SlotMachine({ onSpinComplete }) {
    const [isSpinning, setIsSpinning] = useState(false);
    const [reelPositions, setReelPositions] = useState(Array(15).fill(0));
    const [clientSeed, setClientSeed] = useState(Math.random().toString(36).substring(7));
    const [nonce, setNonce] = useState(1);
    const [pendingServerSeed, setPendingServerSeed] = useState(null);
    const [winAmount, setWinAmount] = useState(0);
    const [isFeatureTriggered, setIsFeatureTriggered] = useState(false);
    
    // Hold & Win States
    const [isBonusActive, setIsBonusActive] = useState(false);
    const [respinCount, setRespinCount] = useState(3);

    useEffect(() => { initializeServerSeed(); }, []);

    const initializeServerSeed = async () => {
        try {
            const response = await base44.functions.invoke('provablyFairSpin', { action: 'initSpin' });
            setPendingServerSeed(response.data.serverSeed);
        } catch (e) { console.error(e); }
    };

    const handleSpin = async () => {
        setIsSpinning(true);
        try {
            const response = await base44.functions.invoke('provablyFairSpin', {
                action: 'executeSpin',
                serverSeed: pendingServerSeed,
                clientSeed,
                nonce,
                betAmount: 5
            });

            setTimeout(() => {
                const { reelPositions: pos, winAmount: win, isFeatureTriggered: triggered } = response.data;
                setReelPositions(pos);
                setWinAmount(win);
                if (triggered) {
                    setIsBonusActive(true);
                    setRespinCount(3);
                }
                setNonce(n => n + 1);
                setIsSpinning(false);
                initializeServerSeed();
            }, 2000);
        } catch (e) { setIsSpinning(false); }
    };

    const handleBonusSpin = async () => {
        setIsSpinning(true);
        try {
            const response = await base44.functions.invoke('provablyFairSpin', {
                action: 'executeBonusSpin',
                serverSeed: pendingServerSeed,
                clientSeed,
                nonce,
                currentGrid: reelPositions
            });

            setTimeout(() => {
                const { reelPositions: nextGrid, newSymbolsAdded, currentBonusWin } = response.data;
                setReelPositions(nextGrid);
                setWinAmount(currentBonusWin);
                
                if (newSymbolsAdded > 0) {
                    setRespinCount(3); // Reset respins if new symbol hits
                } else {
                    const nextRespin = respinCount - 1;
                    setRespinCount(nextRespin);
                    if (nextRespin === 0) {
                        setIsBonusActive(false);
                        setIsFeatureTriggered(true);
                    }
                }
                
                setNonce(n => n + 1);
                setIsSpinning(false);
                initializeServerSeed();
            }, 1000);
        } catch (e) { setIsSpinning(false); }
    };

    return (
        <div className="space-y-6">
            <div className={`relative p-6 rounded-3xl border-4 transition-all duration-700 ${isBonusActive ? 'border-red-600 bg-black shadow-[0_0_50px_rgba(220,38,38,0.5)]' : 'border-amber-500 bg-slate-900 shadow-2xl'}`}>
                
                {/* Real-time Respin Counter */}
                <AnimatePresence>
                    {isBonusActive && (
                        <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="absolute -top-12 left-0 right-0 flex justify-center gap-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className={`w-8 h-8 rounded-full border-2 ${i < respinCount ? 'bg-red-600 border-white animate-pulse' : 'bg-slate-800 border-slate-700'}`} />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex gap-2 justify-center">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col gap-2">
                            {[0, 1, 2].map((row) => {
                                const symbolIdx = reelPositions[i * 3 + row];
                                const isSticky = symbolIdx === 4; // 9mm
                                return (
                                    <motion.div
                                        key={row}
                                        animate={isSpinning && !isSticky ? { opacity: [1, 0.2, 1], scale: [1, 0.9, 1] } : {}}
                                        transition={{ repeat: Infinity, duration: 0.1 }}
                                        className={`w-20 h-20 rounded-lg flex items-center justify-center font-black text-[10px] border-2 transition-colors ${isSticky ? 'bg-red-600 border-yellow-400 text-white shadow-[0_0_15px_rgba(255,255,0,0.5)]' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                                    >
                                        {isSticky ? '9MM' : isBonusActive ? '' : SYMBOLS[symbolIdx]}
                                    </motion.div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            <Button 
                onClick={isBonusActive ? handleBonusSpin : handleSpin} 
                disabled={isSpinning} 
                className={`w-full h-16 text-3xl font-black rounded-2xl shadow-xl transition-all ${isBonusActive ? 'bg-orange-600 hover:bg-orange-500 animate-pulse' : 'bg-red-700 hover:bg-red-600'}`}
            >
                {isSpinning ? <Loader2 className="animate-spin w-8 h-8" /> : (isBonusActive ? "COLLECT EVIDENCE" : "SPIN")}
            </Button>

            <AnimatePresence>
                {isFeatureTriggered && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
                        <div className="text-center p-16 border-8 border-red-600 rounded-[50px] bg-slate-950 shadow-[0_0_100px_rgba(220,38,38,0.8)]">
                            <Target className="w-20 h-20 text-red-600 mx-auto mb-4 animate-ping" />
                            <h2 className="text-7xl font-black text-white mb-2 italic tracking-tighter">MEETING ADJOURNED</h2>
                            <div className="text-9xl font-black text-green-500 mb-8 tabular-nums">+{winAmount}x</div>
                            <Button onClick={() => setIsFeatureTriggered(false)} className="bg-white text-black px-16 py-8 text-3xl font-black rounded-full hover:bg-slate-200">TAKE THE CUT</Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, RotateCcw, Target, Zap } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import SlotReel from './SlotReel';
import SpinDetails from './SpinDetails';

// SVG Coordinates for 5 Paylines
const LINE_COORDS = [
    "M 0 120 L 600 120", // Middle
    "M 0 40 L 600 40",   // Top
    "M 0 200 L 600 200", // Bottom
    "M 0 40 L 150 120 L 300 200 L 450 120 L 600 40", // V
    "M 0 200 L 150 120 L 300 40 L 450 120 L 600 200"  // Inv-V
];

export default function SlotMachine({ onSpinComplete }) {
    const [isSpinning, setIsSpinning] = useState(false);
    const [reelPositions, setReelPositions] = useState(Array(15).fill(0));
    const [clientSeed, setClientSeed] = useState(Math.random().toString(36).substring(7));
    const [nonce, setNonce] = useState(1);
    const [pendingServerSeed, setPendingServerSeed] = useState(null);
    const [winAmount, setWinAmount] = useState(0);
    const [winDetails, setWinDetails] = useState([]);
    const [isFeatureTriggered, setIsFeatureTriggered] = useState(false); // Final payout screen
    
    // HOLD & WIN STATES
    const [isBonusActive, setIsBonusActive] = useState(false); // Active gameplay mode
    const [respinCount, setRespinCount] = useState(3);
    const [betAmount, setBetAmount] = useState(5);

    useEffect(() => { initializeServerSeed(); }, []);

    const initializeServerSeed = async () => {
        try {
            const response = await base44.functions.invoke('provablyFairSpin', { action: 'initSpin' });
            setPendingServerSeed(response.data.serverSeed);
        } catch (e) { console.error(e); }
    };

    const handleSpin = async () => {
        if (isSpinning) return;
        setIsSpinning(true);
        setWinAmount(0);
        setWinDetails([]);
        try {
            const response = await base44.functions.invoke('provablyFairSpin', {
                action: 'executeSpin',
                serverSeed: pendingServerSeed,
                clientSeed,
                nonce,
                betAmount
            });

            setTimeout(() => {
                const { reelPositions: pos, winAmount: win, isFeatureTriggered: triggered, winDetails: details } = response.data;
                setReelPositions(pos);
                setWinAmount(win);
                setWinDetails(details);
                
                // IF TRIGGERED, START BONUS MODE
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
        if (isSpinning) return;
        setIsSpinning(true);
        try {
            const response = await base44.functions.invoke('provablyFairSpin', {
                action: 'executeBonusSpin',
                serverSeed: pendingServerSeed,
                clientSeed,
                nonce,
                currentGrid: reelPositions,
                betAmount
            });

            setTimeout(() => {
                const { reelPositions: nextGrid, newSymbolsAdded, currentBonusWin } = response.data;
                setReelPositions(nextGrid);
                setWinAmount(currentBonusWin);
                
                // RESET COUNTER IF NEW SYMBOL LANDS
                if (newSymbolsAdded > 0) {
                    setRespinCount(3);
                } else {
                    const nextVal = respinCount - 1;
                    setRespinCount(nextVal);
                    // END BONUS IF 0 LIVES LEFT
                    if (nextVal === 0) {
                        setIsBonusActive(false);
                        setIsFeatureTriggered(true); // Show payout
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
            <div className={`relative p-4 rounded-3xl border-4 transition-all duration-700 ${isBonusActive ? 'border-red-600 bg-black shadow-[0_0_50px_rgba(220,38,38,0.5)]' : 'border-amber-500 bg-slate-900 shadow-2xl'}`}>
                
                {/* SVG Paylines */}
                {!isSpinning && !isBonusActive && (
                    <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none px-4 py-4" viewBox="0 0 600 240">
                        {LINE_COORDS.map((d, i) => (
                            <motion.path
                                key={i}
                                d={d}
                                fill="transparent"
                                stroke={winDetails.some(w => w.line === i + 1) ? "#22c55e" : "rgba(245,158,11,0.15)"}
                                strokeWidth={winDetails.some(w => w.line === i + 1) ? "4" : "1"}
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                            />
                        ))}
                    </svg>
                )}

                {/* Respin Counter Lights */}
                <AnimatePresence>
                    {isBonusActive && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute -top-12 left-0 right-0 flex justify-center gap-6">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className={`w-8 h-8 rounded-full border-2 ${i < respinCount ? 'bg-red-600 border-white animate-pulse' : 'bg-slate-800 border-slate-700'}`} />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex gap-2 justify-center relative z-0">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <SlotReel 
                            key={i} 
                            positions={reelPositions} 
                            isSpinning={isSpinning} 
                            reelIndex={i} 
                            isBonusMode={isBonusActive}
                        />
                    ))}
                </div>
            </div>

            {/* Controls */}
            <div className="bg-slate-900/90 p-6 rounded-2xl border border-amber-500/20 shadow-xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-amber-400 font-bold uppercase text-xs">Total Stake</Label>
                        <Input type="number" value={betAmount} onChange={(e) => setBetAmount(parseInt(e.target.value))} className="bg-slate-800 border-slate-700 text-amber-500 font-black text-xl h-12" disabled={isSpinning || isBonusActive} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-amber-400 font-bold uppercase text-xs">Client Seed</Label>
                        <Input value={clientSeed} onChange={(e) => setClientSeed(e.target.value)} className="bg-slate-800 border-slate-700 text-slate-300 font-mono text-xs h-12" disabled={isSpinning || isBonusActive} />
                    </div>
                </div>

                <Button 
                    onClick={isBonusActive ? handleBonusSpin : handleSpin} 
                    disabled={isSpinning} 
                    className={`w-full h-20 text-4xl font-black rounded-xl shadow-2xl transition-all ${isBonusActive ? 'bg-orange-600 hover:bg-orange-500' : 'bg-red-700 hover:bg-red-600'}`}
                >
                    {isSpinning ? <Loader2 className="w-10 h-10 animate-spin" /> : (isBonusActive ? <Zap className="w-10 h-10 mr-2" /> : <RotateCcw className="w-10 h-10 mr-2" />)}
                    {isSpinning ? "" : (isBonusActive ? "RESPIN" : "SPIN")}
                </Button>
            </div>

            {/* Feature Payout Overlay */}
            <AnimatePresence>
                {isFeatureTriggered && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl">
                        <div className="text-center p-16 border-8 border-red-600 rounded-[60px] bg-slate-950 shadow-[0_0_120px_rgba(220,38,38,0.7)]">
                            <Target className="w-24 h-24 text-red-600 mx-auto mb-6 animate-ping" />
                            <h2 className="text-7xl font-black text-white mb-2 italic uppercase">Business Concluded</h2>
                            <div className="text-[10rem] font-black text-green-500 mb-8 leading-none tabular-nums">${winAmount}</div>
                            <Button onClick={() => setIsFeatureTriggered(false)} className="bg-white text-black px-20 py-10 text-4xl font-black rounded-full hover:scale-105 transition-transform">COLLECT</Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <SpinDetails spinData={lastSpinData} pendingHash={pendingHash} isSpinning={isSpinning} />
        </div>
    );
}

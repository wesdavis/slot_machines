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

export default function SlotMachine({ onSpinComplete }) {
    const [isSpinning, setIsSpinning] = useState(false);
    const [reelPositions, setReelPositions] = useState(Array(15).fill(0));
    const [clientSeed, setClientSeed] = useState(Math.random().toString(36).substring(7));
    const [nonce, setNonce] = useState(1);
    const [pendingServerSeed, setPendingServerSeed] = useState(null);
    const [winAmount, setWinAmount] = useState(0);
    const [isFeatureTriggered, setIsFeatureTriggered] = useState(false);
    const [isBonusActive, setIsBonusActive] = useState(false);
    const [respinCount, setRespinCount] = useState(3);
    const [betAmount, setBetAmount] = useState(5);

    useEffect(() => { initializeServerSeed(); }, []);

    const initializeServerSeed = async () => {
        const response = await base44.functions.invoke('provablyFairSpin', { action: 'initSpin' });
        setPendingServerSeed(response.data.serverSeed);
    };

    const handleSpin = async () => {
        if (isSpinning || !pendingServerSeed) return;
        setIsSpinning(true);
        const response = await base44.functions.invoke('provablyFairSpin', {
            action: 'executeSpin',
            serverSeed: pendingServerSeed,
            clientSeed,
            nonce,
            betAmount
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
    };

    const handleBonusSpin = async () => {
        if (isSpinning || !pendingServerSeed) return;
        setIsSpinning(true);
        const response = await base44.functions.invoke('provablyFairSpin', {
            action: 'executeBonusSpin',
            serverSeed: pendingServerSeed,
            clientSeed,
            nonce,
            currentGrid: reelPositions,
            lastRespin: respinCount === 1,
            betAmount
        });

        setTimeout(() => {
            const { reelPositions: nextGrid, newSymbolsAdded, currentBonusWin, isComplete } = response.data;
            setReelPositions(nextGrid);
            setWinAmount(currentBonusWin);
            
            if (newSymbolsAdded > 0) {
                setRespinCount(3);
            } else {
                const newCount = respinCount - 1;
                setRespinCount(newCount);
                if (newCount === 0 || isComplete) {
                    setIsBonusActive(false);
                    setIsFeatureTriggered(true);
                }
            }
            setNonce(n => n + 1);
            setIsSpinning(false);
            initializeServerSeed();
        }, 1000);
    };

    return (
        <div className="space-y-6">
            <div className={`relative p-4 rounded-3xl border-4 transition-all duration-700 ${isBonusActive ? 'border-red-600 bg-black' : 'border-amber-500 bg-slate-900'}`}>
                <AnimatePresence>
                    {isBonusActive && (
                        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute -top-12 left-0 right-0 flex justify-center gap-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className={`w-8 h-8 rounded-full border-2 ${i < respinCount ? 'bg-red-600 border-white' : 'bg-slate-800 border-slate-700'}`} />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="flex gap-2 justify-center">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <SlotReel key={i} positions={reelPositions} isSpinning={isSpinning} reelIndex={i} isBonusMode={isBonusActive} />
                    ))}
                </div>
            </div>
            <Button onClick={isBonusActive ? handleBonusSpin : handleSpin} disabled={isSpinning} className={`w-full h-20 text-4xl font-black rounded-xl ${isBonusActive ? 'bg-orange-600' : 'bg-red-700'}`}>
                {isSpinning ? <Loader2 className="animate-spin w-10 h-10" /> : (isBonusActive ? "BONUS SPIN" : "SPIN")}
            </Button>
            <AnimatePresence>
                {isFeatureTriggered && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
                        <div className="text-center p-16 border-8 border-red-600 rounded-[50px] bg-slate-950">
                            <h2 className="text-6xl font-black text-white mb-4 italic">BUSINESS MEETING OVER</h2>
                            <div className="text-[10rem] font-black text-green-500 leading-none">${winAmount}</div>
                            <Button onClick={() => setIsFeatureTriggered(false)} className="mt-8 bg-white text-black px-16 py-8 text-3xl font-black rounded-full">COLLECT</Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
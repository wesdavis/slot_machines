import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, RotateCcw } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import SlotReel from './SlotReel';

export default function SlotMachine({ onSpinComplete }) {
    const [isSpinning, setIsSpinning] = useState(false);
    const [reelPositions, setReelPositions] = useState(Array(15).fill(0));
    const [clientSeed, setClientSeed] = useState(Math.random().toString(36).substring(7));
    const [nonce, setNonce] = useState(1);
    const [pendingServerSeed, setPendingServerSeed] = useState(null);
    const [winAmount, setWinAmount] = useState(0);
    const [isFeatureTriggered, setIsFeatureTriggered] = useState(false);
    const [respinCount, setRespinCount] = useState(3);
    const [isBonusActive, setIsBonusActive] = useState(false);

    useEffect(() => { initializeServerSeed(); }, []);

    const initializeServerSeed = async () => {
        const response = await base44.functions.invoke('provablyFairSpin', { action: 'initSpin' });
        setPendingServerSeed(response.data.serverSeed);
    };

    const handleSpin = async () => {
        setIsSpinning(true);
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
    };

    const handleBonusSpin = async () => {
        setIsSpinning(true);
        const response = await base44.functions.invoke('provablyFairSpin', {
            action: 'executeBonusSpin',
            serverSeed: pendingServerSeed,
            clientSeed,
            nonce,
            currentGrid: reelPositions
        });

        setTimeout(() => {
            const { reelPositions: nextGrid, newSymbolsAdded } = response.data;
            setReelPositions(nextGrid);
            if (newSymbolsAdded > 0) setRespinCount(3);
            else setRespinCount(c => c - 1);
            
            if (respinCount <= 1 && newSymbolsAdded === 0) {
                // End Bonus
                setIsBonusActive(false);
                setIsFeatureTriggered(true); // Shows the final "Business Meeting" summary
            }
            setNonce(n => n + 1);
            setIsSpinning(false);
            initializeServerSeed();
        }, 1000);
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-xl border-4 border-amber-500 shadow-2xl relative">
                {isBonusActive && (
                    <div className="absolute -top-10 left-0 right-0 text-center">
                        <Badge className="bg-red-600 text-white text-xl px-6 py-2">
                            RESPINS LEFT: {respinCount}
                        </Badge>
                    </div>
                )}
                <div className="flex gap-2 justify-center">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <SlotReel key={i} positions={reelPositions} isSpinning={isSpinning} reelIndex={i} />
                    ))}
                </div>
            </div>

            <Button 
                onClick={isBonusActive ? handleBonusSpin : handleSpin} 
                disabled={isSpinning} 
                className={`w-full h-16 text-2xl font-black ${isBonusActive ? 'bg-orange-500' : 'bg-red-600'}`}
            >
                {isSpinning ? <Loader2 className="animate-spin" /> : (isBonusActive ? "BONUS SPIN" : "SPIN")}
            </Button>

            <AnimatePresence>
                {isFeatureTriggered && (
                    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
                        <div className="text-center p-12 border-4 border-amber-500 rounded-3xl bg-slate-900">
                            <h2 className="text-5xl font-black text-amber-400 mb-4">BUSINESS MEETING OVER</h2>
                            <div className="text-7xl font-bold text-green-400">+{winAmount}x</div>
                            <Button onClick={() => setIsFeatureTriggered(false)} className="mt-8 bg-amber-500 text-black px-12 py-4 text-xl">COLLECT</Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

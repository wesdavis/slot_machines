import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/cite: components/ui/button";
import { Input } from "@/cite: components/ui/input";
import { Label } from "@/cite: components/ui/label";
import { Badge } from "@/cite: components/ui/badge";
import { Loader2, Sparkles, RotateCcw, Dices, Trophy } from 'lucide-react';
import { base44 } from "@/cite: api/base44Client";
import SlotReel from './SlotReel';
import SpinDetails from './SpinDetails';

export default function SlotMachine({ onSpinComplete }) {
    const [isSpinning, setIsSpinning] = useState(false);
    const [reelPositions, setReelPositions] = useState(null);
    const [clientSeed, setClientSeed] = useState('');
    const [nonce, setNonce] = useState(1);
    const [pendingServerSeed, setPendingServerSeed] = useState(null);
    const [pendingHash, setPendingHash] = useState(null);
    const [lastSpinData, setLastSpinData] = useState(null);
    const [winAmount, setWinAmount] = useState(0);
    const [winDetails, setWinDetails] = useState([]);
    const [isFeatureTriggered, setIsFeatureTriggered] = useState(false);
    const [loading, setLoading] = useState(false);
    const [betAmount, setBetAmount] = useState(5); // Default to 5 for 1 per line

    useEffect(() => {
        initializeServerSeed();
        setClientSeed(Math.random().toString(36).substring(2, 15));
    }, []);

    const initializeServerSeed = async () => {
        setLoading(true);
        try {
            const response = await base44.functions.invoke('provablyFairSpin', { action: 'initSpin' });
            setPendingServerSeed(response.data.serverSeed);
            setPendingHash(response.data.serverSeedHash);
        } catch (error) {
            console.error('Init failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSpin = async () => {
        if (!clientSeed || !pendingServerSeed) return;
        setIsSpinning(true);
        setWinAmount(0);
        setWinDetails([]);
        setIsFeatureTriggered(false);

        try {
            const response = await base44.functions.invoke('provablyFairSpin', {
                action: 'executeSpin',
                serverSeed: pendingServerSeed,
                clientSeed,
                nonce,
                betAmount
            });

            const { reelPositions: newPositions, winAmount: totalWin, winDetails: details, isFeatureTriggered: featureTriggered, ...spinData } = response.data;

            setTimeout(() => {
                setReelPositions(newPositions);
                setWinAmount(totalWin);
                setWinDetails(details);
                setIsFeatureTriggered(featureTriggered);
                setLastSpinData({ ...spinData, reelPositions: newPositions, winAmount: totalWin });
                setNonce(prev => prev + 1);
                initializeServerSeed();
                if (onSpinComplete) onSpinComplete({ ...spinData, reelPositions: newPositions, winAmount: totalWin, winDetails: details, isFeatureTriggered: featureTriggered });
            }, 2000);

            setTimeout(() => setIsSpinning(false), 2500);
        } catch (error) {
            console.error('Spin failed:', error);
            setIsSpinning(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-b from-amber-600 via-yellow-500 to-amber-700 rounded-3xl opacity-80 blur-sm" />
                <div className="relative bg-slate-900 rounded-xl p-6 border-4 border-amber-500/50 shadow-2xl">
                    <div className="flex gap-2 justify-center">
                        {[0, 1, 2, 3, 4].map((i) => (
                            <SlotReel key={i} positions={reelPositions} isSpinning={isSpinning} reelIndex={i} />
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-amber-500/20 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Total Bet (5 Lines)</Label>
                        <Input type="number" value={betAmount} onChange={(e) => setBetAmount(parseInt(e.target.value))} className="h-8 bg-slate-800" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Client Seed</Label>
                        <Input value={clientSeed} onChange={(e) => setClientSeed(e.target.value)} className="h-8 bg-slate-800 font-mono text-xs" />
                    </div>
                </div>

                <Button onClick={handleSpin} disabled={isSpinning || loading} className="w-full h-12 bg-red-600 hover:bg-red-700 font-bold">
                    {isSpinning ? <Loader2 className="animate-spin" /> : "SPIN"}
                </Button>

                <AnimatePresence>
                    {winAmount > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-green-500/10 border border-green-500/50 rounded-lg">
                            <div className="flex justify-between items-center text-green-400 font-bold">
                                <span>TOTAL WIN</span>
                                <span>{winAmount}x</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Hold & Win Bonus Overlay */}
            <AnimatePresence>
                {isFeatureTriggered && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
                    >
                        <div className="text-center p-12 border-4 border-amber-500 rounded-[40px] bg-slate-900 shadow-[0_0_100px_rgba(245,158,11,0.3)]">
                            <h2 className="text-6xl font-black text-amber-400 mb-2 italic">BUSINESS MEETING</h2>
                            <p className="text-slate-400 text-xl tracking-widest mb-8">HOLD & WIN ACTIVATED</p>
                            <div className="text-8xl font-black text-green-400 mb-8 drop-shadow-lg">+{winAmount}x</div>
                            <Button onClick={() => setIsFeatureTriggered(false)} className="bg-amber-500 text-slate-950 font-black px-12 py-8 text-2xl rounded-2xl hover:bg-amber-400">
                                COLLECT
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <SpinDetails spinData={lastSpinData} pendingHash={pendingHash} isSpinning={isSpinning} />
        </div>
    );
}

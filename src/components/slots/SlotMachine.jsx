import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, RotateCcw, Dices } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import SlotReel, { SYMBOLS } from './SlotReel';
import SpinDetails from './SpinDetails';

export default function SlotMachine({ onSpinComplete }) {
    const [isSpinning, setIsSpinning] = useState(false);
    const [reelPositions, setReelPositions] = useState(null);
    const [clientSeed, setClientSeed] = useState('');
    const [nonce, setNonce] = useState(1);
    const [pendingServerSeed, setPendingServerSeed] = useState(null);
    const [pendingHash, setPendingHash] = useState(null);
    const [lastSpinData, setLastSpinData] = useState(null);
    const [winLines, setWinLines] = useState([]);
    const [loading, setLoading] = useState(false);

    // Initialize server seed on mount
    useEffect(() => {
        initializeServerSeed();
        // Generate random client seed
        setClientSeed(Math.random().toString(36).substring(2, 15));
    }, []);

    const initializeServerSeed = async () => {
        setLoading(true);
        try {
            const response = await base44.functions.invoke('provablyFairSpin', {
                action: 'initSpin'
            });
            setPendingServerSeed(response.data.serverSeed);
            setPendingHash(response.data.serverSeedHash);
        } catch (error) {
            console.error('Failed to init:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkWins = (positions) => {
        const wins = [];
        // Check middle row (indices 1, 4, 7, 10, 13)
        const middleRow = [positions[1], positions[4], positions[7], positions[10], positions[13]];
        if (middleRow.every(s => s === middleRow[0])) {
            wins.push({ line: 'middle', symbol: middleRow[0], count: 5 });
        } else if (middleRow.slice(0, 3).every(s => s === middleRow[0])) {
            wins.push({ line: 'middle', symbol: middleRow[0], count: 3 });
        }
        
        // Check top row (indices 0, 3, 6, 9, 12)
        const topRow = [positions[0], positions[3], positions[6], positions[9], positions[12]];
        if (topRow.every(s => s === topRow[0])) {
            wins.push({ line: 'top', symbol: topRow[0], count: 5 });
        } else if (topRow.slice(0, 3).every(s => s === topRow[0])) {
            wins.push({ line: 'top', symbol: topRow[0], count: 3 });
        }
        
        // Check bottom row (indices 2, 5, 8, 11, 14)
        const bottomRow = [positions[2], positions[5], positions[8], positions[11], positions[14]];
        if (bottomRow.every(s => s === bottomRow[0])) {
            wins.push({ line: 'bottom', symbol: bottomRow[0], count: 5 });
        } else if (bottomRow.slice(0, 3).every(s => s === bottomRow[0])) {
            wins.push({ line: 'bottom', symbol: bottomRow[0], count: 3 });
        }

        return wins;
    };

    const handleSpin = async () => {
        if (!clientSeed || !pendingServerSeed) return;

        setIsSpinning(true);
        setWinLines([]);

        try {
            const response = await base44.functions.invoke('provablyFairSpin', {
                action: 'executeSpin',
                serverSeed: pendingServerSeed,
                clientSeed,
                nonce
            });

            const { reelPositions: newPositions, ...spinData } = response.data;

            // Delay showing results for animation
            setTimeout(() => {
                setReelPositions(newPositions);
                setLastSpinData({ ...spinData, reelPositions: newPositions });
                setNonce(prev => prev + 1);
                
                // Check for wins
                const wins = checkWins(newPositions);
                setWinLines(wins);

                // Get new server seed for next spin
                initializeServerSeed();
                
                if (onSpinComplete) {
                    onSpinComplete({ ...spinData, reelPositions: newPositions, wins });
                }
            }, 2000);

            // Stop spinning animation
            setTimeout(() => {
                setIsSpinning(false);
            }, 2500);

        } catch (error) {
            console.error('Spin failed:', error);
            setIsSpinning(false);
        }
    };

    const randomizeClientSeed = () => {
        setClientSeed(Math.random().toString(36).substring(2, 15));
    };

    return (
        <div className="space-y-6">
            {/* Slot Machine Frame */}
            <div className="relative">
                {/* Decorative frame */}
                <div className="absolute -inset-4 bg-gradient-to-b from-amber-600 via-yellow-500 to-amber-700 rounded-3xl opacity-80 blur-sm" />
                <div className="absolute -inset-3 bg-gradient-to-b from-amber-500 to-yellow-600 rounded-2xl" />
                
                <div className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl p-4 sm:p-6 border-4 border-amber-500/50 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]">
                    {/* Win indicator */}
                    {winLines.length > 0 && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"
                        >
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-1 text-lg animate-pulse">
                                <Sparkles className="w-4 h-4 mr-1" />
                                WIN!
                            </Badge>
                        </motion.div>
                    )}

                    {/* Reels container */}
                    <div className="flex gap-2 sm:gap-3 justify-center">
                        {[0, 1, 2, 3, 4].map((reelIndex) => (
                            <SlotReel
                                key={reelIndex}
                                positions={reelPositions}
                                isSpinning={isSpinning}
                                reelIndex={reelIndex}
                            />
                        ))}
                    </div>

                    {/* Payline indicator */}
                    <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-px bg-amber-400/50 pointer-events-none" />
                </div>
            </div>

            {/* Controls */}
            <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-4 border border-amber-500/20 space-y-4">
                {/* Client Seed Input */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-slate-300 text-sm">Your Seed (Client Seed)</Label>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={randomizeClientSeed}
                            className="text-amber-400 hover:text-amber-300 h-7"
                        >
                            <Dices className="w-3 h-3 mr-1" />
                            Randomize
                        </Button>
                    </div>
                    <Input
                        value={clientSeed}
                        onChange={(e) => setClientSeed(e.target.value)}
                        placeholder="Enter your seed..."
                        className="bg-slate-800 border-slate-700 text-slate-200 font-mono"
                        disabled={isSpinning}
                    />
                </div>

                {/* Nonce display */}
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Spin #:</span>
                    <Badge variant="outline" className="border-slate-600 text-slate-300 font-mono">
                        {nonce}
                    </Badge>
                </div>

                {/* Spin Button */}
                <Button
                    onClick={handleSpin}
                    disabled={isSpinning || loading || !clientSeed}
                    className="w-full h-14 text-xl font-bold bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-700 hover:via-red-600 hover:to-red-700 shadow-lg shadow-red-500/30 disabled:opacity-50"
                >
                    {isSpinning ? (
                        <>
                            <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                            SPINNING...
                        </>
                    ) : loading ? (
                        <>
                            <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                            PREPARING...
                        </>
                    ) : (
                        <>
                            <RotateCcw className="w-6 h-6 mr-2" />
                            SPIN
                        </>
                    )}
                </Button>
            </div>

            {/* Cryptographic Details */}
            <SpinDetails
                spinData={lastSpinData}
                pendingHash={pendingHash}
                isSpinning={isSpinning}
            />
        </div>
    );
}
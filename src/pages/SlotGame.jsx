import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, ShieldCheck, Info, Sparkles } from 'lucide-react';
import SlotMachine from '@/components/slots/SlotMachine';
import VerificationTool from '@/components/slots/VerificationTool';

const SYMBOLS = ['Tony', 'Paulie', 'Silvio', 'Gabagool', '9mm', 'AJ', 'Meadow', 'BadaBing'];

export default function SlotGame() {
    const [lastSpinData, setLastSpinData] = useState(null);
    const [spinHistory, setSpinHistory] = useState([]);

    const handleSpinComplete = (spinData) => {
        setLastSpinData(spinData);
        setSpinHistory(prev => [spinData, ...prev].slice(0, 10));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            {/* Ambient background effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-transparent bg-clip-text mb-2">
                        PROVABLY FAIR SLOTS
                    </h1>
                    <p className="text-slate-400 flex items-center justify-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-green-400" />
                        Cryptographically verified fair gameplay
                    </p>
                </motion.div>

                {/* Main content */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Slot Machine - Takes 2 columns on large screens */}
                    <div className="lg:col-span-2">
                        <Tabs defaultValue="game" className="w-full">
                            <TabsList className="w-full bg-slate-900/80 border border-amber-500/20 mb-4">
                                <TabsTrigger value="game" className="flex-1 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                                    <Gamepad2 className="w-4 h-4 mr-2" />
                                    Play
                                </TabsTrigger>
                                <TabsTrigger value="verify" className="flex-1 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                    Verify
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="game" className="mt-0">
                                <SlotMachine onSpinComplete={handleSpinComplete} />
                            </TabsContent>

                            <TabsContent value="verify" className="mt-0">
                                <VerificationTool lastSpinData={lastSpinData} />
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Side panel */}
                    <div className="space-y-4">
                        {/* How it works */}
                        <Card className="bg-slate-900/80 border-amber-500/20 backdrop-blur-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg text-amber-400 flex items-center gap-2">
                                    <Info className="w-5 h-5" />
                                    How Provably Fair Works
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex gap-3">
                                    <Badge className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-400 shrink-0">1</Badge>
                                    <p className="text-slate-400">
                                        <strong className="text-slate-200">Server Seed:</strong> Generated before each spin, you see its hash first
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <Badge className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-400 shrink-0">2</Badge>
                                    <p className="text-slate-400">
                                        <strong className="text-slate-200">Client Seed:</strong> You provide this, ensuring you influence the outcome
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <Badge className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-400 shrink-0">3</Badge>
                                    <p className="text-slate-400">
                                        <strong className="text-slate-200">Nonce:</strong> Increments each spin for unique results
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <Badge className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-400 shrink-0">4</Badge>
                                    <p className="text-slate-400">
                                        <strong className="text-slate-200">SHA-256:</strong> All combined and hashed to determine reel positions
                                    </p>
                                </div>
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mt-3">
                                    <p className="text-green-300 text-xs">
                                        ✓ The server seed hash proves the outcome was locked BEFORE you pressed spin
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Paytable */}
                        <Card className="bg-slate-900/80 border-amber-500/20 backdrop-blur-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg text-amber-400 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5" />
                                    Symbols
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-4 gap-2">
                                    {SYMBOLS.map((symbol, i) => (
                                        <div
                                            key={i}
                                            className="aspect-square bg-slate-800/50 rounded-lg flex items-center justify-center text-lg font-bold text-amber-400 border border-slate-700/50 hover:border-amber-500/50 transition-colors"
                                        >
                                            {symbol}
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-3 space-y-2 text-xs">
                                    <div className="text-slate-400">
                                        <strong className="text-slate-200">Middle Row Wins:</strong>
                                    </div>
                                    <div className="flex justify-between text-slate-400">
                                        <span>3 matching symbols</span>
                                        <span className="text-green-400 font-semibold">5x bet</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400">
                                        <span>4 matching symbols</span>
                                        <span className="text-green-400 font-semibold">20x bet</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400">
                                        <span>5 matching symbols</span>
                                        <span className="text-green-400 font-semibold">100x bet</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-700">
                                        <div className="flex justify-between text-purple-400">
                                            <span>3+ S5 symbols (anywhere)</span>
                                            <span className="font-semibold">50x BONUS</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Spins */}
                        {spinHistory.length > 0 && (
                            <Card className="bg-slate-900/80 border-amber-500/20 backdrop-blur-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg text-amber-400">Recent Spins</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {spinHistory.map((spin, i) => (
                                            <div
                                                key={i}
                                                className="bg-slate-800/50 rounded-lg p-2"
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex gap-1">
                                                        {spin.reelPositions?.slice(1, 14).filter((_, idx) => idx % 3 === 0).map((pos, j) => (
                                                            <span key={j} className="text-xs font-bold text-amber-400">
                                                                {SYMBOLS[pos]}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                                                        #{spin.nonce}
                                                    </Badge>
                                                </div>
                                                {spin.winAmount > 0 && (
                                                    <div className="text-xs text-green-400 font-semibold">
                                                        Win: {spin.winAmount}x
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
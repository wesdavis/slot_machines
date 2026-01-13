import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, ShieldCheck, Info, Sparkles } from 'lucide-react';
import SlotMachine from '@/components/slots/SlotMachine';
import VerificationTool from '@/components/slots/VerificationTool';

// Updated to Sopranos Theme
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
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-transparent bg-clip-text mb-2">
                        SOPRANOS SLOTS
                    </h1>
                    <p className="text-slate-400 flex items-center justify-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-green-400" />
                        Provably Fair Business
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-6">
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

                    <div className="space-y-4">
                        <Card className="bg-slate-900/80 border-amber-500/20 backdrop-blur-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg text-amber-400 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5" />
                                    Paytable (5 Lines)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-4 gap-2">
                                    {SYMBOLS.map((symbol, i) => (
                                        <div
                                            key={i}
                                            className="aspect-square bg-slate-800/50 rounded-lg flex items-center justify-center text-[10px] font-bold text-amber-400 border border-slate-700/50"
                                        >
                                            {symbol}
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-3 space-y-2 text-xs">
                                    <div className="flex justify-between text-slate-400">
                                        <span>3 Symbols</span>
                                        <span className="text-green-400">2x Line Bet</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400">
                                        <span>4 Symbols</span>
                                        <span className="text-green-400">10x Line Bet</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400">
                                        <span>5 Symbols</span>
                                        <span className="text-green-400">50x Line Bet</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-700">
                                        <div className="flex justify-between text-purple-400">
                                            <span>6+ 9mm Symbols</span>
                                            <span className="font-bold underline">HOLD & WIN</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
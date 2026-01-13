import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, PlayCircle, Loader2, TrendingUp, Target, Zap } from 'lucide-react';
import { base44 } from "@/api/base44Client";

export default function AdminDashboard() {
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const runSimulation = async () => {
        setIsRunning(true);
        setError(null);
        setResults(null);

        try {
            const response = await base44.functions.invoke('rtpSimulator', {
                spins: 1000000
            });
            setResults(response.data);
        } catch (err) {
            setError(err.message || 'Failed to run simulation');
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text mb-2">
                        Admin Dashboard
                    </h1>
                    <p className="text-slate-400">RTP & Statistical Analysis</p>
                </div>

                {/* Run Simulation Card */}
                <Card className="bg-slate-900/80 border-indigo-500/20 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-indigo-400 flex items-center gap-2">
                            <Zap className="w-5 h-5" />
                            RTP Simulation
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Warning */}
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-amber-400 font-medium text-sm">Processing Time Warning</p>
                                <p className="text-amber-300/80 text-xs mt-1">
                                    This may take up to 10 seconds to compute 1 million spins.
                                </p>
                            </div>
                        </div>

                        {/* Run Button */}
                        <Button
                            onClick={runSimulation}
                            disabled={isRunning}
                            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                        >
                            {isRunning ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Running Simulation...
                                </>
                            ) : (
                                <>
                                    <PlayCircle className="w-5 h-5 mr-2" />
                                    Run RTP Simulation (1M Spins)
                                </>
                            )}
                        </Button>

                        {/* Error Display */}
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-red-400" />
                                <span className="text-red-300 text-sm">{error}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Results Display */}
                {results && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    >
                        {/* Total Payout */}
                        <Card className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-500/30">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-green-400 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    Total Payout
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-green-400">
                                    {results.totalPayout?.toLocaleString() || '0'}
                                </div>
                                <p className="text-xs text-green-300/60 mt-1">coins paid out</p>
                            </CardContent>
                        </Card>

                        {/* RTP Percentage */}
                        <Card className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border-indigo-500/30">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-indigo-400 flex items-center gap-2">
                                    <Target className="w-4 h-4" />
                                    RTP %
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-indigo-400">
                                    {results.rtpPercentage?.toFixed(2) || '0.00'}%
                                </div>
                                <p className="text-xs text-indigo-300/60 mt-1">return to player</p>
                            </CardContent>
                        </Card>

                        {/* Feature Hit Rate */}
                        <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-500/30">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-purple-400 flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    Feature Hit Rate
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-purple-400">
                                    {results.featureHitRate?.toFixed(2) || '0.00'}%
                                </div>
                                <p className="text-xs text-purple-300/60 mt-1">
                                    {results.featureTriggered?.toLocaleString() || '0'} / {results.totalSpins?.toLocaleString() || '0'} spins
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Additional Stats */}
                {results && (
                    <Card className="bg-slate-900/80 border-slate-700/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-slate-300 text-lg">Detailed Statistics</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-slate-800/50 rounded-lg p-3">
                                <span className="text-slate-500">Total Spins</span>
                                <p className="text-2xl font-bold text-slate-200 mt-1">
                                    {results.totalSpins?.toLocaleString() || '0'}
                                </p>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-3">
                                <span className="text-slate-500">Total Wagered</span>
                                <p className="text-2xl font-bold text-slate-200 mt-1">
                                    {results.totalWagered?.toLocaleString() || '0'}
                                </p>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-3">
                                <span className="text-slate-500">Winning Spins</span>
                                <p className="text-2xl font-bold text-slate-200 mt-1">
                                    {results.winningSpins?.toLocaleString() || '0'}
                                </p>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-3">
                                <span className="text-slate-500">Win Rate</span>
                                <p className="text-2xl font-bold text-slate-200 mt-1">
                                    {((results.winningSpins / results.totalSpins) * 100).toFixed(2)}%
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
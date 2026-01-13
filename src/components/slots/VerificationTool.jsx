import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, CheckCircle2, XCircle, Loader2, Copy, Info } from 'lucide-react';
import { base44 } from "@/api/base44Client";

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣', '🔔', '⭐'];

export default function VerificationTool({ lastSpinData }) {
    const [serverSeed, setServerSeed] = useState('');
    const [clientSeed, setClientSeed] = useState('');
    const [nonce, setNonce] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [result, setResult] = useState(null);

    const handleVerify = async () => {
        if (!serverSeed || !clientSeed || !nonce) return;
        
        setVerifying(true);
        setResult(null);

        try {
            const response = await base44.functions.invoke('provablyFairSpin', {
                action: 'verify',
                verifyServerSeed: serverSeed,
                verifyClientSeed: clientSeed,
                verifyNonce: parseInt(nonce)
            });

            setResult(response.data);
        } catch (error) {
            setResult({ error: error.message });
        } finally {
            setVerifying(false);
        }
    };

    const fillFromLastSpin = () => {
        if (lastSpinData) {
            setServerSeed(lastSpinData.serverSeed || '');
            setClientSeed(lastSpinData.clientSeed || '');
            setNonce(lastSpinData.nonce?.toString() || '');
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <Card className="bg-slate-900/80 border-amber-500/20 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-amber-400">
                    <ShieldCheck className="w-5 h-5" />
                    Provably Fair Verification
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Info box */}
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <div className="flex items-start gap-2 text-xs text-slate-400">
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p>
                            Enter the seeds from any spin to verify the result was predetermined. 
                            The hash is generated BEFORE you spin, proving fairness.
                        </p>
                    </div>
                </div>

                {lastSpinData && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fillFromLastSpin}
                        className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    >
                        Fill from Last Spin
                    </Button>
                )}

                <div className="space-y-3">
                    <div>
                        <Label className="text-slate-300 text-sm">Server Seed</Label>
                        <div className="flex gap-2">
                            <Input
                                value={serverSeed}
                                onChange={(e) => setServerSeed(e.target.value)}
                                placeholder="Enter server seed..."
                                className="bg-slate-800 border-slate-700 text-slate-200 font-mono text-xs"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyToClipboard(serverSeed)}
                                className="text-slate-400 hover:text-amber-400"
                            >
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div>
                        <Label className="text-slate-300 text-sm">Client Seed</Label>
                        <Input
                            value={clientSeed}
                            onChange={(e) => setClientSeed(e.target.value)}
                            placeholder="Your seed..."
                            className="bg-slate-800 border-slate-700 text-slate-200 font-mono text-xs"
                        />
                    </div>

                    <div>
                        <Label className="text-slate-300 text-sm">Nonce</Label>
                        <Input
                            type="number"
                            value={nonce}
                            onChange={(e) => setNonce(e.target.value)}
                            placeholder="Spin number..."
                            className="bg-slate-800 border-slate-700 text-slate-200"
                        />
                    </div>
                </div>

                <Button
                    onClick={handleVerify}
                    disabled={verifying || !serverSeed || !clientSeed || !nonce}
                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-semibold"
                >
                    {verifying ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Verifying...
                        </>
                    ) : (
                        <>
                            <ShieldCheck className="w-4 h-4 mr-2" />
                            Verify Result
                        </>
                    )}
                </Button>

                <AnimatePresence>
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-3"
                        >
                            {result.error ? (
                                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                                    <XCircle className="w-5 h-5 text-red-400" />
                                    <span className="text-red-300 text-sm">Error: {result.error}</span>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                        <span className="text-green-300 text-sm">Verification Successful!</span>
                                    </div>

                                    <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                                        <div>
                                            <span className="text-xs text-slate-500">Server Seed Hash:</span>
                                            <p className="text-xs font-mono text-amber-400 break-all">
                                                {result.serverSeedHash}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500">Combined Hash:</span>
                                            <p className="text-xs font-mono text-slate-300 break-all">
                                                {result.combinedHash}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 block mb-1">Resulting Grid:</span>
                                            <div className="grid grid-cols-5 gap-1">
                                                {result.reelPositions?.map((pos, i) => (
                                                    <div
                                                        key={i}
                                                        className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center text-lg"
                                                    >
                                                        {SYMBOLS[pos]}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}
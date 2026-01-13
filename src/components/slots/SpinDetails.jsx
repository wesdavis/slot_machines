import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Hash, Key, RefreshCw, Lock, Copy, Check } from 'lucide-react';

export default function SpinDetails({ spinData, pendingHash, isSpinning }) {
    const [expanded, setExpanded] = useState(false);
    const [copiedField, setCopiedField] = useState(null);

    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const CopyButton = ({ text, field }) => (
        <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-500 hover:text-amber-400"
            onClick={() => copyToClipboard(text, field)}
        >
            {copiedField === field ? (
                <Check className="w-3 h-3 text-green-400" />
            ) : (
                <Copy className="w-3 h-3" />
            )}
        </Button>
    );

    return (
        <Card className="bg-slate-900/80 border-amber-500/20 backdrop-blur-sm">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-400" />
                        Cryptographic Details
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpanded(!expanded)}
                        className="text-slate-400 hover:text-amber-400"
                    >
                        {expanded ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </CardHeader>
            
            <CardContent className="pt-0">
                {/* Always visible: Pending hash before spin */}
                {pendingHash && (
                    <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 rounded-lg p-3 mb-3">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
                                <Hash className="w-3 h-3" />
                                Server Seed Hash (Pre-Spin)
                            </span>
                            <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">
                                {isSpinning ? 'Locked' : 'Revealed After Spin'}
                            </Badge>
                        </div>
                        <div className="flex items-start gap-1">
                            <p className="font-mono text-xs text-slate-300 break-all flex-1">
                                {pendingHash}
                            </p>
                            <CopyButton text={pendingHash} field="pendingHash" />
                        </div>
                    </div>
                )}

                <AnimatePresence>
                    {expanded && spinData && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3"
                        >
                            {/* Server Seed */}
                            <div className="bg-slate-800/50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                        <Key className="w-3 h-3" />
                                        Server Seed
                                    </span>
                                    <CopyButton text={spinData.serverSeed} field="serverSeed" />
                                </div>
                                <p className="font-mono text-xs text-slate-300 break-all">
                                    {spinData.serverSeed}
                                </p>
                            </div>

                            {/* Client Seed */}
                            <div className="bg-slate-800/50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                        <Key className="w-3 h-3" />
                                        Client Seed (Yours)
                                    </span>
                                    <CopyButton text={spinData.clientSeed} field="clientSeed" />
                                </div>
                                <p className="font-mono text-xs text-slate-300 break-all">
                                    {spinData.clientSeed}
                                </p>
                            </div>

                            {/* Nonce */}
                            <div className="bg-slate-800/50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                        <RefreshCw className="w-3 h-3" />
                                        Nonce (Spin #)
                                    </span>
                                    <CopyButton text={spinData.nonce?.toString()} field="nonce" />
                                </div>
                                <p className="font-mono text-xs text-slate-300">
                                    {spinData.nonce}
                                </p>
                            </div>

                            {/* Combined Hash */}
                            <div className="bg-slate-800/50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                        <Hash className="w-3 h-3" />
                                        Combined Hash (Result)
                                    </span>
                                    <CopyButton text={spinData.combinedHash} field="combinedHash" />
                                </div>
                                <p className="font-mono text-xs text-green-400 break-all">
                                    {spinData.combinedHash}
                                </p>
                            </div>

                            {/* Formula explanation */}
                            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3">
                                <p className="text-xs text-indigo-300">
                                    <strong>Formula:</strong> SHA-256(serverSeed + clientSeed + nonce) = combinedHash
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    First 8 chars of hash determine each reel position
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!expanded && spinData && (
                    <p className="text-xs text-slate-500 text-center">
                        Click expand to see all cryptographic details
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
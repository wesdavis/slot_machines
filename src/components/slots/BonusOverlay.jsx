import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, X } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function BonusOverlay({ isTriggered, winDetails, onClose }) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isTriggered) {
            setShow(true);
        }
    }, [isTriggered]);

    const handleClose = () => {
        setShow(false);
        setTimeout(() => onClose?.(), 300);
    };

    const bonusWins = winDetails.filter(d => d.type === 'bonus');
    const totalBonusWin = bonusWins.reduce((sum, d) => sum + d.payout, 0);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ scale: 0.5, rotateY: -180 }}
                        animate={{ scale: 1, rotateY: 0 }}
                        exit={{ scale: 0.5, rotateY: 180 }}
                        transition={{ type: "spring", duration: 0.7 }}
                        className="relative bg-gradient-to-br from-purple-900 via-pink-800 to-purple-900 rounded-3xl p-8 max-w-md w-full mx-4 border-4 border-yellow-400 shadow-[0_0_80px_rgba(234,179,8,0.6)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Sparkle effects */}
                        <div className="absolute inset-0 overflow-hidden rounded-3xl">
                            {[...Array(20)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-2 h-2 bg-yellow-300 rounded-full"
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        top: `${Math.random() * 100}%`,
                                    }}
                                    animate={{
                                        scale: [0, 1, 0],
                                        opacity: [0, 1, 0],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        delay: Math.random() * 2,
                                    }}
                                />
                            ))}
                        </div>

                        {/* Close button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleClose}
                            className="absolute top-4 right-4 text-white hover:bg-white/20"
                        >
                            <X className="w-5 h-5" />
                        </Button>

                        {/* Content */}
                        <div className="relative z-10 text-center space-y-6">
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 10, 0] }}
                                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                            >
                                <Sparkles className="w-20 h-20 mx-auto text-yellow-300" />
                            </motion.div>

                            <div>
                                <h2 className="text-4xl font-black text-yellow-300 mb-2">
                                    HOLD & WIN!
                                </h2>
                                <p className="text-purple-200 text-lg">
                                    Feature Triggered
                                </p>
                            </div>

                            <div className="bg-black/30 rounded-2xl p-6 border-2 border-yellow-400/50">
                                <div className="flex items-center justify-center gap-3 mb-4">
                                    <Trophy className="w-8 h-8 text-yellow-300" />
                                    <div className="text-5xl font-black text-yellow-300">
                                        {totalBonusWin.toFixed(2)}x
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                    {bonusWins.map((win, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="flex justify-between text-purple-200"
                                        >
                                            <span>{win.symbol} Symbol</span>
                                            <span className="text-yellow-300 font-bold">+{win.payout}x</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            <Button
                                onClick={handleClose}
                                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-purple-900 font-bold text-lg py-6 hover:from-yellow-300 hover:to-yellow-500"
                            >
                                COLLECT WINNINGS
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
'use client';

import React, { useState, useEffect } from 'react';

const MESSAGES = [
    "GASが重いのは、仕様です。ごめんね！笑",
    "あなたのスプレッドシートを全力で捲っています...",
    "現在、全面談合算の巨大な密林を探索中...",
    "Nirvanaリンクを精密調整中。誰でも迷わず辿り着けるよう魔法をかけています...",
    "GWS（Google Workspace）だとGASも本気を出すみたい。相棒、最高の舞台を用意してくれ！",
    "GASエンジンの機嫌をとっています...あ、機嫌が良くなったかも！",
    "データの海から、あなただけの一行を釣り上げています...",
    "一括処理中...お茶でも飲んでリラックスしてください！",
    "高速化キャッシュを注入中。次はもっと速くなるはずだぜ、相棒！"
];

interface LoadingNirvanaProps {
    type?: 'form' | 'list';
}

const LoadingNirvana: React.FC<LoadingNirvanaProps> = ({ type = 'form' }) => {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
        }, 800);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-8 animate-pulse p-4">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-slate-200 rounded-full" />
                <div className="h-6 w-32 bg-slate-100 rounded-full" />
            </div>

            {/* Input Skeletons */}
            <div className="space-y-4">
                <div className="h-16 w-full bg-slate-100/80 rounded-2xl border border-slate-50" />
                <div className="h-16 w-full bg-slate-100/60 rounded-2xl border border-slate-50" />
            </div>

            {/* Status Message Section */}
            <div className="py-10 text-center space-y-4">
                <div className="relative inline-block">
                    {/* Ring animation */}
                    <div className="absolute inset-0 animate-ping rounded-full bg-premium-gold/20 scale-150" />
                    <div className="relative h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-lg border border-premium-gold/30">
                        <div className="h-6 w-6 border-4 border-premium-gold border-t-transparent rounded-full animate-spin" />
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-xl font-black text-slate-800 tracking-tighter animate-in fade-in slide-in-from-bottom-2 duration-500 key={messageIndex}">
                        {MESSAGES[messageIndex]}
                    </p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] opacity-60">
                        System is processing via ASF 2.0 Engine
                    </p>
                </div>
            </div>

            {/* Grid Skeletons */}
            <div className="grid grid-cols-2 gap-6">
                <div className="h-20 bg-slate-100/40 rounded-3xl" />
                <div className="h-20 bg-slate-100/40 rounded-3xl" />
            </div>

            {/* Bottom Button Skeleton */}
            <div className="h-16 w-full bg-slate-200/50 rounded-2xl" />
        </div>
    );
};

export default LoadingNirvana;

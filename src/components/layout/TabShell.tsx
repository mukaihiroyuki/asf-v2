'use client';

import React, { useState } from 'react';

type TabType = 'contract' | 'customers' | 'payment' | 'overdue';

interface TabShellProps {
    userName: string;
    onLogout: () => void;
    activeLink?: string | null;
    children: (activeTab: TabType) => React.ReactNode;
}

const TabShell: React.FC<TabShellProps> = ({ userName, onLogout, activeLink, children }) => {
    const [activeTab, setActiveTab] = useState<TabType>('contract');

    const tabs: { id: TabType; label: string; icon: string }[] = [
        { id: 'contract', label: '契約登録', icon: '📝' },
        { id: 'customers', label: '顧客リスト(スプシ)', icon: '👥' },
        { id: 'payment', label: '入金報告', icon: '💰' },
        { id: 'overdue', label: '未入金', icon: '⚠️' },
    ];

    const handleTabClick = (id: TabType) => {
        if (id === 'customers') {
            if (activeLink) {
                window.open(activeLink, '_blank');
                return;
            }
            const sid = localStorage.getItem('asf_spreadsheet_id');
            if (sid) {
                window.open(`https://docs.google.com/spreadsheets/d/${sid}/edit`, '_blank');
            }
            return;
        }
        setActiveTab(id);
    };

    return (
        <div className="min-h-screen max-w-md mx-auto flex flex-col pt-4 sm:pt-6 pb-32">
            {/* Header Panel */}
            <div className="px-4 sm:px-6 mb-8">
                <header className="glass-panel p-6 rounded-3xl flex justify-between items-center animate-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-premium-gold to-orange-200 flex items-center justify-center text-2xl shadow-md border border-white">
                            👤
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest">Logged in as</p>
                            <p className="text-xl font-black premium-gradient-text">{userName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="text-[12px] font-bold text-slate-500 hover:text-rose-500 transition-colors uppercase tracking-tighter"
                    >
                        Logout
                    </button>
                </header>
            </div>

            {/* Content Area */}
            <main className="flex-1 px-4 sm:px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {children(activeTab)}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] z-50">
                <div className="glass-panel p-2 rounded-[2.5rem] flex gap-1 shadow-2xl border border-white/40 ring-1 ring-black/5 animate-in slide-in-from-bottom-12 duration-700 delay-200 backdrop-blur-xl bg-white/70">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={`
                                relative flex-1 py-4 rounded-[2rem] flex flex-col items-center gap-1.5 transition-all duration-500
                                ${activeTab === tab.id
                                    ? 'bg-gradient-to-b from-slate-800 to-slate-900 text-white shadow-lg scale-[1.05]'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50 active:scale-95'}
                            `}
                        >
                            <span className={`text-xl transition-transform duration-500 ${activeTab === tab.id ? 'scale-110 -translate-y-0.5' : ''}`}>
                                {tab.icon}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-tighter text-center leading-none ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>
                                {tab.label.split('').map((char, i) => (
                                    <span key={i} className="block sm:inline">{char}</span>
                                ))}
                            </span>
                        </button>
                    ))}
                </div>
            </nav>

            <footer className="text-center py-6 opacity-30">
                <p className="text-[10px] text-slate-600 font-medium tracking-tighter uppercase">
                    Powered by Addness Sales Engine 2.0 • Premium
                </p>
            </footer>
        </div>
    );
};

export default TabShell;

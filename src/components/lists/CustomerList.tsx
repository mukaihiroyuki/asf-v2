'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { gasApi, Customer } from '@/lib/api/gasClient';

const CustomerList: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetch = async () => {
            const sid = localStorage.getItem('asf_spreadsheet_id');
            if (!sid) return;
            try {
                const list = await gasApi.getCustomerList(sid);
                setCustomers(list);
            } catch (err) {
                console.error('Fetch error:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetch();
    }, []);

    const filtered = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return customers.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.id.toLowerCase().includes(q) ||
            (c.status && c.status.toLowerCase().includes(q))
        );
    }, [customers, searchQuery]);

    if (isLoading) return <div className="py-20 text-center text-slate-500 animate-pulse">読み込み中...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-1">
                    全顧客リスト（マスター同期）
                </p>
                <p className="text-[10px] text-premium-gold font-black bg-premium-gold/5 px-3 py-1 rounded-full border border-premium-gold/10">
                    {customers.length} RECORDS
                </p>
            </div>

            <input
                type="text"
                placeholder="🔍 名前・ID・ステータスで検索..."
                className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-lg font-bold text-slate-800 placeholder:text-slate-400 focus:border-premium-gold outline-none transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {filtered.map((c) => (
                    <div key={c.id} className="glass-panel p-5 rounded-2xl border-slate-100 hover:border-premium-gold/30 transition-all bg-white/80 shadow-sm relative group">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-black text-slate-800 group-hover:text-premium-gold transition-colors">
                                        {c.name}
                                    </span>
                                    <span className="text-[9px] bg-slate-100 py-0.5 px-2 rounded-full text-slate-400 font-bold tracking-tighter">
                                        ID: {c.id}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${c.status?.includes('成約') ? 'bg-emerald-50 text-emerald-600' :
                                        c.status?.includes('面談前') ? 'bg-blue-50 text-blue-600' :
                                            'bg-slate-100 text-slate-500'
                                        }`}>
                                        {c.status || '未定義'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        {c.date || '日付不明'}
                                    </span>
                                </div>
                            </div>
                            {c.link && (
                                <a
                                    href={c.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-sky-500/20 bg-sky-50 text-sky-600 text-[10px] font-black tracking-widest hover:bg-sky-500 hover:text-white transition-all duration-300 shadow-sm"
                                >
                                    🔗 OPEN
                                </a>
                            )}
                        </div>
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div className="py-20 text-center text-slate-400 text-sm font-bold uppercase tracking-widest bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                        該当する顧客は見つからないぜ。
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerList;

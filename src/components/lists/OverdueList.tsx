'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { gasApi } from '@/lib/api/gasClient';
import LoadingNirvana from '../ui/LoadingNirvana';

interface OverdueCustomer {
    id: string;
    customerName: string;
    contractDate: string;
    overdueDays: number;
    unpaidAmount?: number;
}

const OverdueList: React.FC = () => {
    const [overdueCustomers, setOverdueCustomers] = useState<OverdueCustomer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchList = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const sid = localStorage.getItem('asf_spreadsheet_id');
            if (sid) {
                const list = await gasApi.getOverduePaymentList(sid);
                setOverdueCustomers(list);
            }
        } catch (err: any) {
            console.error('Overdue Fetch Failed:', err);
            setError(err.message || '読み込みに失敗したぜ。');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex justify-between items-end px-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    未入金アラート（即時検知）
                </p>
                <div className="text-right flex items-center gap-3">
                    {error && <span className="text-[10px] text-rose-500 font-black animate-pulse">ERROR!</span>}
                    <p className="text-xs text-rose-500 font-black">
                        {overdueCustomers.length} 件のアラート
                    </p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-600 animate-in slide-in-from-top-2">
                    🚨 APIエラー: {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-3">
                {isLoading ? (
                    <LoadingNirvana />
                ) : (
                    <>
                        {overdueCustomers.map((customer) => (
                            <div key={customer.id} className="glass-panel p-5 rounded-2xl border-rose-500/10 hover:border-rose-500/30 transition-all flex justify-between items-center group bg-white/80 shadow-sm relative overflow-hidden">
                                <div className="space-y-1 relative z-10">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-slate-800 group-hover:text-rose-600 transition-colors">
                                            {customer.customerName}
                                        </span>
                                        <span className="text-[10px] bg-slate-100 py-0.5 px-2 rounded-full text-slate-500 font-bold tracking-tighter">
                                            ID: {customer.id}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className="text-[10px] text-slate-500 font-medium tracking-tight">
                                            契約日: {customer.contractDate}
                                        </p>
                                        <p className="text-[10px] text-rose-600 font-black tracking-tight bg-rose-50 px-1.5 rounded">
                                            未入金: ¥{customer.unpaidAmount?.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right relative z-10">
                                    <div className="text-rose-500 font-black text-lg tracking-tighter leading-tight">
                                        {customer.overdueDays} <span className="text-[10px] uppercase">Days</span>
                                    </div>
                                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">
                                        放置期間
                                    </p>
                                </div>
                                <div className="absolute top-0 right-0 h-full w-1 bg-rose-500/20 group-hover:bg-rose-500 transition-all"></div>
                            </div>
                        ))}

                        {overdueCustomers.length === 0 && (
                            <div className="py-20 text-center space-y-3">
                                <div className="text-4xl opacity-30">✨</div>
                                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">
                                    全て完了！素晴らしいぜ。
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            <button
                onClick={fetchList}
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors disabled:opacity-30 border border-slate-200"
            >
                {isLoading ? 'Refreshing...' : 'Refresh List'}
            </button>
        </div>
    );
};

export default OverdueList;

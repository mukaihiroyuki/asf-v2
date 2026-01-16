'use client';

import React, { useState, useEffect } from 'react';
import { gasApi } from '@/lib/api/gasClient';
import LoadingNirvana from '../ui/LoadingNirvana';

interface Customer {
    id: string;
    customerName: string;
    link?: string;
}

interface PaymentFormProps {
    staffName: string;
    spreadsheetId: string;
    onSelectCustomer?: (link: string | null) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ staffName, spreadsheetId, onSelectCustomer }) => {
    const [customerId, setCustomerId] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<string[]>([]);

    useEffect(() => {
        const load = async () => {
            try {
                // バルクローダーで一括取得
                const data = await gasApi.getInitialData(spreadsheetId);
                // getInitialData は通常の customerList を返すが、PaymentForm は
                // getPaymentCustomerList を期待している可能性がある。
                // 暫定的に共通のリストを使用しつつ、問題があれば再調整。
                setCustomers(data.customerList.map((c: any) => ({
                    id: c.id,
                    customerName: c.name,
                    link: c.link
                })));
                setPaymentMethods(data.paymentMethodsH);
            } catch (err) {
                console.error('Payment Load Error:', err);
            } finally {
                setIsFetching(false);
            }
        };
        load();
    }, [spreadsheetId]);

    const handleCopy = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await gasApi.submitPayment(spreadsheetId, {
                customerId,
                paymentDate,
                paymentAmount: Number(amount),
                paymentMethod: method
            });
            alert('入金報告が完了したぜ！');
            setCustomerId('');
            setAmount('');
        } catch (error) {
            alert('入金報告に失敗しました。');
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) return <LoadingNirvana />;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">顧客（面談ID / 名前）</label>
                    {customerId && (
                        <button type="button" onClick={() => handleCopy(customerId)} className="text-[14px] hover:scale-110 active:scale-95 transition-all opacity-40 hover:opacity-100" title="IDをコピー">📋</button>
                    )}
                </div>
                <select
                    className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-xl text-slate-800 focus:border-premium-gold outline-none appearance-none cursor-pointer shadow-sm"
                    value={customerId}
                    onChange={(e) => {
                        const val = e.target.value;
                        setCustomerId(val);
                        if (onSelectCustomer) {
                            const customer = customers.find(c => c.id === val);
                            onSelectCustomer(customer?.link || null);
                        }
                    }}
                    required
                >
                    <option value="">選択してください</option>
                    {customers.map((c, idx) => (
                        <option key={`${c.id}-${idx}`} value={c.id}>{c.customerName} ({c.id})</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">入金日</label>
                    <input
                        type="date"
                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-lg text-slate-800 focus:border-premium-gold outline-none transition-all shadow-sm font-bold"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">入金方法</label>
                    <select
                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-lg text-slate-800 focus:border-premium-gold outline-none appearance-none cursor-pointer shadow-sm font-bold"
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        required
                    >
                        <option value="">選択してください</option>
                        {paymentMethods.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">入金金額（税込）</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">¥</span>
                    <input
                        type="number"
                        placeholder="金額を入力"
                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-2xl font-black text-slate-800 focus:border-premium-gold outline-none transition-all shadow-sm"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full py-5 rounded-2xl font-black text-xl tracking-widest premium-button disabled:opacity-30"
            >
                {isLoading ? 'SENDING...' : 'CONFIRM PAYMENT'}
            </button>
        </form>
    );
};

export default PaymentForm;

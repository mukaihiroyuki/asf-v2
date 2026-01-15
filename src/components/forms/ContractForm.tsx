'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { gasApi } from '@/lib/api/gasClient';

interface Plan {
    id: string;
    name: string;
    priceGeneral: number;
    priceBank: number;
}

interface Customer {
    id: string;
    name: string;
    link?: string;
}

interface ContractFormProps {
    staffName: string;
    spreadsheetId: string;
    onSelectCustomer?: (link: string | null) => void;
}

// 共通コピーバッジコンポーネント
const CopyBadge: React.FC<{ text: string; label?: string }> = ({ text, label = 'COPY' }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            type="button"
            onClick={handleCopy}
            className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black tracking-wider transition-all duration-300
                ${copied
                    ? 'bg-emerald-500 border-emerald-500 text-white scale-105'
                    : 'bg-premium-gold/5 border-premium-gold/20 text-premium-gold hover:bg-premium-gold hover:text-white hover:scale-105 active:scale-95 shadow-sm'}
            `}
        >
            {copied ? '✅ COPIED!' : `📋 ${label}`}
        </button>
    );
};

const ContractForm: React.FC<ContractFormProps> = ({ staffName, spreadsheetId, onSelectCustomer }) => {
    const [interviewId, setInterviewId] = useState('');
    const [contractName, setContractName] = useState('');
    const [onboarding, setOnboarding] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [planId, setPlanId] = useState('');
    const [contractDate, setContractDate] = useState(new Date().toISOString().split('T')[0]);
    const [downPayment, setDownPayment] = useState('0');
    const [notes, setNotes] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showIdRequestModal, setShowIdRequestModal] = useState(false);
    const [modalInflow, setModalInflow] = useState('AI');
    const [modalLineName, setModalLineName] = useState('');
    const [modalDate, setModalDate] = useState(new Date().toISOString().split('T')[0]);
    const [modalTime, setModalTime] = useState('');

    // Data State
    const [plans, setPlans] = useState<Plan[]>([]);
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [p, c, m] = await Promise.all([
                    gasApi.getPlanList(),
                    gasApi.getCustomerList(spreadsheetId),
                    gasApi.getPaymentMethods(spreadsheetId)
                ]);
                setPlans(p);
                setAllCustomers(c);
                setPaymentMethods(m);
            } catch (err: any) {
                console.error('Data Load Error:', err);
                setError(err.message || 'データの取得に失敗したぜ。');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [spreadsheetId]);

    const filteredCustomers = useMemo(() => {
        if (!searchQuery) return allCustomers;
        const q = searchQuery.toLowerCase();
        return allCustomers.filter(c =>
            c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
        );
    }, [allCustomers, searchQuery]);

    const calculatedPrice = useMemo(() => {
        if (!planId || !paymentMethod) return 0;
        const selectedPlan = plans.find(p => p.id === planId);
        if (!selectedPlan) return 0;

        // 【自社分割】頭金が売上になる
        if (paymentMethod.includes('自社分割')) {
            return Number(downPayment);
        }

        // 【銀行振込（一括）】1万円割引
        // ※ 決済方法名に「銀振」または「銀行」が含まれ、かつ「+」が含まれない場合を一括とみなすロジック（旧版準拠）
        const hasBankTransfer = paymentMethod.includes('銀振') || paymentMethod.includes('銀行');
        const isCombined = paymentMethod.includes('+');
        if (hasBankTransfer && !isCombined) {
            return selectedPlan.priceBank;
        }

        return selectedPlan.priceGeneral;
    }, [planId, paymentMethod, downPayment, plans]);

    const handleCopy = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isConfirmed || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await gasApi.submitReport(spreadsheetId, {
                interviewId,
                contractName,
                onboarding,
                paymentMethod,
                planId,
                contractDate,
                salesAmount: calculatedPrice,
                notes
            });
            alert('報告が完了したぜ！');
            setInterviewId('');
            setContractName('');
            setIsConfirmed(false);
        } catch (error) {
            alert('送信に失敗しました。');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-700">
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">LINE名 検索</label>
                    <div className="flex gap-2">
                        {interviewId && allCustomers.find(c => c.id === interviewId)?.link && (
                            <a
                                href={allCustomers.find(c => c.id === interviewId)?.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-sky-500/30 bg-sky-50 text-sky-600 text-[10px] font-black tracking-wider hover:bg-sky-500 hover:text-white transition-all duration-300 shadow-sm"
                            >
                                📊 OPEN ROW
                            </a>
                        )}
                        {interviewId && <CopyBadge text={interviewId} label="面談ID COPY" />}
                    </div>
                </div>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="🔍 LINE名で検索..."
                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-xl font-bold text-slate-800 placeholder:text-slate-400 focus:border-premium-gold outline-none transition-all shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <select
                        className={`w-full bg-white border ${error ? 'border-red-500' : 'border-slate-200'} rounded-2xl px-6 py-4 text-xl font-black text-slate-800 focus:border-premium-gold outline-none appearance-none cursor-pointer shadow-sm`}
                        value={interviewId}
                        onChange={(e) => {
                            const val = e.target.value;
                            setInterviewId(val);
                            setError(null);
                            if (onSelectCustomer) {
                                const customer = allCustomers.find(c => c.id === val);
                                onSelectCustomer(customer?.link || null);
                            }
                        }}
                        required
                    >
                        <option value="">{isLoading ? '読込中...' : '顧客リストから選択'}</option>
                        {filteredCustomers.map((c, idx) => (
                            <option key={`${c.id}-${idx}`} value={c.id}>{c.name} ({c.id})</option>
                        ))}
                        {!isLoading && filteredCustomers.length === 0 && !error && (
                            <option value="" disabled>⚠️ 該当する顧客がいません</option>
                        )}
                        {error && (
                            <option value="" disabled>❌ 読込エラー（再読込してください）</option>
                        )}
                    </select>
                    {error && (
                        <div className="mt-2 p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-600 animate-in slide-in-from-top-2 duration-400">
                            🚨 APIエラー: {error}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowIdRequestModal(true)}
                        className="w-full p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-between group hover:bg-rose-100 transition-all animate-in slide-in-from-top duration-500"
                    >
                        <span className="text-[13px] font-black text-rose-500 uppercase tracking-tight flex items-center gap-2">
                            ⚙️ 面談IDが見当たらない場合はこちら
                        </span>
                        <span className="text-rose-300 group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                </div>
            </div>

            {interviewId && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">LINE名</label>
                        <CopyBadge text={allCustomers.find(c => c.id === interviewId)?.name || ''} label="LINE名 COPY" />
                    </div>
                    <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xl font-bold text-slate-400">
                        {allCustomers.find(c => c.id === interviewId)?.name || '(名前なし)'}
                    </div>
                </div>
            )}

            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">契約者名義</label>
                    {contractName && <CopyBadge text={contractName} label="名義 COPY" />}
                </div>
                <input
                    type="text"
                    placeholder="契約書に記載のお名前"
                    className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-xl font-bold text-slate-800 placeholder:text-slate-400 focus:border-premium-gold outline-none transition-all shadow-sm"
                    value={contractName}
                    onChange={(e) => setContractName(e.target.value)}
                    required
                />
                <p className="text-[12px] text-rose-500 font-bold pl-1 animate-pulse">⚠️ 契約書と同じ名前を入力してください（ダブルチェック必須）</p>
            </div>

            <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">オンボーディング完了</label>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => setOnboarding(true)}
                        className={`flex-1 py-4 rounded-2xl text-lg font-black transition-all ${onboarding ? 'bg-premium-gold text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
                    >
                        ◯ 完了
                    </button>
                    <button
                        type="button"
                        onClick={() => setOnboarding(false)}
                        className={`flex-1 py-4 rounded-2xl text-lg font-black transition-all ${!onboarding ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
                    >
                        未完了
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">決済方法</label>
                    <select
                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-lg font-black text-slate-800 focus:border-premium-gold outline-none appearance-none cursor-pointer shadow-sm"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        required
                    >
                        <option value="">選択...</option>
                        {paymentMethods.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">対象プラン</label>
                    <select
                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-lg font-black text-slate-800 focus:border-premium-gold outline-none appearance-none cursor-pointer shadow-sm"
                        value={planId}
                        onChange={(e) => setPlanId(e.target.value)}
                        required
                    >
                        <option value="">選択...</option>
                        {plans.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {paymentMethod.includes('自社分割') && (
                <div className="space-y-3 animate-in slide-in-from-left duration-500">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">頭金（売上として計上）</label>
                    <select
                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-lg font-black text-slate-800 focus:border-premium-gold outline-none shadow-sm cursor-pointer"
                        value={downPayment}
                        onChange={(e) => setDownPayment(e.target.value)}
                    >
                        {[0, 10000, 30000, 50000, 100000, 150000, 200000, 250000, 300000, 350000, 400000, 450000, 500000].map(val => (
                            <option key={val} value={val}>¥{val.toLocaleString()}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="grid grid-cols-2 gap-6 items-end">
                <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">契約締結日</label>
                    <input
                        type="date"
                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-lg font-bold text-slate-800 focus:border-premium-gold outline-none transition-all shadow-sm"
                        value={contractDate}
                        onChange={(e) => setContractDate(e.target.value)}
                        required
                    />
                </div>
                <div className="glass-panel p-4 rounded-3xl border-premium-gold/30 text-right bg-white shadow-lg relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-premium-gold/5 rounded-full -mr-6 -mt-6" />
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1 relative z-10 leading-tight">発生売上<br />（税込）</p>
                    <p className="text-2xl font-black text-slate-800 tracking-tighter relative z-10">
                        <span className="text-premium-gold mr-0.5 text-lg">¥</span>
                        {calculatedPrice.toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] pl-1">📎 関連リンク・手続き</label>
                <div className="grid grid-cols-1 gap-3">
                    <a href="https://script.google.com/a/macros/team.addness.co.jp/s/AKfycbww4f5lIgshiS-x7nS-EMC67L-52nz-q7m8HfOAAt_iJcQMfPWeXZVl3-525FpptZHE/exec"
                        target="_blank" className="flex items-center justify-between p-5 bg-emerald-50 border border-emerald-100 rounded-2xl hover:bg-emerald-100 transition-all group">
                        <span className="text-base font-bold text-emerald-700">✅ 契約書チェックフォーム</span>
                        <span className="text-emerald-400 group-hover:translate-x-1 transition-transform">→</span>
                    </a>
                    <a href="https://docs.google.com/forms/d/1-nGsZEGAMvCSmCXEieT2exjsbRpRnBj052TzrV0CRKY/viewform?edit_requested=true#responses"
                        target="_blank" className="flex items-center justify-between p-5 bg-rose-50 border border-rose-100 rounded-2xl hover:bg-rose-100 transition-all group animate-pulse">
                        <span className="text-base font-bold text-rose-700">📋 自社分割 手続きフォーム</span>
                        <span className="text-rose-400 group-hover:translate-x-1 transition-transform">→</span>
                    </a>
                    <div className="grid grid-cols-2 gap-3">
                        <a href="https://docs.google.com/forms/d/e/1FAIpQLSc9DHb7GmOUugQyaZJmbZm4rAhKb1w0H2wQ_iVXTPGZqDsD_g/viewform"
                            target="_blank" className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-center text-[13px] font-bold text-blue-700 hover:bg-blue-100 transition-all leading-tight">📧 郵送依頼<br />（個人）</a>
                        <a href="https://docs.google.com/forms/d/e/1FAIpQLSdD7Nhg0cg3JQna_sH7Y5-4pstIrCN442qypRygxgs3CM_gXQ/viewform"
                            target="_blank" className="p-3 bg-purple-50 border border-purple-100 rounded-2xl text-center text-[13px] font-bold text-purple-700 hover:bg-purple-100 transition-all leading-tight">🏢 郵送依頼<br />（法人）</a>
                    </div>
                    {(paymentMethod.includes('銀振') || paymentMethod.includes('銀行')) && (
                        <a href="https://docs.google.com/forms/d/e/1FAIpQLSefvBnWhKXg27qsd2Z8jmtzk47uhUBbNQ668_YVIxbj1Am51Q/viewform"
                            target="_blank" className="p-5 bg-teal-50 border border-teal-100 rounded-2xl text-center text-sm font-bold text-teal-700 hover:bg-teal-100 transition-all">🏦 銀振明細書添付</a>
                    )}
                </div>
            </div>

            <div className={`p-6 rounded-3xl border-2 transition-all duration-700 ${isConfirmed ? 'bg-premium-gold/5 border-premium-gold/50 shadow-md' : 'bg-white border-slate-200'}`}>
                <label className="flex items-center gap-6 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-10 h-10 rounded-lg border-slate-300 bg-white text-premium-gold focus:ring-premium-gold transition-all"
                        checked={isConfirmed}
                        onChange={(e) => setIsConfirmed(e.target.checked)}
                    />
                    <span className={`text-xl font-black tracking-tight ${isConfirmed ? 'text-premium-gold/80' : 'text-slate-400'}`}>
                        全項目に誤りがないことを確認しました
                    </span>
                </label>
            </div>

            <button
                type="submit"
                disabled={!isConfirmed || isSubmitting}
                className="w-full py-5 rounded-2xl font-black text-xl tracking-[0.2em] premium-button disabled:opacity-20 disabled:grayscale disabled:transform-none"
            >
                {isSubmitting ? 'SENDING...' : 'REPORT SEND'}
            </button>

            {/* 面談ID追加依頼モーダル */}
            {showIdRequestModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[90vh]">
                        <div className="bg-slate-500 p-6 text-white relative shrink-0">
                            <button
                                onClick={() => setShowIdRequestModal(false)}
                                className="absolute top-5 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-all font-bold text-white z-20"
                            >✕</button>
                            <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                                📝 <span className="drop-shadow-sm">面談ID追加依頼</span>
                            </h3>
                            <p className="text-slate-100 text-[10px] font-bold opacity-90 mt-1">LINEグループへの投稿文面を作成します</p>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                            <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl">
                                <p className="text-[10px] font-black text-amber-600/70 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    📊 投稿先: <span className="text-amber-700">【営業部】再面談&担当変更依頼グル</span>
                                </p>
                            </div>

                            <div className="bg-blue-50/50 border border-blue-100/50 p-4 rounded-2xl space-y-2">
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">👇 この形式でLINEに投稿されます</p>
                                <div className="text-[11px] leading-relaxed font-bold text-blue-700 bg-white/60 p-3 rounded-xl border border-blue-50">
                                    【面談シート追加】<br />
                                    @阿部雅 さん<br />
                                    @小松晃也 さん<br />
                                    下記、お願いいたします！<br /><br />
                                    LINE名：{modalLineName || '◯◯◯'}<br />
                                    流入　：{modalInflow}<br />
                                    面談日：{modalDate ? `${parseInt(modalDate.split('-')[1])}/${parseInt(modalDate.split('-')[2])}` : '◯/◯'}<br />
                                    時間　：{modalTime || '◯◯:◯◯〜'}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">LINE名 *</label>
                                    <input
                                        type="text"
                                        placeholder="例: koji"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-slate-300 transition-all"
                                        value={modalLineName}
                                        onChange={(e) => setModalLineName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">流入コース *</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-slate-300 transition-all appearance-none cursor-pointer"
                                        value={modalInflow}
                                        onChange={(e) => setModalInflow(e.target.value)}
                                    >
                                        <option value="AI">AI</option>
                                        <option value="SNS">SNS</option>
                                        <option value="紹介">紹介</option>
                                        <option value="その他">その他</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">面談日 *</label>
                                        <input
                                            type="date"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[11px] font-bold outline-none focus:border-slate-300 transition-all"
                                            value={modalDate}
                                            onChange={(e) => setModalDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">時間 *</label>
                                        <input
                                            type="text"
                                            placeholder="例: 17:00~"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-slate-300 transition-all"
                                            value={modalTime}
                                            onChange={(e) => setModalTime(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    if (!modalLineName || !modalDate || !modalTime) return alert('必須項目に入力してくれ！');
                                    const dateParts = modalDate.split('-');
                                    const fDate = parseInt(dateParts[1]) + '/' + parseInt(dateParts[2]);
                                    const text = `【面談シート追加】\n@阿部雅 さん\n@小松晃也 さん\n下記、お願いいたします！\n\nLINE名：${modalLineName}\n流入　：${modalInflow}\n面談日：${fDate}\n時間　：${modalTime}`;
                                    navigator.clipboard.writeText(text);
                                    alert('コピーしたぜ！LINEに貼り付けてくれ！');
                                    setShowIdRequestModal(false);
                                }}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-lg active:scale-95 shrink-0"
                            >
                                📋 テキストを生成（コピーして閉じる）
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
};

export default ContractForm;

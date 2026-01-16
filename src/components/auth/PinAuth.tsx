'use client';

import React, { useState, useRef, useEffect } from 'react';
import { gasApi } from '@/lib/api/gasClient';

interface PinAuthProps {
  onSuccess: (staffName: string, spreadsheetId: string) => void;
}

const PinAuth: React.FC<PinAuthProps> = ({ onSuccess }) => {
  const [pin, setPin] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newPin.every((digit) => digit !== '') && index === 3) {
      handleLogin(newPin.join(''));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleLogin = async (completePin: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await gasApi.authenticateByPIN(completePin);
      if (result.success) {
        onSuccess(result.staffName, result.spreadsheetId);
      } else {
        setError(result.message || 'PINコードが違います。');
        setPin(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setError(err.message || 'サーバーと通信できませんでした。デプロイ設定を確認してくれ！');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-panel w-full max-w-md p-10 rounded-[2.5rem] text-center space-y-10 animate-in fade-in zoom-in duration-700">
        <div className="space-y-3">
          <div className="text-6xl mb-6 filter drop-shadow-lg">🔐</div>
          <h1 className="text-4xl font-black tracking-tighter premium-gradient-text uppercase">
            Addness Sales Form
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em] opacity-80">
            Premium Edition v2.0
          </p>
        </div>

        <div className="flex justify-center gap-4">
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="w-16 h-20 text-center text-4xl font-black bg-white border border-slate-200 rounded-2xl focus:border-premium-gold focus:ring-4 focus:ring-premium-gold/10 outline-none transition-all duration-300 text-slate-800"
              disabled={isLoading}
            />
          ))}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 animate-bounce">
            <p className="text-rose-400 text-xs font-black uppercase tracking-widest">
              {error}
            </p>
          </div>
        )}

        <div className="pt-6">
          <button
            onClick={() => handleLogin(pin.join(''))}
            disabled={isLoading || pin.some(d => d === '')}
            className="w-full py-5 rounded-2xl font-black text-xl premium-button disabled:opacity-20 disabled:grayscale disabled:transform-none"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                CONNECTING...
              </span>
            ) : 'ACCESS START'}
          </button>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-slate-600 font-black uppercase tracking-tighter">
            Addness Sales Form v2.0 • Phase 2 Hero
          </p>
          <p className="text-[9px] text-slate-700 font-bold italic tracking-tight">
            Protected by Addness Security Protocol
          </p>
        </div>
      </div>
    </div>
  );
};

export default PinAuth;

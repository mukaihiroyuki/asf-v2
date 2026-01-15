import { NextResponse } from 'next/server';

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwSlxiqkUSSElraQ-nVXRWsWMwVhkXcpphkN7OkgVqBia9xgIvid0OI3UcZS9SC8u2t/exec';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log('--- Proxying Request to GAS ---');
        console.log('Action:', body.action);

        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(body),
            redirect: 'follow', // 重要：GASはリダイレクトを多用するぜ
        });

        const contentType = response.headers.get('content-type');
        const text = await response.text();

        if (!response.ok) {
            console.error('GAS Server Error Response:', text);
            throw new Error(`GAS Error ${response.status}: ${text.slice(0, 100)}`);
        }

        // JSON かどうか確認
        if (contentType && contentType.includes('application/json')) {
            return NextResponse.json(JSON.parse(text));
        } else {
            // HTML が返ってきた場合（権限エラーやログイン画面）
            console.error('--- GAS returned HTML instead of JSON ---');
            console.error('Preview:', text.slice(0, 500));

            if (text.includes('google-login') || text.includes('Sign in')) {
                return NextResponse.json({
                    success: false,
                    message: 'Googleへのログインが必要です。GASのデプロイ設定を「全員（Anyone）」にしてくれ！'
                }, { status: 403 });
            }

            return NextResponse.json({
                success: false,
                message: 'GASから不正な形式で応答がありました。デプロイ設定かURLを確認してくれ！'
            }, { status: 502 });
        }

    } catch (error: any) {
        console.error('GAS Proxy Critical Error:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

import { NextResponse } from 'next/server';

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxvn-XMTpvORv9vw4gLcpbOMVqnbIVYClkJPOPwcwa12Z4w7TsSmmtYFirmpmEqSZ_O/exec';
// 最新デプロイID (Debug v503 Fix): AKfycbxvn-XMTpvORv9vw4gLcpbOMVqnbIVYClkJPOPwcwa12Z4w7TsSmmtYFirmpmEqSZ_O

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
            try {
                return NextResponse.json(JSON.parse(text));
            } catch (e) {
                console.error('JSON Parse Error. Data:', text.slice(0, 500));
                return NextResponse.json({
                    success: false,
                    message: `GASから不正なJSONが返されました。構文エラーの可能性があります。 (Preview: ${text.slice(0, 100)})`
                }, { status: 502 });
            }
        } else {
            // HTML が返ってきた場合（権限エラーやログイン画面）
            console.error('--- GAS returned HTML instead of JSON ---');
            console.error('Status:', response.status);
            console.error('Preview:', text.slice(0, 500));

            if (text.includes('google-login') || text.includes('Sign in') || response.status === 401) {
                return NextResponse.json({
                    success: false,
                    message: `【致命的】Google認証エラーが発生したぜ。GASのデプロイ設定を「全員（Anyone）」に更新し、アクセス可能か確認してくれ！ (Status: ${response.status})`
                }, { status: 403 });
            }

            return NextResponse.json({
                success: false,
                message: `GASからHTMLが返されました。デプロイが無効か、URLが間違っている可能性があるぜ！ (Status: ${response.status}, Preview: ${text.slice(0, 50)})`
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

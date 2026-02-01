import { NextResponse } from 'next/server';

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbywQWQSo1b2Hjnq27zba1tmVn3N5ZQAi8r_Uq39uBnBz0l3Fr_Z01c2NxamLRDwX-bM/exec';
// 最新デプロイID (v139 @157): AKfycbywQWQSo1b2...

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log('--- Proxying Request to GAS ---');
        console.log('Action:', body.action);

        const payload = JSON.stringify(body);

        // GASは302リダイレクトを返す。redirect:'follow'だとPOST→GETに変換される環境がある。
        // 手動でリダイレクトを追跡し、POSTメソッドとボディを維持する。
        let response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: payload,
            redirect: 'manual',
        });

        // 302/307 リダイレクトを手動で追跡（最大5回）
        let redirectCount = 0;
        while ((response.status === 302 || response.status === 307) && redirectCount < 5) {
            const redirectUrl = response.headers.get('location');
            if (!redirectUrl) break;
            console.log(`Redirect ${redirectCount + 1} -> ${redirectUrl.slice(0, 80)}`);
            response = await fetch(redirectUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: payload,
                redirect: 'manual',
            });
            redirectCount++;
        }

        // 最終リダイレクト先がGETを期待している場合（GASの最終応答）
        if ((response.status === 302 || response.status === 307) && redirectCount >= 5) {
            throw new Error('Too many redirects from GAS');
        }

        const contentType = response.headers.get('content-type');
        const text = await response.text();

        console.log('GAS Response Status:', response.status, 'ContentType:', contentType?.slice(0, 50));

        if (!response.ok) {
            console.error('GAS Server Error Response:', text.slice(0, 500));
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
                message: `GASからHTMLが返されました。デプロイが無効か、URLが間違っている可能性があるぜ！ (Status: ${response.status}, Preview: ${text.slice(0, 80)})`
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

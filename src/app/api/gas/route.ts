import { NextResponse } from 'next/server';

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw9QfWOtUfvmZzVl2FOobqoUlAv8KFr36AAhTEFCXNqa49mKG3fzmEfkFGQG4PT67zC/exec';
// デプロイ @155 (OAuth認可済み)

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log('--- Proxying Request to GAS ---');
        console.log('Action:', body.action);

        const payload = JSON.stringify(body);

        // GASのフロー:
        //   POST → script.google.com → 302 → リダイレクト先URLにレスポンスが埋め込まれる
        //   リダイレクト先に GET → JSON応答
        //
        // Vercelのfetch(redirect:'follow')では302時にPOST→GETの変換やボディ消失で
        // HTML応答になるケースがあるため、手動で302を処理する。

        // Step 1: POSTを送信、リダイレクトは追跡しない
        const postResponse = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: payload,
            redirect: 'manual',
        });

        let response: Response;

        if (postResponse.status === 302 || postResponse.status === 307) {
            // Step 2: リダイレクト先にGETでアクセス（GASの正規フロー）
            const redirectUrl = postResponse.headers.get('location');
            if (!redirectUrl) {
                throw new Error('GAS returned redirect without Location header');
            }
            console.log('GAS Redirect ->', redirectUrl.slice(0, 80));
            response = await fetch(redirectUrl, {
                method: 'GET',
                redirect: 'follow',
            });
        } else {
            // リダイレクトなしで直接レスポンスが返った場合
            response = postResponse;
        }

        const contentType = response.headers.get('content-type');
        const text = await response.text();

        console.log('GAS Response Status:', response.status, 'ContentType:', contentType?.slice(0, 50), 'BodyLen:', text.length);

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
                    message: `GASから不正なJSONが返されました。(Preview: ${text.slice(0, 100)})`
                }, { status: 502 });
            }
        } else {
            console.error('--- GAS returned non-JSON ---');
            console.error('Status:', response.status, 'URL:', response.url);
            console.error('Preview:', text.slice(0, 500));

            return NextResponse.json({
                success: false,
                message: `GASからHTMLが返されました。(Status: ${response.status}, Preview: ${text.slice(0, 80)})`
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

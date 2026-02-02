import { NextResponse } from 'next/server';

// Node.jsランタイムを明示（Edge Runtimeのfetchはリダイレクト処理が異なる）
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Vercel Pro: GASの書き込み処理に最大30秒許容

const GAS_WEB_APP_URL = process.env.GAS_WEB_APP_URL;

export async function POST(request: Request) {
    let action = 'unknown';
    try {
        if (!GAS_WEB_APP_URL) {
            console.error('[GAS Proxy] GAS_WEB_APP_URL is not set');
            return NextResponse.json(
                { success: false, message: '環境変数 GAS_WEB_APP_URL が設定されていません' },
                { status: 500 }
            );
        }

        const body = await request.json();
        action = body.action;
        console.log(`[GAS Proxy] → action=${action}`);

        const payload = JSON.stringify(body);

        // Step 1: POST → GAS (リダイレクト自動追跡しない)
        const postRes = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: payload,
            redirect: 'manual',
        });

        console.log('[GAS Proxy] POST Status:', postRes.status, 'Location:', postRes.headers.get('location')?.slice(0, 80));

        let finalRes: Response;

        if (postRes.status >= 300 && postRes.status < 400) {
            // 302/307: リダイレクト先にGETでアクセス
            const location = postRes.headers.get('location');
            if (!location) {
                throw new Error(`Redirect ${postRes.status} but no Location header`);
            }
            finalRes = await fetch(location, { method: 'GET', redirect: 'follow' });
        } else if (postRes.status === 200) {
            // redirect:'manual'でも200が返る場合がある（Vercel環境依存）
            // HTMLの場合はリダイレクトURLをHTMLから抽出して再試行
            const ct = postRes.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
                finalRes = postRes;
            } else {
                const html = await postRes.text();
                const match = html.match(/HREF="([^"]+)"/);
                if (match) {
                    const redirectUrl = match[1].replace(/&amp;/g, '&');
                    console.log('[GAS Proxy] Extracted redirect from HTML:', redirectUrl.slice(0, 80));
                    finalRes = await fetch(redirectUrl, { method: 'GET', redirect: 'follow' });
                } else {
                    // HTML応答だがリダイレクトURLも見つからない
                    return NextResponse.json({
                        success: false,
                        message: `GAS応答エラー (Status: ${postRes.status}, Preview: ${html.slice(0, 100)})`
                    }, { status: 502 });
                }
            }
        } else {
            finalRes = postRes;
        }

        const contentType = finalRes.headers.get('content-type') || '';
        const text = await finalRes.text();
        console.log(`[GAS Proxy] ← action=${action} status=${finalRes.status} ct=${contentType.slice(0, 40)} len=${text.length}`);

        if (!finalRes.ok) {
            throw new Error(`GAS Error ${finalRes.status}: ${text.slice(0, 100)}`);
        }

        if (contentType.includes('application/json')) {
            try {
                return NextResponse.json(JSON.parse(text));
            } catch {
                return NextResponse.json({
                    success: false,
                    message: `JSON解析エラー (Preview: ${text.slice(0, 100)})`
                }, { status: 502 });
            }
        }

        return NextResponse.json({
            success: false,
            message: `GASからHTMLが返されました。(Status: ${finalRes.status}, Preview: ${text.slice(0, 100)})`
        }, { status: 502 });

    } catch (error: any) {
        console.error(`[GAS Proxy] ERROR action=${action}`, error.message || error);
        return NextResponse.json(
            { success: false, message: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

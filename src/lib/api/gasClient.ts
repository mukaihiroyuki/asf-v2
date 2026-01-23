/**
 * ASF 2.0 GAS API Client (Next.js Proxy Version)
 * ブラウザのCORS制限を回避するため、自作の /api/gas を経由させるぜ！
 */

const LOCAL_API_URL = '/api/gas';

export async function callGasApi(action: string, params: any = {}) {
    try {
        const response = await fetch(LOCAL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, params }),
        });

        if (!response.ok) {
            // API Proxy自体がエラーを返した場合
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `API Proxy Error: ${response.statusText}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'APIの実行に失敗しました。');
        }

        return result.data;
    } catch (error) {
        console.error('GAS API Call Failed:', error);
        throw error;
    }
}

/**
 * 具体的なAPIメソッド群
 */
export interface Customer {
    id: string;
    name: string;
    link?: string;
    status?: string;
    date?: string;
}
export const gasApi = {
    // 認証
    authenticateByPIN: (pin: string) =>
        callGasApi('authenticateByPIN', { pin }),

    // 顧客・データ取得
    getCustomerList: (spreadsheetId: string) =>
        callGasApi('getCustomerList', { spreadsheetId }),

    getPaymentCustomerList: (spreadsheetId: string) =>
        callGasApi('getPaymentCustomerList', { spreadsheetId }),

    getOverduePaymentList: (spreadsheetId: string) =>
        callGasApi('getOverduePaymentList', { spreadsheetId }),

    // マスタ取得
    getPlanList: () =>
        callGasApi('getPlanList'),

    getInitialData: (spreadsheetId: string, staffName?: string) =>
        callGasApi('getInitialData', { spreadsheetId, staffName }),

    getPaymentMethods: (spreadsheetId: string) =>
        callGasApi('getPaymentMethods', { spreadsheetId }),

    getPaymentMethodsH: (spreadsheetId: string) =>
        callGasApi('getPaymentMethodsH', { spreadsheetId }),

    // 送信
    submitReport: (spreadsheetId: string, formData: any) =>
        callGasApi('submitReport', { formData: { ...formData, spreadsheetId } }),

    submitPayment: (spreadsheetId: string, formData: any) =>
        callGasApi('submitPayment', { formData: { ...formData, spreadsheetId } }),
};

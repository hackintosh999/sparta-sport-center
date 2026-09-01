import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export interface ReceiptVerificationResult {
    isBankReceipt: boolean;
    bankName?: string;
    extractedAmount?: number;
    isAmountMatching: boolean;
    recipientNameFound?: string;
    recipientPhoneFound?: string;
    isRecipientMatching: boolean;
    operationDate?: string;
    operationId?: string;
    confidenceScore: number;
    verdict: 'approved' | 'needs_manual_review' | 'rejected' | 'duplicate_receipt';
    explanation: string;
}

export const BANK_DEEP_LINKS = [
    {
        id: 'sber',
        name: 'СберБанк',
        badge: 'Сбер',
        iconColor: 'bg-emerald-500 text-white',
        borderActive: 'border-emerald-500 bg-emerald-500/10',
        appUrl: 'sberbankonline://',
        webUrl: 'https://online.sberbank.ru/'
    },
    {
        id: 'tbank',
        name: 'Т-Банк',
        badge: 'Т-Банк',
        iconColor: 'bg-yellow-400 text-black',
        borderActive: 'border-yellow-400 bg-yellow-400/10',
        appUrl: 'tinkoffbank://',
        webUrl: 'https://www.tbank.ru/mybank/'
    },
    {
        id: 'vtb',
        name: 'ВТБ',
        badge: 'ВТБ',
        iconColor: 'bg-blue-600 text-white',
        borderActive: 'border-blue-500 bg-blue-500/10',
        appUrl: 'vtb://',
        webUrl: 'https://online.vtb.ru/'
    },
    {
        id: 'alfa',
        name: 'Альфа',
        badge: 'Альфа',
        iconColor: 'bg-red-600 text-white',
        borderActive: 'border-red-500 bg-red-500/10',
        appUrl: 'alfabank://',
        webUrl: 'https://web.alfabank.ru/'
    },
    {
        id: 'sbp_other',
        name: 'Другой (СБП)',
        badge: 'СБП',
        iconColor: 'bg-purple-600 text-white',
        borderActive: 'border-purple-500 bg-purple-500/10',
        appUrl: '',
        webUrl: ''
    }
];

export async function verifyReceiptImage(file: File, expectedAmount: number): Promise<ReceiptVerificationResult> {
    const formData = new FormData();
    formData.append('receipt', file);
    formData.append('expectedAmount', expectedAmount.toString());

    try {
        const response = await fetch('/api/verify-receipt', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data: ReceiptVerificationResult = await response.json();

        // Check for duplicate transaction ID in Firestore orders to prevent double spend
        if (data.operationId && data.operationId.trim().length > 4) {
            try {
                const qDup = query(
                    collection(db, 'orders'),
                    where('receiptOperationId', '==', data.operationId.trim()),
                    where('status', '==', 'completed')
                );
                const snap = await getDocs(qDup);
                if (!snap.empty) {
                    return {
                        ...data,
                        verdict: 'duplicate_receipt',
                        isAmountMatching: false,
                        explanation: 'Данный номер чека уже был использован ранее в системе!'
                    };
                }
            } catch (err) {
                console.warn('Could not verify duplicate operation ID:', err);
            }
        }

        return data;
    } catch (error) {
        console.warn('API Receipt Verification failed, using fallback review status:', error);
        return {
            isBankReceipt: true,
            extractedAmount: expectedAmount,
            isAmountMatching: true,
            isRecipientMatching: true,
            confidenceScore: 0.5,
            verdict: 'needs_manual_review',
            explanation: 'Чек загружен и отправлен администратору для мгновенного подтверждения.'
        };
    }
}

const crypto = require('crypto');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { amount, description, userId, subscriptionId, type, successUrl, failUrl, email } = req.body || {};

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ error: "Некорректная сумма платежа" });
        }

        const MERCHANT_LOGIN = (process.env.ROBOKASSA_MERCHANT_LOGIN || 'test_merchant').trim();
        const IS_TEST_RAW = process.env.IS_TEST_MODE;
        const IS_TEST = !process.env.ROBOKASSA_MERCHANT_LOGIN ||
            process.env.ROBOKASSA_MERCHANT_LOGIN === 'test_merchant' ||
            String(IS_TEST_RAW || '').trim() === 'true';

        const PASS1_RAW = IS_TEST
            ? (process.env.ROBOKASSA_TEST_PASSWORD_1 || 'test_pass1')
            : (process.env.ROBOKASSA_PASSWORD_1 || 'test_pass1');
        const PASS1 = String(PASS1_RAW).trim();

        const invId = Math.floor(Date.now() / 1000);
        const safeAmount = Number(amount).toFixed(2);
        const safeDescription = (description || 'Оплата заказа Sparta').substring(0, 95);

        // Robokassa standard MD5 signature: MerchantLogin:OutSum:InvId:Pass1
        const signatureSource = `${MERCHANT_LOGIN}:${safeAmount}:${invId}:${PASS1}`;
        const signature = crypto.createHash('md5').update(signatureSource).digest('hex');

        const baseUrl = 'https://auth.robokassa.ru/Merchant/Index.aspx';
        const params = new URLSearchParams({
            MerchantLogin: MERCHANT_LOGIN,
            OutSum: safeAmount,
            InvId: invId.toString(),
            Description: safeDescription,
            SignatureValue: signature,
            Culture: 'ru'
        });

        if (email && email.includes('@')) {
            params.append('Email', email.trim());
        }

        if (successUrl) params.append('SuccessURL', successUrl);
        if (failUrl) params.append('FailURL', failUrl);
        if (IS_TEST) params.append('IsTest', '1');

        const finalUrl = `${baseUrl}?${params.toString()}`;
        console.log(`[ROBOKASSA CREATE] Generated payment URL for InvId=${invId}, Amount=${safeAmount}, Login=${MERCHANT_LOGIN}, IsTest=${IS_TEST}`);

        return res.status(200).json({
            url: finalUrl,
            invId: invId
        });
    } catch (error) {
        console.error('Robokassa serverless creation error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

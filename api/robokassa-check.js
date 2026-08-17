const crypto = require('crypto');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const invId = req.query.invId || req.params?.invId;

    if (!invId) {
        return res.status(400).json({ error: 'Missing Invoice ID' });
    }

    try {
        const MERCHANT_LOGIN = (process.env.ROBOKASSA_MERCHANT_LOGIN || 'test_merchant').trim();
        const IS_TEST = !process.env.ROBOKASSA_MERCHANT_LOGIN || process.env.ROBOKASSA_MERCHANT_LOGIN === 'test_merchant' || String(process.env.IS_TEST_MODE || '').trim() === 'true';
        const PASS2 = IS_TEST ? (process.env.ROBOKASSA_TEST_PASSWORD_2 || 'test_pass2').trim() : (process.env.ROBOKASSA_PASSWORD_2 || 'test_pass2').trim();

        const sigSourceSHA = `${MERCHANT_LOGIN}:${invId}:${PASS2}`;
        const sigSHA = crypto.createHash('sha256').update(sigSourceSHA).digest('hex');
        const sigMD5 = crypto.createHash('md5').update(sigSourceSHA).digest('hex');

        const url = `https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpState?MerchantLogin=${MERCHANT_LOGIN}&InvId=${invId}&Signature=${sigSHA}`;

        const response = await fetch(url);
        const xmlText = await response.text();

        let targetXml = xmlText;
        if (xmlText.includes("Runtime Error") || xmlText.includes("ошибка")) {
            const urlMD5 = `https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpState?MerchantLogin=${MERCHANT_LOGIN}&InvId=${invId}&Signature=${sigMD5}`;
            const resMD5 = await fetch(urlMD5);
            targetXml = await resMD5.text();
        }

        const stateCodeMatch = targetXml.match(/<State><Code>(\d+)<\/Code><\/State>/);
        const stateCode = stateCodeMatch ? stateCodeMatch[1] : 'unknown';

        const resultCodeMatch = targetXml.match(/<Result><Code>(\d+)<\/Code><\/Result>/);
        const resultCode = resultCodeMatch ? resultCodeMatch[1] : '1';

        let status = 'pending';
        if (stateCode === '100') {
            status = 'succeeded';
        } else if (stateCode === '50' || stateCode === '80') {
            status = 'pending';
        } else if (stateCode === '10' || stateCode === '60') {
            status = 'canceled';
        }

        return res.status(200).json({
            status,
            stateCode,
            resultCode
        });

    } catch (error) {
        console.error('Robokassa check serverless error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

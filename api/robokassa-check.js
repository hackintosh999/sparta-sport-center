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
    const urlOutSum = req.query.OutSum || req.query.outSum;
    const urlSignature = req.query.SignatureValue || req.query.signatureValue;

    if (!invId) {
        return res.status(400).json({ error: 'Missing Invoice ID' });
    }

    try {
        const MERCHANT_LOGIN = (process.env.ROBOKASSA_MERCHANT_LOGIN || 'test_merchant').trim();
        const IS_TEST = !process.env.ROBOKASSA_MERCHANT_LOGIN ||
            process.env.ROBOKASSA_MERCHANT_LOGIN === 'test_merchant' ||
            String(process.env.IS_TEST_MODE || '').trim() === 'true';

        const PASS1_RAW = IS_TEST
            ? (process.env.ROBOKASSA_TEST_PASSWORD_1 || 'test_pass1')
            : (process.env.ROBOKASSA_PASSWORD_1 || 'test_pass1');
        const PASS1 = String(PASS1_RAW).trim();

        const PASS2_RAW = IS_TEST
            ? (process.env.ROBOKASSA_TEST_PASSWORD_2 || 'test_pass2')
            : (process.env.ROBOKASSA_PASSWORD_2 || 'test_pass2');
        const PASS2 = String(PASS2_RAW).trim();

        // 1. If SuccessURL signature parameters are provided, verify with Password #1
        if (urlOutSum && urlSignature) {
            const expectedSig1MD5 = crypto.createHash('md5').update(`${urlOutSum}:${invId}:${PASS1}`).digest('hex');
            const expectedSig1SHA = crypto.createHash('sha256').update(`${urlOutSum}:${invId}:${PASS1}`).digest('hex');
            const expectedSig2MD5 = crypto.createHash('md5').update(`${urlOutSum}:${invId}:${PASS2}`).digest('hex');

            const sigUpper = String(urlSignature).toUpperCase();
            if (
                sigUpper === expectedSig1MD5.toUpperCase() ||
                sigUpper === expectedSig1SHA.toUpperCase() ||
                sigUpper === expectedSig2MD5.toUpperCase()
            ) {
                console.log(`[ROBOKASSA CHECK] Verified via return URL signature for InvId=${invId}`);
                return res.status(200).json({
                    status: 'succeeded',
                    verifiedVia: 'signature',
                    invId
                });
            }
        }

        // 2. Query Robokassa OpState WebService
        const sigSourceSHA = `${MERCHANT_LOGIN}:${invId}:${PASS2}`;
        const sigSHA = crypto.createHash('sha256').update(sigSourceSHA).digest('hex');
        const sigMD5 = crypto.createHash('md5').update(sigSourceSHA).digest('hex');

        let targetXml = '';
        try {
            const urlSHA = `https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpState?MerchantLogin=${MERCHANT_LOGIN}&InvId=${invId}&Signature=${sigSHA}`;
            const resSHA = await fetch(urlSHA);
            targetXml = await resSHA.text();

            if (targetXml.includes("Runtime Error") || targetXml.includes("ошибка") || targetXml.includes("<Result><Code>1</Code>")) {
                const urlMD5 = `https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpState?MerchantLogin=${MERCHANT_LOGIN}&InvId=${invId}&Signature=${sigMD5}`;
                const resMD5 = await fetch(urlMD5);
                targetXml = await resMD5.text();
            }
        } catch (fetchErr) {
            console.warn('[ROBOKASSA CHECK] OpState fetch failed:', fetchErr);
        }

        const stateCodeMatch = targetXml ? targetXml.match(/<State><Code>(\d+)<\/Code><\/State>/) : null;
        const stateCode = stateCodeMatch ? stateCodeMatch[1] : 'unknown';

        const resultCodeMatch = targetXml ? targetXml.match(/<Result><Code>(\d+)<\/Code><\/Result>/) : null;
        const resultCode = resultCodeMatch ? resultCodeMatch[1] : '1';

        let status = 'pending';
        if (stateCode === '100') {
            status = 'succeeded';
        } else if (stateCode === '50' || stateCode === '80') {
            status = 'pending';
        } else if (stateCode === '10' || stateCode === '60') {
            status = 'canceled';
        }

        console.log(`[ROBOKASSA CHECK] InvId=${invId}, StateCode=${stateCode}, Status=${status}`);

        return res.status(200).json({
            status,
            stateCode,
            resultCode,
            invId
        });

    } catch (error) {
        console.error('Robokassa check serverless error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

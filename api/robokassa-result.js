const crypto = require('crypto');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const params = req.method === 'POST' ? (req.body || {}) : (req.query || {});
        const OutSum = params.OutSum || params.outSum || params.out_summ;
        const InvId = params.InvId || params.invId || params.inv_id;
        const SignatureValue = params.SignatureValue || params.signatureValue || params.crc;

        console.log(`[ROBOKASSA RESULT] Received webhook for InvId=${InvId}, OutSum=${OutSum}`);

        if (!OutSum || !InvId || !SignatureValue) {
            console.error('[ROBOKASSA RESULT] Missing required parameters:', params);
            return res.status(400).send('Missing required parameters');
        }

        const MERCHANT_LOGIN = (process.env.ROBOKASSA_MERCHANT_LOGIN || 'test_merchant').trim();
        const IS_TEST = !process.env.ROBOKASSA_MERCHANT_LOGIN ||
            process.env.ROBOKASSA_MERCHANT_LOGIN === 'test_merchant' ||
            String(process.env.IS_TEST_MODE || '').trim() === 'true';

        const PASS2_RAW = IS_TEST
            ? (process.env.ROBOKASSA_TEST_PASSWORD_2 || 'test_pass2')
            : (process.env.ROBOKASSA_PASSWORD_2 || 'test_pass2');
        const PASS2 = String(PASS2_RAW).trim();

        // Standard Robokassa ResultURL signature: OutSum:InvId:Password2
        const signatureSource = `${OutSum}:${InvId}:${PASS2}`;
        const mySignatureMD5 = crypto.createHash('md5').update(signatureSource).digest('hex');
        const mySignatureSHA = crypto.createHash('sha256').update(signatureSource).digest('hex');

        const isMatchMD5 = mySignatureMD5.toUpperCase() === String(SignatureValue).toUpperCase();
        const isMatchSHA = mySignatureSHA.toUpperCase() === String(SignatureValue).toUpperCase();

        if (!isMatchMD5 && !isMatchSHA) {
            console.error('[ROBOKASSA RESULT] Bad signature:', {
                received: SignatureValue,
                expectedMD5: mySignatureMD5,
                expectedSHA: mySignatureSHA,
                source: signatureSource
            });
            return res.status(400).send('bad signature');
        }

        console.log(`[ROBOKASSA RESULT] Payment successfully verified for InvId: ${InvId}`);
        // Robokassa expects plain text: "OK{InvId}"
        return res.status(200).send(`OK${InvId}`);
    } catch (error) {
        console.error('[ROBOKASSA RESULT] Handler error:', error);
        return res.status(500).send('error');
    }
};

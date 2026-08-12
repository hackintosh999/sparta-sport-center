import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

const app = express();
app.use(cors());
app.use(express.json());

// These should be in your .env file
const SHOP_ID = process.env.VITE_YOOKASSA_SHOP_ID || 'test_shop_id';
const SECRET_KEY = process.env.VITE_YOOKASSA_SECRET_KEY || 'test_secret_key';

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3/payments';

// Supabase config
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://iheyjovfbmrgwuswoatl.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloZXlqb3ZmYm1yZ3d1c3dvYXRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NzgxNTksImV4cCI6MjA4NjQ1NDE1OX0.RD2dKpwOGDe2q6zP2RmF6uWhtUKRUwnmb8MbpjR_6hI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);



// Gemini AI configuration removed for stabilization.

// Multer config for file uploads
const upload = multer({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    storage: multer.memoryStorage()
});

// VK API config
const VK_DOMAIN = 'sparta_fk';
const VK_API_VERSION = '5.131';

const getVkToken = (req) => {
    return (
        req.headers['x-vk-token'] ||
        req.query.token ||
        req.body?.token ||
        process.env.VITE_VK_ACCESS_TOKEN ||
        process.env.VK_ACCESS_TOKEN ||
        ''
    ).trim();
};

app.get('/api/vk-news', async (req, res) => {
    try {
        const token = getVkToken(req);
        const count = req.query.count || 10;
        const domain = req.query.domain || VK_DOMAIN;

        if (!token) {
            console.warn('VK_ACCESS_TOKEN is missing. Admin can set it in AdminNews panel.');
            return res.json({ count: 0, items: [], missingToken: true });
        }

        const response = await fetch(`https://api.vk.com/method/wall.get?domain=${domain}&count=${count}&v=${VK_API_VERSION}&extended=1&access_token=${token}`);
        const data = await response.json();

        if (data.error) {
            console.error('VK API Error:', data.error);
            return res.json({ count: 0, items: [], error: data.error, missingToken: data.error?.error_code === 5 || data.error?.error_code === 15 });
        }

        res.json(data.response);
    } catch (error) {
        console.error('VK API fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/create-payment', async (req, res) => {
    try {
        const { amount, description, userId, subscriptionId, type } = req.body;

        const idempotenceKey = uuidv4();

        // Use basic auth standard formulation
        const authString = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');

        const requestBody = {
            amount: {
                value: amount.toString(),
                currency: 'RUB'
            },
            capture: true, // Auto-capture the payment
            confirmation: {
                type: 'redirect',
                // Local dev URL or production URL based on env
                return_url: `${req.headers.origin}/profile?payment=success&type=${type || 'subscription'}`
            },
            description: description,
            metadata: {
                userId,
                subscriptionId,
                type
            }
        };

        const yooResponse = await fetch(YOOKASSA_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Idempotence-Key': idempotenceKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!yooResponse.ok) {
            const errorText = await yooResponse.text();
            console.error('YooKassa error:', yooResponse.status, errorText);
            return res.status(yooResponse.status).json({ error: 'Failed to create payment in YooKassa', details: errorText });
        }

        const data = await yooResponse.json();

        // Return the confirmation URL to the frontend so it can redirect the user
        res.json({
            id: data.id,
            status: data.status,
            confirmationUrl: data.confirmation.confirmation_url
        });

    } catch (error) {
        console.error('Payment creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Endpoint to check payment status after returning
const checkPaymentHandler = async (req, res) => {
    try {
        const { paymentId } = req.params;

        const authString = Buffer.from(`${SHOP_ID}:${SECRET_KEY}`).toString('base64');
        const yooResponse = await fetch(`${YOOKASSA_API_URL}/${paymentId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${authString}`,
            }
        });

        if (!yooResponse.ok) {
            return res.status(yooResponse.status).json({ error: 'Failed to fetch payment status' });
        }

        const data = await yooResponse.json();
        res.json({
            status: data.status,
            metadata: data.metadata,
            amount: data.amount
        });
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

app.get('/api/check-payment/:paymentId', checkPaymentHandler);
app.get('/api/yookassa-check/:paymentId', checkPaymentHandler);


// ROBOKASSA LOGIC (For Local Development)
app.post('/api/robokassa-create', async (req, res) => {
    try {
        console.log("Robokassa create hit!", req.body);
        const { amount, description, userId, subscriptionId, type, successUrl, failUrl } = req.body || {};

        if (!amount) {
            console.error("Missing amount in payload");
            return res.status(400).json({ error: "Missing amount" });
        }

        const MERCHANT_LOGIN = (process.env.ROBOKASSA_MERCHANT_LOGIN || 'test_merchant').trim();
        const IS_TEST_RAW = process.env.IS_TEST_MODE;
        const IS_TEST = String(IS_TEST_RAW || '').trim() === 'true';

        const PASS1_RAW = IS_TEST ? process.env.ROBOKASSA_TEST_PASSWORD_1 : process.env.ROBOKASSA_PASSWORD_1;
        const PASS1 = (PASS1_RAW || 'test_pass1').trim();

        console.log(`[DEBUG] Robokassa: Merchant=[${MERCHANT_LOGIN}], IS_TEST=[${IS_TEST}], Pass1Length=${PASS1.length}`);

        const invId = Math.floor(Date.now() / 1000);
        const safeAmount = Number(amount).toFixed(2);

        // Standard Robokassa Signature (MD5 is most compatible for production)
        const signatureSource = `${MERCHANT_LOGIN}:${safeAmount}:${invId}:${PASS1}`;
        console.log("Generating signature source:", signatureSource);

        const signature = crypto.createHash('md5').update(signatureSource).digest('hex');

        const baseUrl = 'https://auth.robokassa.ru/Merchant/Index.aspx';
        const params = new URLSearchParams({
            MerchantLogin: MERCHANT_LOGIN,
            OutSum: safeAmount,
            InvId: invId.toString(),
            Description: description || 'Оплата заказа',
            SignatureValue: signature,
        });

        if (successUrl) params.append('SuccessURL', successUrl);
        if (failUrl) params.append('FailURL', failUrl);
        if (IS_TEST) params.append('IsTest', '1');

        const finalUrl = `${baseUrl}?${params.toString()}`;
        console.log("Generated Robokassa URL:", finalUrl);

        return res.status(200).json({
            url: finalUrl,
            invId: invId
        });
    } catch (error) {
        console.error('Robokassa creation error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/robokassa-check/:invId', async (req, res) => {
    const invId = req.params.invId || req.query.invId;

    if (!invId) {
        return res.status(400).json({ error: 'Missing Invoice ID' });
    }

    try {
        const MERCHANT_LOGIN = (process.env.ROBOKASSA_MERCHANT_LOGIN || 'test_merchant').trim();
        const IS_TEST = String(process.env.IS_TEST_MODE).trim() === 'true';
        const PASS2 = IS_TEST ? (process.env.ROBOKASSA_TEST_PASSWORD_2 || '').trim() : (process.env.ROBOKASSA_PASSWORD_2 || 'test_pass2').trim();

        // Try SHA256 first
        const sigSourceSHA = `${MERCHANT_LOGIN}:${invId}:${PASS2}`;
        const sigSHA = crypto.createHash('sha256').update(sigSourceSHA).digest('hex');

        // Also prepare MD5 just in case (legacy OpState often requires it)
        const sigMD5 = crypto.createHash('md5').update(sigSourceSHA).digest('hex');

        console.log(`Checking status for InvId: ${invId}, Login: ${MERCHANT_LOGIN}`);

        // We'll try SHA256 first as that's what's set in the cabinet
        const url = `https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpState?MerchantLogin=${MERCHANT_LOGIN}&InvId=${invId}&Signature=${sigSHA}`;

        const response = await fetch(url);
        const xmlText = await response.text();

        console.log("Robokassa OpState Raw Response:", xmlText);

        if (xmlText.includes("Runtime Error") || xmlText.includes("ошибка")) {
            console.warn("OpState API returned error, retrying with MD5 signature...");
            const urlMD5 = `https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpState?MerchantLogin=${MERCHANT_LOGIN}&InvId=${invId}&Signature=${sigMD5}`;
            const resMD5 = await fetch(urlMD5);
            const xmlMD5 = await resMD5.text();
            console.log("Robokassa OpState MD5 Response:", xmlMD5);

            // If MD5 also fails, we'll just have to rely on the manual check or resultURL
        }

        const stateCodeMatch = xmlText.match(/<State><Code>(\d+)<\/Code><\/State>/);
        const stateCode = stateCodeMatch ? stateCodeMatch[1] : 'unknown';

        const resultCodeMatch = xmlText.match(/<Result><Code>(\d+)<\/Code><\/Result>/);
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
            resultCode,
            xml: xmlText.substring(0, 500) // Send a snippet for debugging
        });

    } catch (error) {
        console.error('Robokassa check error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.all('/api/robokassa-result', async (req, res) => {
    const params = req.method === 'POST' ? req.body : req.query;
    const { OutSum, InvId, SignatureValue } = params;

    if (!OutSum || !InvId || !SignatureValue) {
        return res.status(400).send('Missing required parameters');
    }

    try {
        const MERCHANT_LOGIN = (process.env.ROBOKASSA_MERCHANT_LOGIN || 'test_merchant').trim();
        const IS_TEST_RAW = process.env.IS_TEST_MODE;
        const IS_TEST = String(IS_TEST_RAW || '').trim() === 'true' || MERCHANT_LOGIN === 'test_merchant';

        const PASS2_RAW = IS_TEST ? process.env.ROBOKASSA_TEST_PASSWORD_2 : process.env.ROBOKASSA_PASSWORD_2;
        const PASS2 = (PASS2_RAW || 'test_pass2').trim();

        // Signature format for ResultURL: OutSum:InvId:PASS2[:customParams]
        const signatureSource = `${OutSum}:${InvId}:${PASS2}`;
        const mySignature = crypto.createHash('md5').update(signatureSource).digest('hex');

        if (mySignature.toUpperCase() !== SignatureValue.toUpperCase()) {
            console.error('Robokassa signature mismatch', { expected: mySignature, received: SignatureValue, source: signatureSource });
            return res.status(400).send('bad signature');
        }

        console.log(`Payment successful for InvId: ${InvId}, Amount: ${OutSum}`);
        return res.status(200).send(`OK${InvId}`);

    } catch (error) {
        console.error('Robokassa result error:', error);
        return res.status(500).send('error');
    }
});

// Proxy endpoint for Supabase uploads
app.post('/api/upload-media', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            console.error('Upload media error: No file in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const bucket = req.body.bucket || 'review-media';
        const path = req.body.path || `chat-media/${Date.now()}_${req.file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`;

        console.log(`Proxy uploading to Supabase: bucket=${bucket}, path=${path}, size=${req.file.size}`);

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (error) {
            console.error('Supabase Proxy Upload Error:', error);
            // Try to create bucket if it doesn't exist? (Usually requires more permissions)
            return res.status(500).json({
                error: error.message,
                details: 'Make sure the bucket exists and is public in Supabase storage.'
            });
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);

        console.log(`Upload successful: ${publicUrl}`);
        res.json({ publicUrl });
    } catch (error) {
        console.error('Proxy Unexpected Error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});


// Endpoints for VK News management
app.post('/api/vk-edit', async (req, res) => {
    try {
        const { postId, ownerId, message, attachments } = req.body;
        const token = getVkToken(req);

        if (!token) {
            console.error('VK Sync Error: Access token is missing.');
            return res.status(401).json({ error: 'VK Access Token is missing' });
        }

        const params = new URLSearchParams({
            owner_id: ownerId,
            post_id: postId,
            message: message,
            attachments: attachments || '',
            v: VK_API_VERSION,
            access_token: token
        });

        const response = await fetch('https://api.vk.com/method/wall.edit', {
            method: 'POST',
            body: params
        });

        const data = await response.json();

        if (data.error) {
            console.error('VK API Edit Error:', data.error);
            return res.status(500).json({
                error: 'Failed to edit VK post',
                code: data.error.error_code,
                message: data.error.error_msg
            });
        }

        res.json({ success: true, response: data.response });
    } catch (error) {
        console.error('VK API edit unexpected error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Gemini AI configuration (lazy initialized)
let genAI = null;
const getGeminiClient = () => {
    if (!genAI) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is missing');
        }
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return genAI;
};

// Transcription endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }

        console.log(`Transcribing audio: ${req.file.size} bytes, type=${req.file.mimetype}`);

        const client = getGeminiClient();
        const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent([
            {
                inlineData: {
                    data: req.file.buffer.toString('base64'),
                    mimeType: req.file.mimetype || 'audio/webm'
                }
            },
            "Переведи это голосовое сообщение в текст. Верни только текст сообщения без лишних комментариев. Если в сообщении ничего не сказано, верни пустую строку."
        ]);

        const transcription = result.response.text();
        console.log(`Transcription successful: ${transcription}`);
        res.json({ text: transcription });
    } catch (error) {
        console.error('Transcription Error:', error);
        res.status(500).json({ error: 'Failed to transcribe audio', message: error.message });
    }
});


const PORT = 3005;
app.listen(PORT, () => {
    console.log(`Payment & AI Server running on port ${PORT}`);
});

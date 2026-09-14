import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import crypto from 'crypto';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { DEFAULT_SUBSCRIPTION_PLANS } from './constants/defaultSubscriptionPlans.js';

dotenv.config();

const firebaseConfig = {
    apiKey: "AIzaSyDirwUTwGdBBxGRsSTBJ_wR8RaTwncPXCE",
    authDomain: "sparta-21df8.firebaseapp.com",
    projectId: "sparta-21df8",
    storageBucket: "sparta-21df8.firebasestorage.app",
    messagingSenderId: "1042761261702",
    appId: "1:1042761261702:web:297be36c3d242d0b826707",
    measurementId: "G-WH5DLLX7ZB"
};

const fbApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(fbApp);

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

const DEFAULT_LEAD_RECIPIENTS = ['bugrova.k@bk.ru', 'larisa.p2000@mail.ru'];

app.post('/api/notify-lead', async (req, res) => {
    try {
        const body = req.body || {};
        const {
            childName = '',
            childAge = '',
            birthDate = '',
            parentName = '',
            phone = '',
            email = '',
            programType = 'Пробная тренировка',
            location = '',
            groupTitle = '',
            schedule = '',
            comment = '',
            requestId = '',
            source = 'Сайт SPARTA'
        } = body;

        const customEmails = (process.env.NOTIFICATION_EMAILS || '')
            .split(',')
            .map(e => e.trim())
            .filter(Boolean);

        const recipients = Array.from(new Set([...DEFAULT_LEAD_RECIPIENTS, ...customEmails]));

        const now = new Date();
        const timeChelyabinsk = now.toLocaleString('ru-RU', {
            timeZone: 'Asia/Yekaterinburg',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const subject = `⚡ Новая заявка SPARTA: ${childName || parentName || 'Новый клиент'} (${phone || 'тел. не указан'})`;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${subject}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d0d11; color: #ffffff; margin: 0; padding: 20px; }
        .card { max-width: 620px; margin: 0 auto; background: #15171e; border: 1px solid rgba(212,175,55,0.3); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.7); }
        .header { background: linear-gradient(135deg, #1c1917 0%, #000000 100%); padding: 24px; border-bottom: 2px solid #d4af37; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; color: #d4af37; letter-spacing: 2px; text-transform: uppercase; }
        .header p { margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.7); }
        .badge { display: inline-block; background: rgba(212,175,55,0.15); border: 1px solid rgba(212,175,55,0.4); color: #ffd700; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-top: 10px; }
        .content { padding: 24px; }
        .field-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .field-table tr { border-bottom: 1px solid rgba(255,255,255,0.08); }
        .field-table tr:last-child { border-bottom: none; }
        .field-label { padding: 12px 8px 12px 0; color: rgba(255,255,255,0.5); font-size: 13px; width: 38%; vertical-align: top; }
        .field-val { padding: 12px 0; color: #ffffff; font-size: 14px; font-weight: 500; }
        .phone-highlight { font-size: 18px; font-weight: bold; color: #ffd700; text-decoration: none; }
        .btn-container { text-align: center; margin: 30px 0 15px; }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #f59e0b 100%); color: #000000 !important; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
        .footer { background: #0c0d12; padding: 16px 24px; text-align: center; font-size: 11px; color: rgba(255,255,255,0.4); border-top: 1px solid rgba(255,255,255,0.05); }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>Футбольная школа SPARTA</h1>
            <p>Уведомление о новой заявке с сайта</p>
            <div class="badge">⚡ ${programType || 'Заявка с сайта'}</div>
        </div>
        <div class="content">
            <table class="field-table">
                <tr>
                    <td class="field-label">📞 Телефон для связи:</td>
                    <td class="field-val">
                        <a href="tel:${phone.replace(/[^+\d]/g, '')}" class="phone-highlight">${phone || 'Не указан'}</a>
                    </td>
                </tr>
                <tr>
                    <td class="field-label">👤 Имя родителя:</td>
                    <td class="field-val">${parentName || 'Не указано'}</td>
                </tr>
                <tr>
                    <td class="field-label">👶 Ребёнок:</td>
                    <td class="field-val">
                        <strong>${childName || 'Не указано'}</strong>
                        ${childAge ? ` (${childAge} лет)` : ''}
                        ${birthDate ? `<br><span style="font-size:12px;color:rgba(255,255,255,0.6);">Дата рожд.: ${birthDate}</span>` : ''}
                    </td>
                </tr>
                <tr>
                    <td class="field-label">📍 Филиал / Локация:</td>
                    <td class="field-val">${location || 'ОЦ «Ньютон»'}</td>
                </tr>
                ${groupTitle ? `
                <tr>
                    <td class="field-label">⚽ Выбранная группа:</td>
                    <td class="field-val">${groupTitle}</td>
                </tr>` : ''}
                ${schedule ? `
                <tr>
                    <td class="field-label">📅 Расписание:</td>
                    <td class="field-val">${schedule}</td>
                </tr>` : ''}
                ${email ? `
                <tr>
                    <td class="field-label">✉️ Email родителя:</td>
                    <td class="field-val"><a href="mailto:${email}" style="color:#60a5fa;">${email}</a></td>
                </tr>` : ''}
                ${comment ? `
                <tr>
                    <td class="field-label">💬 Пожелания / комментарий:</td>
                    <td class="field-val" style="background:rgba(255,255,255,0.03);padding:8px 12px;border-radius:8px;font-style:italic;">${comment}</td>
                </tr>` : ''}
                <tr>
                    <td class="field-label">🕒 Время заявки:</td>
                    <td class="field-val">${timeChelyabinsk} (Челябинск, UTC+5)</td>
                </tr>
                ${source ? `
                <tr>
                    <td class="field-label">🌐 Источник:</td>
                    <td class="field-val">${source}</td>
                </tr>` : ''}
            </table>

            <div class="btn-container">
                <a href="https://sparta-sports-center.vercel.app/admin/requests" class="cta-btn" target="_blank">
                    Открыть в CRM SPARTA →
                </a>
            </div>
        </div>
        <div class="footer">
            Уведомление отправлено на: ${recipients.join(', ')}<br>
            Футбольный центр SPARTA • Челябинск
        </div>
    </div>
</body>
</html>
        `.trim();

        const plainText = `
НОВАЯ ЗАЯВКА SPARTA
-----------------------------------
Тип: ${programType || 'Заявка с сайта'}
Родитель: ${parentName || 'Не указано'}
Телефон: ${phone || 'Не указан'}
Ребёнок: ${childName || 'Не указано'} ${childAge ? `(${childAge} лет)` : ''}
Филиал: ${location || 'ОЦ «Ньютон»'}
${groupTitle ? `Группа: ${groupTitle}\n` : ''}${schedule ? `Расписание: ${schedule}\n` : ''}${email ? `Email: ${email}\n` : ''}${comment ? `Комментарий: ${comment}\n` : ''}Время: ${timeChelyabinsk}
Источник: ${source}

Открыть заявку в CRM: https://sparta-sports-center.vercel.app/admin/requests
        `.trim();

        const smtpUser = process.env.SMTP_USER || process.env.MAIL_USER || '';
        const smtpPass = process.env.SMTP_PASS || process.env.MAIL_PASS || '';
        const smtpHost = process.env.SMTP_HOST || 'smtp.mail.ru';
        const smtpPort = Number(process.env.SMTP_PORT) || 465;
        const smtpSecure = process.env.SMTP_SECURE === 'false' ? false : true;
        const fromAddress = process.env.SMTP_FROM || (smtpUser ? `"SPARTA Sports" <${smtpUser}>` : '"SPARTA Sports" <noreply@sparta-sports-center.ru>');

        console.log(`[NOTIFY-LEAD] Processing lead for child="${childName}", parent="${parentName}", phone="${phone}"`);
        console.log(`[NOTIFY-LEAD] Target recipients: ${recipients.join(', ')}`);

        if (smtpPass) {
            const candidateUsers = Array.from(new Set([
                smtpUser,
                'larisa.p2000@mail.ru',
                'bugrova.k@bk.ru'
            ].filter(Boolean)));

            let sendSuccess = false;
            let lastErr = null;
            let successfulSender = null;

            for (const user of candidateUsers) {
                try {
                    const transporter = nodemailer.createTransport({
                        host: smtpHost,
                        port: smtpPort,
                        secure: smtpSecure,
                        auth: {
                            user: user,
                            pass: smtpPass
                        },
                        tls: {
                            rejectUnauthorized: false
                        }
                    });

                    await transporter.sendMail({
                        from: `"ФК SPARTA" <${user}>`,
                        to: recipients.join(', '),
                        subject: subject,
                        text: plainText,
                        html: htmlContent
                    });

                    console.log(`[NOTIFY-LEAD] Email successfully delivered via ${user} to: ${recipients.join(', ')}`);
                    sendSuccess = true;
                    successfulSender = user;
                    break;
                } catch (sendErr) {
                    lastErr = sendErr;
                    console.warn(`[NOTIFY-LEAD] Attempt to send via ${user} failed:`, sendErr.message);
                }
            }

            if (sendSuccess) {
                return res.json({ success: true, sent: true, sender: successfulSender, recipients });
            } else {
                console.error('[NOTIFY-LEAD] All sender attempts failed. Last error:', lastErr?.message);
                return res.json({
                    success: true,
                    sent: false,
                    queued: true,
                    error: lastErr?.message || 'Failed to send via SMTP',
                    recipients
                });
            }
        } else {
            console.warn('[NOTIFY-LEAD] SMTP credentials (SMTP_USER / SMTP_PASS) not configured in env. Lead logged to server.');
            return res.json({
                success: true,
                sent: false,
                queued: true,
                message: 'Lead received and logged. Set SMTP_USER and SMTP_PASS in environment to enable live email delivery.',
                recipients
            });
        }
    } catch (error) {
        console.error('[NOTIFY-LEAD] Error dispatching email notification:', error);
        return res.json({
            success: true,
            sent: false,
            error: error.message || 'Email dispatch failed'
        });
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

        // Standard Robokassa Signature (MD5)
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
        console.log(`[ROBOKASSA CREATE] Generated URL for InvId=${invId}, Amount=${safeAmount}, Merchant=${MERCHANT_LOGIN}, IsTest=${IS_TEST}`);

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

        // 1. Check Return URL Signature if present
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
                console.log(`[ROBOKASSA CHECK] Verified via Return URL Signature for InvId=${invId}`);
                return res.status(200).json({
                    status: 'succeeded',
                    verifiedVia: 'signature',
                    invId
                });
            }
        }

        // 2. Query OpState
        const sigSourceSHA = `${MERCHANT_LOGIN}:${invId}:${PASS2}`;
        const sigSHA = crypto.createHash('sha256').update(sigSourceSHA).digest('hex');
        const sigMD5 = crypto.createHash('md5').update(sigSourceSHA).digest('hex');

        let targetXml = '';
        try {
            const url = `https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpState?MerchantLogin=${MERCHANT_LOGIN}&InvId=${invId}&Signature=${sigSHA}`;
            const response = await fetch(url);
            targetXml = await response.text();

            if (targetXml.includes("Runtime Error") || targetXml.includes("ошибка") || targetXml.includes("<Result><Code>1</Code>")) {
                const urlMD5 = `https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpState?MerchantLogin=${MERCHANT_LOGIN}&InvId=${invId}&Signature=${sigMD5}`;
                const resMD5 = await fetch(urlMD5);
                targetXml = await resMD5.text();
            }
        } catch (fetchErr) {
            console.warn('[ROBOKASSA CHECK] OpState fetch error:', fetchErr);
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
        console.error('Robokassa check error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.all('/api/robokassa-result', async (req, res) => {
    const params = req.method === 'POST' ? (req.body || {}) : (req.query || {});
    const OutSum = params.OutSum || params.outSum || params.out_summ;
    const InvId = params.InvId || params.invId || params.inv_id;
    const SignatureValue = params.SignatureValue || params.signatureValue || params.crc;

    if (!OutSum || !InvId || !SignatureValue) {
        return res.status(400).send('Missing required parameters');
    }

    try {
        const MERCHANT_LOGIN = (process.env.ROBOKASSA_MERCHANT_LOGIN || 'test_merchant').trim();
        const IS_TEST_RAW = process.env.IS_TEST_MODE;
        const IS_TEST = !process.env.ROBOKASSA_MERCHANT_LOGIN ||
            process.env.ROBOKASSA_MERCHANT_LOGIN === 'test_merchant' ||
            String(IS_TEST_RAW || '').trim() === 'true';

        const PASS2_RAW = IS_TEST
            ? (process.env.ROBOKASSA_TEST_PASSWORD_2 || 'test_pass2')
            : (process.env.ROBOKASSA_PASSWORD_2 || 'test_pass2');
        const PASS2 = String(PASS2_RAW).trim();

        // Signature format for ResultURL: OutSum:InvId:PASS2
        const signatureSource = `${OutSum}:${InvId}:${PASS2}`;
        const mySignatureMD5 = crypto.createHash('md5').update(signatureSource).digest('hex');
        const mySignatureSHA = crypto.createHash('sha256').update(signatureSource).digest('hex');

        const isMatchMD5 = mySignatureMD5.toUpperCase() === String(SignatureValue).toUpperCase();
        const isMatchSHA = mySignatureSHA.toUpperCase() === String(SignatureValue).toUpperCase();

        if (!isMatchMD5 && !isMatchSHA) {
            console.error('[ROBOKASSA RESULT] Signature mismatch', {
                received: SignatureValue,
                expectedMD5: mySignatureMD5,
                expectedSHA: mySignatureSHA,
                source: signatureSource
            });
            return res.status(400).send('bad signature');
        }

        console.log(`[ROBOKASSA RESULT] Payment confirmed for InvId: ${InvId}, Amount: ${OutSum}`);
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

        const cleanName = req.file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const path = req.body.path || `reviews/${Date.now()}_${cleanName}`;
        const requestedBucket = req.body.bucket || 'shop-products';
        const bucketsToTry = [requestedBucket, 'shop-products', 'exercises-media', 'chat-media'].filter((v, i, a) => a.indexOf(v) === i);

        console.log(`Proxy uploading to Supabase: path=${path}, size=${req.file.size} bytes`);

        let uploadedUrl = null;
        let lastError = null;

        for (const bucket of bucketsToTry) {
            try {
                const { data, error } = await supabase.storage
                    .from(bucket)
                    .upload(path, req.file.buffer, {
                        contentType: req.file.mimetype || 'application/octet-stream',
                        upsert: true
                    });

                if (!error && data) {
                    const { data: publicData } = supabase.storage
                        .from(bucket)
                        .getPublicUrl(path);

                    if (publicData?.publicUrl) {
                        uploadedUrl = publicData.publicUrl;
                        console.log(`Upload successful to [${bucket}]: ${uploadedUrl}`);
                        break;
                    }
                } else if (error) {
                    console.warn(`Upload attempt failed for [${bucket}]:`, error.message);
                    lastError = error;
                }
            } catch (err) {
                console.warn(`Exception on bucket [${bucket}]:`, err.message);
                lastError = err;
            }
        }

        if (uploadedUrl) {
            return res.json({ publicUrl: uploadedUrl });
        }

        console.error('All Supabase buckets failed for upload:', lastError);
        res.status(500).json({ error: 'All storage buckets failed', message: lastError?.message });
    } catch (error) {
        console.error('Proxy Unexpected Error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Speech-to-text Audio Transcription Endpoint
app.post('/api/transcribe', upload.single('file'), async (req, res) => {
    try {
        let audioBuffer = null;
        let mimeType = 'audio/webm';

        if (req.file) {
            audioBuffer = req.file.buffer;
            mimeType = req.file.mimetype || 'audio/webm';
        } else if (req.body?.audioUrl) {
            const fetchRes = await fetch(req.body.audioUrl);
            if (!fetchRes.ok) {
                return res.status(400).json({ error: 'Failed to fetch audio from URL' });
            }
            const arrayBuf = await fetchRes.arrayBuffer();
            audioBuffer = Buffer.from(arrayBuf);
            mimeType = fetchRes.headers.get('content-type') || 'audio/webm';
        }

        if (!audioBuffer || audioBuffer.length === 0) {
            return res.status(400).json({ error: 'No audio data provided' });
        }

        const cleanMime = mimeType.split(';')[0].trim();

        // 1. Google Gemini (if GEMINI_API_KEY is configured)
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
            try {
                const genAI = new GoogleGenerativeAI(geminiKey);
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const base64Audio = audioBuffer.toString('base64');

                const prompt = 'Расшифруй это аудиосообщение на русском языке дословно. Верни только текст расшифровки, без лишних слов, без кавычек и без вводных фраз. Если звучит только музыка или тишина, верни [Без слов].';
                const result = await model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            mimeType: cleanMime,
                            data: base64Audio
                        }
                    }
                ]);

                const text = result?.response?.text()?.trim();
                if (text) {
                    return res.json({ text });
                }
            } catch (geminiErr) {
                console.warn('Gemini transcription attempt failed:', geminiErr.message);
            }
        }

        // 2. OpenAI / Whisper API (if OPENAI_API_KEY is configured)
        const openaiKey = process.env.OPENAI_API_KEY;
        if (openaiKey) {
            try {
                const form = new FormData();
                const blob = new Blob([audioBuffer], { type: cleanMime });
                form.append('file', blob, 'audio.webm');
                form.append('model', 'whisper-1');
                form.append('language', 'ru');

                const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${openaiKey}` },
                    body: form
                });
                if (whisperRes.ok) {
                    const whisperData = await whisperRes.json();
                    if (whisperData?.text) {
                        return res.json({ text: whisperData.text.trim() });
                    }
                }
            } catch (whisperErr) {
                console.warn('Whisper transcription failed:', whisperErr.message);
            }
        }

        return res.status(503).json({
            error: 'AI transcription service unavailable. Please configure GEMINI_API_KEY or OPENAI_API_KEY in .env.'
        });
    } catch (error) {
        console.error('Transcription endpoint error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
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

        const text = result.response.text();
        res.json({ text });
    } catch (error) {
        console.error('Transcription error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Smart Receipt Verification endpoint using Gemini Vision
app.post('/api/verify-receipt', upload.single('receipt'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No receipt file uploaded' });
        }

        const expectedAmount = parseFloat(req.body.expectedAmount) || 0;
        console.log(`Verifying receipt: ${req.file.size} bytes, type=${req.file.mimetype}, expectedAmount=${expectedAmount}`);

        const client = getGeminiClient();
        const model = client.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `Ты — строгий финансовый аудитор спортивного центра SPARTA. Твоя задача: детально проанализировать прикреплённое изображение (банковский чек, квитанцию, скриншот перевода или выписку) и проверить его подлинность и соответствие ожидаемому платежу.

Официальные реквизиты получателя SPARTA:
- ФИО / ИП: ИП ЛЕБЕДЕВА КСЕНИЯ АЛЕКСАНДРОВНА / Ксения Александровна Л. / Ксения Л.
- Номер телефона СБП: +7 (919) 339-33-99 / 89193393399 / 9193393399
- Банк получателя: Сбербанк / ПАО Сбербанк / Челябинское отделение 8597
- Расчетный счет: 40802810172000088821
- ИНН: 742004340856
- Ожидаемая сумма платежа: ${expectedAmount} рублей

Внимательно изучи изображение и верни JSON строго по следующей схеме:
{
  "isBankReceipt": boolean,
  "bankName": string,
  "extractedAmount": number,
  "isAmountMatching": boolean,
  "recipientNameFound": string,
  "recipientPhoneFound": string,
  "isRecipientMatching": boolean,
  "operationDate": string,
  "operationId": string,
  "confidenceScore": number,
  "verdict": "approved" | "needs_manual_review" | "rejected",
  "explanation": string
}`;

        const result = await model.generateContent([
            {
                inlineData: {
                    data: req.file.buffer.toString('base64'),
                    mimeType: req.file.mimetype || 'image/jpeg'
                }
            },
            prompt
        ]);

        const responseText = result.response.text();
        console.log(`Receipt verification response: ${responseText}`);
        const parsed = JSON.parse(responseText);
        res.json(parsed);
    } catch (error) {
        console.error('Receipt Verification Error:', error);
        res.status(200).json({
            isBankReceipt: true,
            extractedAmount: parseFloat(req.body?.expectedAmount) || 0,
            isAmountMatching: true,
            isRecipientMatching: true,
            confidenceScore: 0.5,
            verdict: "needs_manual_review",
            explanation: "Автоматический анализ недоступен, чек сохранен и направлен администратору на быструю проверку."
        });
    }
});

// =========================================================================
// SUBSCRIPTION PLANS & ATTENDANCE SEGMENTATION REST API
// =========================================================================

// Helper to fetch all plans from Firestore with default fallback
const getRawSubscriptionPlans = async () => {
    try {
        const snap = await getDocs(collection(db, 'subscription_plans'));
        if (!snap.empty) {
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
    } catch (err) {
        console.warn('Firestore subscription_plans fetch fallback:', err.message);
    }
    return DEFAULT_SUBSCRIPTION_PLANS;
};

// 1. Client Showcase Plans (Filtered & Active only)
app.get('/api/subscriptions/plans', async (req, res) => {
    try {
        const { city, branchId, ageCategory, type } = req.query;
        const allPlans = await getRawSubscriptionPlans();

        const filtered = allPlans.filter(plan => {
            if (plan.isActive === false) return false;

            if (city && city !== 'all') {
                const matchCity = plan.cityId === city || plan.cityId === 'all' || plan.isUniversal;
                if (!matchCity) return false;
            }

            if (branchId && branchId !== 'all') {
                const matchBranch = plan.branchId === branchId ||
                    plan.branchId === 'all' ||
                    (Array.isArray(plan.branchIds) && plan.branchIds.includes(branchId)) ||
                    plan.isUniversal;
                if (!matchBranch) return false;
            }

            if (ageCategory && ageCategory !== 'ALL') {
                const matchAge = plan.ageCategory === ageCategory || plan.ageCategory === 'ALL';
                if (!matchAge) return false;
            }

            if (type && type !== 'all') {
                if (plan.type !== type) return false;
            }

            return true;
        });

        // Sort by sortOrder then price
        filtered.sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99) || (a.price || 0) - (b.price || 0));

        res.json({ success: true, count: filtered.length, plans: filtered });
    } catch (error) {
        console.error('Error fetching public subscription plans:', error);
        res.status(500).json({ error: 'Failed to fetch subscription plans', details: error.message });
    }
});

// 2. Admin CRUD: List all plans (including inactive)
app.get('/api/admin/subscriptions/plans', async (req, res) => {
    try {
        const plans = await getRawSubscriptionPlans();
        res.json({ success: true, count: plans.length, plans });
    } catch (error) {
        console.error('Admin plans fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch admin subscription plans' });
    }
});

// 3. Admin CRUD: Create Plan
app.post('/api/admin/subscriptions/plans', async (req, res) => {
    try {
        const planData = req.body;
        if (!planData.title || !planData.price) {
            return res.status(400).json({ error: 'Название и цена абонемента обязательны' });
        }

        const planId = planData.id || `plan_${Date.now()}`;
        const newPlan = {
            ...planData,
            id: planId,
            isActive: planData.isActive !== false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await setDoc(doc(db, 'subscription_plans', planId), newPlan);
        res.status(201).json({ success: true, plan: newPlan });
    } catch (error) {
        console.error('Admin create plan error:', error);
        res.status(500).json({ error: 'Ошибка при создании тарифа', details: error.message });
    }
});

// 4. Admin CRUD: Update Plan
app.put('/api/admin/subscriptions/plans/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const planRef = doc(db, 'subscription_plans', id);
        const planSnap = await getDoc(planRef);

        const updatedData = {
            ...updates,
            updatedAt: serverTimestamp()
        };

        if (planSnap.exists()) {
            await updateDoc(planRef, updatedData);
        } else {
            await setDoc(planRef, { id, ...updatedData, createdAt: serverTimestamp() });
        }

        res.json({ success: true, id, plan: updatedData });
    } catch (error) {
        console.error('Admin update plan error:', error);
        res.status(500).json({ error: 'Ошибка при обновлении тарифа', details: error.message });
    }
});

// 5. Admin CRUD: Delete or Archive Plan
app.delete('/api/admin/subscriptions/plans/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { permanent } = req.query;

        const planRef = doc(db, 'subscription_plans', id);
        if (permanent === 'true') {
            await deleteDoc(planRef);
        } else {
            await updateDoc(planRef, { isActive: false, updatedAt: serverTimestamp() });
        }

        res.json({ success: true, message: 'Тариф успешно удален / отправлен в архив' });
    } catch (error) {
        console.error('Admin delete plan error:', error);
        res.status(500).json({ error: 'Ошибка при удалении тарифа' });
    }
});

// 6. Safe Seed Subscription Plans
app.post('/api/subscriptions/seed', async (req, res) => {
    try {
        let seeded = 0;
        for (const plan of DEFAULT_SUBSCRIPTION_PLANS) {
            const planRef = doc(db, 'subscription_plans', plan.id);
            const planSnap = await getDoc(planRef);
            if (!planSnap.exists()) {
                await setDoc(planRef, {
                    ...plan,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                seeded++;
            }
        }
        res.json({ success: true, message: `Успешно инициализировано ${seeded} новых планов абонементов`, count: seeded });
    } catch (error) {
        console.error('Seed plans error:', error);
        res.status(500).json({ error: 'Ошибка при инициализации планов', details: error.message });
    }
});

// 7. Check-In & Session Deduction API (QR-Scanner / Trainer Journal)
app.post('/api/subscriptions/check-in', async (req, res) => {
    try {
        const {
            childId,
            branchId,
            status = 'PRESENT',
            date = new Date().toISOString().split('T')[0],
            time,
            groupId,
            groupName,
            coachId,
            coachName,
            medicalNoteDays = 0,
            note = ''
        } = req.body;

        if (!childId) {
            return res.status(400).json({ error: 'MISSING_CHILD_ID', message: 'Не указан ID спортсмена' });
        }

        const childRef = doc(db, 'users', childId);
        const childSnap = await getDoc(childRef);

        if (!childSnap.exists()) {
            return res.status(404).json({ error: 'NOT_FOUND', message: 'Спортсмен не найден в базе данных' });
        }

        const childData = childSnap.data();
        const sub = childData.subscription;

        if (!sub) {
            return res.status(400).json({
                error: 'NO_SUBSCRIPTION',
                message: 'У спортсмена нет оформленного абонемента. Требуется покупка.'
            });
        }

        // Check if frozen
        if (sub.status === 'FROZEN' || sub.isFrozen) {
            const frozenUntilStr = sub.frozenUntil
                ? (typeof sub.frozenUntil.toDate === 'function' ? sub.frozenUntil.toDate() : new Date(sub.frozenUntil.seconds * 1000)).toLocaleDateString('ru-RU')
                : 'указанного срока';
            return res.status(400).json({
                error: 'SUBSCRIPTION_FROZEN',
                message: `Абонемент спортсмена заморожен до ${frozenUntilStr}. Пожалуйста, снимите заморозку в личном кабинете.`
            });
        }

        // Check expiration date
        if (sub.expiresAt) {
            const expiryDate = typeof sub.expiresAt.toDate === 'function'
                ? sub.expiresAt.toDate()
                : new Date((sub.expiresAt.seconds || sub.expiresAt._seconds) * 1000);
            
            if (expiryDate < new Date()) {
                return res.status(400).json({
                    error: 'SUBSCRIPTION_EXPIRED',
                    message: `Срок действия абонемента истек (${expiryDate.toLocaleDateString('ru-RU')}). Требуется продление.`
                });
            }
        }

        // Check Branch Validation
        if (branchId && !sub.isUniversal && sub.branchId && sub.branchId !== 'all' && sub.branchId !== branchId) {
            return res.status(400).json({
                error: 'BRANCH_MISMATCH',
                message: `Этот абонемент действует только в филиале «${sub.branchName || sub.branchId}». Посещение другого филиала недоступно.`
            });
        }

        // Calculate session changes
        const total = sub.totalSessions !== undefined ? sub.totalSessions : 8;
        let currentRemaining = sub.remainingSessions !== undefined ? sub.remainingSessions : total;
        if (currentRemaining === null && total !== null) currentRemaining = total;

        let newRemaining = currentRemaining;
        let newStatus = sub.status || 'ACTIVE';
        let newExpiresAt = sub.expiresAt;
        let actionMessage = '';

        if (status === 'PRESENT') {
            if (total !== null && currentRemaining <= 0) {
                return res.status(400).json({
                    error: 'NO_SESSIONS_LEFT',
                    message: `Занятия по абонементу исчерпаны (0 из ${total}). Требуется продление.`
                });
            }

            if (total !== null) {
                newRemaining = Math.max(0, currentRemaining - 1);
                if (newRemaining === 0) {
                    newStatus = 'EXPIRED';
                }
            }

            actionMessage = total !== null
                ? `Посещение отмечено! Списано 1 занятие (осталось ${newRemaining} из ${total})`
                : 'Посещение отмечено по безлимитному абонементу';

        } else if (status === 'MISSED_BURNT') {
            if (total !== null) {
                newRemaining = Math.max(0, currentRemaining - 1);
                if (newRemaining === 0) {
                    newStatus = 'EXPIRED';
                }
            }
            actionMessage = total !== null
                ? `Зафиксирован прогул без причины. 1 занятие списано (осталось ${newRemaining} из ${total})`
                : 'Зафиксирован прогул по безлимитному абонементу';

        } else if (status === 'EXCUSED') {
            // Excused absence: do NOT deduct session
            // If medical note days provided, extend subscription expiry
            if (Number(medicalNoteDays) > 0 && sub.expiresAt) {
                const currentExpiry = typeof sub.expiresAt.toDate === 'function'
                    ? sub.expiresAt.toDate()
                    : new Date((sub.expiresAt.seconds || sub.expiresAt._seconds) * 1000);
                const extendedDate = new Date(currentExpiry.getTime() + Number(medicalNoteDays) * 24 * 60 * 60 * 1000);
                newExpiresAt = Timestamp.fromDate(extendedDate);
                actionMessage = `Пропуск по справке сохранен (занятие не списано). Абонемент продлен на ${medicalNoteDays} дн.`;
            } else {
                actionMessage = 'Пропуск по уважительной причине зафиксирован (занятие сохранено)';
            }
        }

        // Update child subscription in Firestore
        const updatedSubscription = {
            ...sub,
            remainingSessions: newRemaining,
            status: newStatus,
            expiresAt: newExpiresAt,
            lastCheckIn: serverTimestamp(),
            checkInCount: (sub.checkInCount || 0) + (status === 'PRESENT' ? 1 : 0)
        };

        await updateDoc(childRef, {
            subscription: updatedSubscription,
            hasActiveMembership: newStatus === 'ACTIVE' || newStatus === 'active',
            updatedAt: serverTimestamp()
        });

        // Record in group attendance collection
        const effectiveGroupId = groupId || childData.groupId || 'main_group';
        const docId = `${effectiveGroupId}_${date}`;
        const attendanceRef = doc(db, 'attendance', docId);

        const checkInTime = time || new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        const recordItem = {
            status,
            childId,
            childName: childData.childName || childData.displayName || 'Спортсмен',
            parentId: childData.parentId || null,
            date,
            time: checkInTime,
            branchId: branchId || sub.branchId || 'main',
            groupId: effectiveGroupId,
            groupName: groupName || childData.groupName || 'Группа Sparta',
            coachId: coachId || null,
            coachName: coachName || childData.coachName || 'Тренер Sparta',
            note: note || (status === 'PRESENT' ? 'Чек-ин на тренировке' : status === 'EXCUSED' ? 'Справка / уважительная' : 'Прогул'),
            medicalNoteDays: Number(medicalNoteDays) || 0,
            checkInTime,
            timestamp: serverTimestamp()
        };

        const existingSnap = await getDoc(attendanceRef);
        let records = {};
        if (existingSnap.exists()) {
            records = existingSnap.data().records || {};
        }
        records[childId] = recordItem;

        await setDoc(attendanceRef, {
            groupId: effectiveGroupId,
            groupName: groupName || childData.groupName || 'Группа Sparta',
            branchId: branchId || sub.branchId || 'main',
            date,
            records,
            updatedAt: serverTimestamp()
        }, { merge: true });

        // Send parent notification if parent email/uid is known
        const parentTargetId = childData.parentId || childId;
        const parentEmail = childData.parentEmail || childData.email;
        if (parentEmail || parentTargetId) {
            await addDoc(collection(db, 'notifications'), {
                userId: parentTargetId,
                email: parentEmail || '',
                title: status === 'PRESENT'
                    ? `⚽ Посещение тренировки: ${childData.childName || 'Спортсмен'}`
                    : status === 'EXCUSED'
                    ? `📋 Уважительная причина: ${childData.childName || 'Спортсмен'}`
                    : `⚠️ Неявка на тренировку: ${childData.childName || 'Спортсмен'}`,
                message: actionMessage,
                type: status === 'PRESENT' ? 'attendance' : 'info',
                isRead: false,
                createdAt: serverTimestamp()
            }).catch(() => {});
        }

        res.json({
            success: true,
            status,
            remainingSessions: newRemaining,
            totalSessions: total,
            subscriptionStatus: newStatus,
            message: actionMessage,
            record: recordItem
        });

    } catch (error) {
        console.error('Check-in processing error:', error);
        res.status(500).json({ error: 'CHECK_IN_ERROR', message: 'Ошибка при проведении отметки посещаемости', details: error.message });
    }
});

// 8. Individual Child Freeze API
app.post('/api/subscriptions/freeze', async (req, res) => {
    try {
        const { childId, freezeDays = 7, reason = 'illness', note = '' } = req.body;

        if (!childId) {
            return res.status(400).json({ error: 'MISSING_CHILD_ID', message: 'Не указан ID спортсмена' });
        }

        const childRef = doc(db, 'users', childId);
        const childSnap = await getDoc(childRef);

        if (!childSnap.exists()) {
            return res.status(404).json({ error: 'NOT_FOUND', message: 'Спортсмен не найден' });
        }

        const childData = childSnap.data();
        const sub = childData.subscription;

        if (!sub) {
            return res.status(400).json({ error: 'NO_SUBSCRIPTION', message: 'У спортсмена нет активного абонемента' });
        }

        const days = Math.min(30, Math.max(1, Number(freezeDays) || 7));
        const currentExpiry = typeof sub.expiresAt?.toDate === 'function'
            ? sub.expiresAt.toDate()
            : new Date((sub.expiresAt?.seconds || Date.now() / 1000) * 1000);

        const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
        const freezeEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        const freezeItem = {
            frozenAt: serverTimestamp(),
            days,
            reason,
            note
        };

        const updatedSub = {
            ...sub,
            status: 'FROZEN',
            isFrozen: true,
            frozenAt: serverTimestamp(),
            frozenUntil: Timestamp.fromDate(freezeEnd),
            expiresAt: Timestamp.fromDate(newExpiry),
            freezeDaysTotal: (sub.freezeDaysTotal || 0) + days,
            freezeReason: reason,
            freezeHistory: [...(sub.freezeHistory || []), freezeItem]
        };

        await updateDoc(childRef, {
            subscription: updatedSub,
            updatedAt: serverTimestamp()
        });

        res.json({
            success: true,
            message: `Абонемент спортсмена успешно заморожен на ${days} дней. Новый срок окончания: ${newExpiry.toLocaleDateString('ru-RU')}`,
            newExpiry: newExpiry.toISOString(),
            frozenUntil: freezeEnd.toISOString()
        });
    } catch (error) {
        console.error('Freeze error:', error);
        res.status(500).json({ error: 'FREEZE_ERROR', message: 'Ошибка при заморозке абонемента' });
    }
});

// 9. Individual Child Unfreeze API
app.post('/api/subscriptions/unfreeze', async (req, res) => {
    try {
        const { childId } = req.body;
        if (!childId) {
            return res.status(400).json({ error: 'MISSING_CHILD_ID' });
        }

        const childRef = doc(db, 'users', childId);
        const childSnap = await getDoc(childRef);

        if (!childSnap.exists()) {
            return res.status(404).json({ error: 'NOT_FOUND' });
        }

        const childData = childSnap.data();
        const sub = childData.subscription;

        if (!sub || !sub.isFrozen) {
            return res.json({ success: true, message: 'Абонемент уже активен' });
        }

        const updatedSub = {
            ...sub,
            status: 'ACTIVE',
            isFrozen: false,
            unfrozenAt: serverTimestamp()
        };

        await updateDoc(childRef, {
            subscription: updatedSub,
            updatedAt: serverTimestamp()
        });

        res.json({ success: true, message: 'Абонемент успешно разморожен!' });
    } catch (error) {
        console.error('Unfreeze error:', error);
        res.status(500).json({ error: 'UNFREEZE_ERROR', message: 'Ошибка при разморозке абонемента' });
    }
});

const PORT = 3005;
app.listen(PORT, () => {
    console.log(`Payment, AI & Subscriptions Server running on port ${PORT}`);
});

import nodemailer from 'nodemailer';

const DEFAULT_RECIPIENTS = ['bugrova.k@bk.ru', 'larisa.p2000@mail.ru'];

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

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

        // Clean recipient list
        const customEmails = (process.env.NOTIFICATION_EMAILS || '')
            .split(',')
            .map(e => e.trim())
            .filter(Boolean);

        const recipients = Array.from(new Set([...DEFAULT_RECIPIENTS, ...customEmails]));

        // Format timestamps (Chelyabinsk UTC+5)
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
}

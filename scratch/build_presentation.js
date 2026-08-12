import fs from 'fs';
import { execSync } from 'child_process';

const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Презентация Главного Блока — СПАРТА</title>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Russo+One&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Manrope', sans-serif;
            background-color: #0d0d0d;
            color: #ffffff;
            width: 1920px;
            height: 1080px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 80px 100px;
            position: relative;
            background: radial-gradient(circle at 80% 20%, rgba(212, 175, 55, 0.18) 0%, transparent 50%),
                        radial-gradient(circle at 10% 80%, rgba(0, 240, 255, 0.12) 0%, transparent 40%),
                        #0a0a0d;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255,255,255,0.12);
            padding-bottom: 30px;
        }
        
        .logo-box {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        .logo-badge {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #D4AF37 0%, #AA7C11 100%);
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Russo One', sans-serif;
            font-size: 32px;
            color: #000;
            box-shadow: 0 0 30px rgba(212,175,55,0.4);
        }
        
        .brand-name {
            font-family: 'Russo One', sans-serif;
            font-size: 38px;
            letter-spacing: 2px;
            background: linear-gradient(to right, #FFFFFF, #D4AF37);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .tagline {
            font-size: 16px;
            color: rgba(255,255,255,0.6);
            text-transform: uppercase;
            letter-spacing: 2px;
            font-weight: 700;
        }

        .main-content {
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            gap: 80px;
            align-items: center;
            margin-top: 30px;
        }

        .title-block h1 {
            font-family: 'Russo One', sans-serif;
            font-size: 64px;
            line-height: 1.1;
            margin-bottom: 28px;
            color: #ffffff;
        }

        .title-block h1 span {
            color: #D4AF37;
            text-shadow: 0 0 30px rgba(212,175,55,0.3);
        }

        .subtitle {
            font-size: 24px;
            color: rgba(255,255,255,0.85);
            line-height: 1.6;
            margin-bottom: 40px;
        }

        .hero-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
        }

        .stat-card {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(212, 175, 55, 0.25);
            border-radius: 24px;
            padding: 24px;
            backdrop-filter: blur(10px);
        }

        .stat-num {
            font-family: 'Russo One', sans-serif;
            font-size: 42px;
            color: #D4AF37;
            margin-bottom: 8px;
        }

        .stat-desc {
            font-size: 15px;
            color: rgba(255,255,255,0.7);
            font-weight: 600;
        }

        .right-card {
            background: rgba(18, 18, 22, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 32px;
            padding: 40px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.6);
            position: relative;
        }

        .right-card h2 {
            font-family: 'Russo One', sans-serif;
            font-size: 28px;
            color: #fff;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .direction-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .direction-item {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 18px;
            padding: 18px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .direction-name {
            font-weight: 700;
            font-size: 18px;
            color: #fff;
        }

        .direction-badge {
            font-size: 13px;
            font-weight: 800;
            background: rgba(212, 175, 55, 0.15);
            color: #D4AF37;
            padding: 6px 14px;
            border-radius: 20px;
            border: 1px solid rgba(212, 175, 55, 0.3);
            text-transform: uppercase;
        }

        .footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid rgba(255,255,255,0.12);
            padding-top: 30px;
            color: rgba(255,255,255,0.5);
            font-size: 16px;
            font-weight: 600;
        }

        .locations {
            display: flex;
            gap: 30px;
            color: rgba(255,255,255,0.85);
        }

        .loc-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .loc-dot {
            width: 8px;
            height: 8px;
            background: #D4AF37;
            border-radius: 50%;
            box-shadow: 0 0 10px #D4AF37;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-box">
            <div class="logo-badge">S</div>
            <div>
                <div class="brand-name">СПАРТА</div>
                <div class="tagline">Детский Спортивный Центр</div>
            </div>
        </div>
        <div class="tagline">Презентация Главного Блока</div>
    </div>

    <div class="main-content">
        <div class="title-block">
            <h1>ДЕТСКИЙ СПОРТ <span>ПРЕМИУМ КЛАССА</span> В ЧЕЛЯБИНСКЕ</h1>
            <p class="subtitle">Гармоничное физическое развитие, профессиональные тренеры и современные безопасные залы для детей от 3 до 16 лет.</p>

            <div class="hero-stats">
                <div class="stat-card">
                    <div class="stat-num">3</div>
                    <div class="stat-desc">Удобных филиала в городе</div>
                </div>
                <div class="stat-card">
                    <div class="stat-num">100%</div>
                    <div class="stat-desc">Безопасное покрытие залов</div>
                </div>
                <div class="stat-card">
                    <div class="stat-num">15+</div>
                    <div class="stat-desc">Опытных наставников</div>
                </div>
            </div>
        </div>

        <div class="right-card">
            <h2>🏆 Ключевые Направления</h2>
            <div class="direction-list">
                <div class="direction-item">
                    <span class="direction-name">⚽ Футбол</span>
                    <span class="direction-badge">от 3 лет</span>
                </div>
                <div class="direction-item">
                    <span class="direction-name">🥊 Единоборства (Дзюдо, Самбо)</span>
                    <span class="direction-badge">от 4 лет</span>
                </div>
                <div class="direction-item">
                    <span class="direction-name">🏊‍♂️ Плавание & Бассейн</span>
                    <span class="direction-badge">от 3 лет</span>
                </div>
                <div class="direction-item">
                    <span class="direction-name">🤸‍♀️ Гимнастика (Эстетическая)</span>
                    <span class="direction-badge">от 4 лет</span>
                </div>
            </div>
        </div>
    </div>

    <div class="footer">
        <div class="locations">
            <div class="loc-item"><div class="loc-dot"></div> ОЦ «Ньютон» (250-летия Челябинска, 46)</div>
            <div class="loc-item"><div class="loc-dot"></div> ЧТЗ (Карпенко, 5Б)</div>
            <div class="loc-item"><div class="loc-dot"></div> ТК «Гагарин-Парк»</div>
        </div>
        <div>SPARTA SPORTS CENTER © 2026</div>
    </div>
</body>
</html>`;

fs.writeFileSync('scratch/sparta_presentation.html', htmlContent);
console.log('Generated presentation HTML slide successfully!');

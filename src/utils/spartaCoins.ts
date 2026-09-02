import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * SPARTA COINS (Клубная валюта Sparta)
 * 
 * Курс по умолчанию: 1 Спартакоин (🟡) = 10 рублей (₽)
 * 
 * Спартакоины начисляются спортсменам за достижения, выполнение заданий,
 * посещаемость тренировок и активность в клубе.
 */

export const DEFAULT_SPARTA_COIN_RATE = 10;
export const DEFAULT_MAX_DISCOUNT_PERCENT = 100;

export let SPARTA_COIN_RATE = DEFAULT_SPARTA_COIN_RATE;

export const setGlobalCoinRate = (rate: number) => {
    if (rate && rate > 0) {
        SPARTA_COIN_RATE = rate;
    }
};

export const getGlobalCoinRate = (): number => {
    return SPARTA_COIN_RATE || DEFAULT_SPARTA_COIN_RATE;
};

/**
 * Конвертирует рубли в Спартакоины (с округлением вверх до целой монеты)
 */
export const rublesToCoins = (rubles: number, rate: number = SPARTA_COIN_RATE): number => {
    if (!rubles || rubles <= 0) return 0;
    const activeRate = rate > 0 ? rate : SPARTA_COIN_RATE;
    return Math.ceil(rubles / activeRate);
};

/**
 * Конвертирует Спартакоины в рубли
 */
export const coinsToRubles = (coins: number, rate: number = SPARTA_COIN_RATE): number => {
    if (!coins || coins <= 0) return 0;
    const activeRate = rate > 0 ? rate : SPARTA_COIN_RATE;
    return coins * activeRate;
};

/**
 * Форматирует число монет с разделителями тысяч
 */
export const formatCoins = (coins: number): string => {
    return (coins || 0).toLocaleString('ru-RU');
};

/**
 * Форматирует рубли
 */
export const formatRubles = (rubles: number): string => {
    return `${(rubles || 0).toLocaleString('ru-RU')} ₽`;
};

export interface SpartaCoinsEconomyConfig {
    coinExchangeRateRub: number;
    maxDiscountPercent: number;
    loading: boolean;
}

/**
 * React-хук для динамической подписки на настройки экономики клуба
 */
export const useSpartaCoinsEconomy = () => {
    const [config, setConfig] = useState<{
        coinExchangeRateRub: number;
        maxDiscountPercent: number;
        loading: boolean;
    }>({
        coinExchangeRateRub: SPARTA_COIN_RATE,
        maxDiscountPercent: DEFAULT_MAX_DISCOUNT_PERCENT,
        loading: true
    });

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'settings', 'economy'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                const rate = Number(data.coinExchangeRateRub) || DEFAULT_SPARTA_COIN_RATE;
                const maxDiscount = Number(data.maxDiscountPercent) || DEFAULT_MAX_DISCOUNT_PERCENT;
                setGlobalCoinRate(rate);
                setConfig({
                    coinExchangeRateRub: rate,
                    maxDiscountPercent: maxDiscount,
                    loading: false
                });
            } else {
                setConfig(prev => ({ ...prev, loading: false }));
            }
        }, (err) => {
            console.warn('[SpartaCoins] Failed to listen to settings/economy:', err);
            setConfig(prev => ({ ...prev, loading: false }));
        });

        return () => unsub();
    }, []);

    return {
        exchangeRate: config.coinExchangeRateRub,
        maxDiscountPercent: config.maxDiscountPercent,
        loading: config.loading,
        rublesToCoins: (rubles: number) => rublesToCoins(rubles, config.coinExchangeRateRub),
        coinsToRubles: (coins: number) => coinsToRubles(coins, config.coinExchangeRateRub),
        formatCoins,
        formatRubles
    };
};

export interface SplitPaymentCalculation {
    originalPriceRub: number;
    priceInCoins: number;
    userCoinsBalance: number;
    maxCoinsApplicable: number;
    coinsToSpend: number;
    coinDiscountRub: number;
    finalRublesToPay: number;
    isFullyCoveredByCoins: boolean;
    canAffordFully: boolean;
}

/**
 * Рассчитывает параметры сплит-оплаты (монеты + рубли)
 * 
 * @param priceRub Полная стоимость в рублях
 * @param userCoins Баланс монет пользователя
 * @param desiredCoins Желаемое количество монет для списания (по умолчанию 0)
 * @param maxDiscountPercentage Максимальный процент скидки баллами (100 = полная оплата монетами)
 * @param rate Текущий курс обмена (рублей за 1 монету)
 */
export const calculateSplitPayment = (
    priceRub: number,
    userCoins: number,
    desiredCoins: number = 0,
    maxDiscountPercentage: number = 100,
    rate: number = SPARTA_COIN_RATE
): SplitPaymentCalculation => {
    const activeRate = rate > 0 ? rate : SPARTA_COIN_RATE;
    const validPrice = Math.max(0, priceRub || 0);
    const validBalance = Math.max(0, userCoins || 0);
    const totalCoinsNeeded = rublesToCoins(validPrice, activeRate);

    // Максимально допустимая скидка в рублях
    const maxDiscountRub = Math.floor(validPrice * (maxDiscountPercentage / 100));
    const maxCoinsForDiscount = Math.min(
        validBalance,
        Math.floor(maxDiscountRub / activeRate)
    );

    // Сколько монет фактически списывается
    const coinsToSpend = Math.max(0, Math.min(desiredCoins, maxCoinsForDiscount));
    const coinDiscountRub = coinsToSpend * activeRate;
    const finalRublesToPay = Math.max(0, validPrice - coinDiscountRub);

    const isFullyCoveredByCoins = finalRublesToPay === 0 && validPrice > 0;
    const canAffordFully = validBalance >= totalCoinsNeeded;

    return {
        originalPriceRub: validPrice,
        priceInCoins: totalCoinsNeeded,
        userCoinsBalance: validBalance,
        maxCoinsApplicable: maxCoinsForDiscount,
        coinsToSpend,
        coinDiscountRub,
        finalRublesToPay,
        isFullyCoveredByCoins,
        canAffordFully
    };
};


import React, { useMemo } from 'react';
import { SizeData } from '../types/shop';

interface SizeAdvisorProps {
    category: 'child' | 'adult';
    type: 'jersey' | 'shorts' | 'pants';
    measurements?: SizeData[];
    userHeight?: string;
    userChest?: string;
    userWaist?: string;
    userHips?: string;
    onSelectSize?: (size: string) => void;
}

const SizeAdvisor: React.FC<SizeAdvisorProps> = ({
    category,
    type,
    measurements,
    userHeight,
    userChest,
    userWaist,
    userHips,
    onSelectSize
}) => {
    // Basic logic mapping if measurements are not provided
    // but we prefer them provided from parent
    const data = useMemo(() => {
        return measurements || [];
    }, [measurements]);

    const recommendedSize = useMemo(() => {
        const height = parseFloat(userHeight || '0');
        const chest = parseFloat(userChest || '0');
        const waist = parseFloat(userWaist || '0');
        const hips = parseFloat(userHips || '0');

        if (!height && !chest && !waist && !hips) return null;
        if (data.length === 0) return null;

        let bestMatch: SizeData | null = null;

        // Simple matching logic
        for (const sizeItem of data) {
            const size: any = sizeItem;
            let matches = true;

            if (category === 'child' && height && size.height) {
                if (Math.abs(height - Number(size.height)) > 6) matches = false;
            }

            if (chest && size.chestMin && size.chestMax) {
                if (chest < size.chestMin - 2 || chest > size.chestMax + 2) matches = false;
            }

            if (waist && size.waistMin && size.waistMax) {
                if (waist < size.waistMin - 2 || waist > size.waistMax + 2) matches = false;
            }

            if (hips && size.hipsMin && size.hipsMax) {
                if (hips < size.hipsMin - 2 || hips > size.hipsMax + 2) matches = false;
            }

            if (matches) {
                bestMatch = sizeItem;
                break;
            }
        }

        return bestMatch;
    }, [data, userHeight, userChest, userWaist, userHips, category]);

    if (!recommendedSize) return null;

    return (
        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500/60 block">Рекомендация Sparta</span>
                    <span className="text-white font-bold">Вам должен подойти размер: <span className="text-yellow-500 text-xl">{recommendedSize.label}</span></span>
                </div>
                {onSelectSize && (
                    <button
                        onClick={() => onSelectSize(recommendedSize.label)}
                        className="px-4 py-2 bg-yellow-500 text-black text-xs font-black uppercase rounded-lg hover:bg-yellow-400 transition-colors"
                    >
                        Выбрать этот
                    </button>
                )}
            </div>
            <p className="text-[10px] text-white/40 italic">
                * Рекомендация основана на введенных вами параметрах. Если замеры между двумя размерами, рекомендуем выбирать больший для комфортной посадки или меньший для облегания.
            </p>
        </div>
    );
};

export default SizeAdvisor;
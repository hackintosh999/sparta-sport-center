import { LucideIcon } from 'lucide-react';

export interface NavItem {
    label: string;
    href: string;
}

export interface Feature {
    id: number;
    title: string;
    description: string;
    iconSrc: string;
}

export interface Program {
    id: number;
    title: string;
    prices: Record<number, number>;
    originalPrices?: Record<number, number>;
    features: string[];
    image: string;
    isPromoActive?: boolean;
    discountPercent?: number;
    promoBadgeText?: string;
    promoTargetMonths?: number[];
    sessionsPerWeek?: number;
    customPerSessionPrice?: Record<string, number>;
}

export interface Coach {
    id: string | number;
    name: string;
    role: string;
    image: string;
    order?: number;
}

export interface FAQItem {
    id: number;
    question: string;
    answer: string;
}

export interface ScheduleItem {
    id: string;
    time: string;
    endTime?: string;
    title: string;
    trainer: string;
    type: string;
}

export interface ScheduleDay {
    id: string;
    day: string;
    items: ScheduleItem[];
}
import React, { useEffect } from 'react';

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogUrl?: string;
    twitterCard?: string;
}

const DEFAULT_TITLE = 'Футбольная школа SPARTA в Челябинске';
const DEFAULT_DESCRIPTION = 'Детская футбольная школа SPARTA в Челябинске. Профессиональная подготовка от первых тренировок до соревнований. 3 филиала, бесплатное пробное занятие.';
const DEFAULT_KEYWORDS = 'футбольная школа челябинск, детская футбольная школа, футбол для детей челябинск, секция футбола, спарта челябинск';

const SEO: React.FC<SEOProps> = ({
    title,
    description = DEFAULT_DESCRIPTION,
    keywords = DEFAULT_KEYWORDS,
    ogTitle,
    ogDescription,
    ogImage = '/sparta-logo.png',
    ogUrl,
    twitterCard = 'summary_large_image',
}) => {
    useEffect(() => {
        // Update Document Title
        const finalTitle = title
            ? (title.includes('SPARTA') ? title : `${title} | Футбольная школа SPARTA в Челябинске`)
            : DEFAULT_TITLE;
        document.title = finalTitle;

        const currentUrl = ogUrl || (typeof window !== 'undefined' ? window.location.href : '');

        // Canonical URL
        let canonicalElement = document.querySelector('link[rel="canonical"]');
        if (!canonicalElement) {
            canonicalElement = document.createElement('link');
            canonicalElement.setAttribute('rel', 'canonical');
            document.head.appendChild(canonicalElement);
        }
        if (currentUrl) {
            canonicalElement.setAttribute('href', currentUrl);
        }

        // Update Meta Tags
        const updateMetaTag = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
            let element = document.querySelector(`meta[${attr}="${name}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attr, name);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        if (description) updateMetaTag('description', description);
        if (keywords) updateMetaTag('keywords', keywords);

        // Open Graph
        const effectiveOgTitle = ogTitle || finalTitle;
        const effectiveOgDesc = ogDescription || description;
        if (effectiveOgTitle) updateMetaTag('og:title', effectiveOgTitle, 'property');
        if (effectiveOgDesc) updateMetaTag('og:description', effectiveOgDesc, 'property');
        if (ogImage) updateMetaTag('og:image', ogImage, 'property');
        if (currentUrl) updateMetaTag('og:url', currentUrl, 'property');
        updateMetaTag('og:type', 'website', 'property');

        // Twitter
        if (effectiveOgTitle) updateMetaTag('twitter:title', effectiveOgTitle);
        if (effectiveOgDesc) updateMetaTag('twitter:description', effectiveOgDesc);
        if (ogImage) updateMetaTag('twitter:image', ogImage);
        updateMetaTag('twitter:card', twitterCard);

    }, [title, description, keywords, ogTitle, ogDescription, ogImage, ogUrl, twitterCard]);

    return null; // This component doesn't render anything
};

export default SEO;
import React from 'react';
import { Button, GlassCard, SectionHeader } from './UIComponents';
import figma from '@figma/code-connect';

/**
 * Figma Code Connect mapping for Sparta Sports Center Design System
 * File URL: https://www.figma.com/design/fCSm2Ay5qoIjAZNIEg4tUE/Untitled
 */

figma.connect(
    Button,
    'https://www.figma.com/design/fCSm2Ay5qoIjAZNIEg4tUE/Untitled?node-id=0:1',
    {
        props: {
            text: figma.string('Label'),
            variant: figma.enum('Variant', {
                Primary: 'primary',
                Outline: 'outline',
            }),
        },
        example: ({ text, variant }) => (
            <Button variant={variant}>
                {text}
            </Button>
        ),
    }
);

figma.connect(
    GlassCard,
    'https://www.figma.com/design/fCSm2Ay5qoIjAZNIEg4tUE/Untitled?node-id=0:1',
    {
        example: () => (
            <GlassCard className="p-6">
                <h3 className="font-russo text-white text-lg">Спарта Карточка</h3>
                <p className="text-gray-400 font-manrope text-sm">Glassmorphism Dark</p>
            </GlassCard>
        ),
    }
);

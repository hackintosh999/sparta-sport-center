import React from 'react';
import EmojiPicker, { Theme, EmojiStyle, SuggestionMode } from 'emoji-picker-react';
import { Sparkles, X } from 'lucide-react';

interface SpartaEmojiPickerProps {
    onEmojiClick: (emojiData: any) => void;
    onClose?: () => void;
}

export const SpartaEmojiPicker: React.FC<SpartaEmojiPickerProps> = ({ onEmojiClick, onClose }) => {
    return (
        <div className="sparta-emoji-container relative w-[340px] sm:w-[370px] select-none">
            {/* Custom Sparta CSS Overrides */}
            <style>{`
                .sparta-emoji-container .epr-main {
                    width: 100% !important;
                    background-color: #141518 !important;
                    border: 1px solid rgba(255, 193, 7, 0.3) !important;
                    border-radius: 1.25rem !important;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.85), 0 0 25px rgba(255, 193, 7, 0.15) !important;
                    font-family: inherit !important;
                    overflow: hidden !important;
                }

                .sparta-emoji-container .epr-header-bar {
                    background: #191a1e !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
                    padding: 10px 12px 6px 12px !important;
                }

                .sparta-emoji-container .epr-search-container {
                    padding: 0 !important;
                }

                .sparta-emoji-container .epr-search-container input.epr-search {
                    background-color: rgba(255, 255, 255, 0.06) !important;
                    border: 1px solid rgba(255, 255, 255, 0.12) !important;
                    border-radius: 0.75rem !important;
                    color: #ffffff !important;
                    font-size: 12px !important;
                    padding: 8px 12px 8px 36px !important;
                    height: 36px !important;
                }

                .sparta-emoji-container .epr-search-container input.epr-search:focus {
                    border-color: rgba(255, 193, 7, 0.6) !important;
                    box-shadow: 0 0 12px rgba(255, 193, 7, 0.2) !important;
                }

                .sparta-emoji-container .epr-category-nav {
                    background: #111215 !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
                    padding: 6px 8px !important;
                }

                .sparta-emoji-container .epr-category-nav button.epr-cat-btn {
                    border-radius: 8px !important;
                    padding: 4px !important;
                }

                .sparta-emoji-container .epr-category-nav button.epr-cat-btn:hover {
                    background: rgba(255, 193, 7, 0.15) !important;
                }

                .sparta-emoji-container .epr-category-nav button.epr-cat-btn.epr-active {
                    filter: drop-shadow(0 0 6px #FFC107) !important;
                }

                .sparta-emoji-container .epr-body {
                    background-color: #141518 !important;
                }

                .sparta-emoji-container .epr-emoji-category-label {
                    background-color: rgba(20, 21, 24, 0.95) !important;
                    backdrop-filter: blur(10px) !important;
                    color: #FFC107 !important;
                    font-weight: 700 !important;
                    font-size: 10px !important;
                    letter-spacing: 0.08em !important;
                    text-transform: uppercase !important;
                    padding: 6px 12px !important;
                    margin: 0 !important;
                    top: 0 !important;
                    position: sticky !important;
                    z-index: 10 !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
                }

                .sparta-emoji-container button.epr-btn:hover {
                    background-color: rgba(255, 193, 7, 0.18) !important;
                    border-radius: 0.6rem !important;
                    transform: scale(1.15) !important;
                    transition: all 0.15s ease !important;
                }

                .sparta-emoji-container .epr-preview {
                    background: #111215 !important;
                    border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
                    height: 46px !important;
                    padding: 4px 12px !important;
                }

                .sparta-emoji-container .epr-preview-emoji {
                    width: 28px !important;
                    height: 28px !important;
                }

                .sparta-emoji-container .epr-preview-name {
                    color: #ffffff !important;
                    font-weight: 600 !important;
                    font-size: 11px !important;
                }

                /* Custom Scrollbar for Emoji Body */
                .sparta-emoji-container .epr-body::-webkit-scrollbar {
                    width: 6px !important;
                }

                .sparta-emoji-container .epr-body::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.2) !important;
                }

                .sparta-emoji-container .epr-body::-webkit-scrollbar-thumb {
                    background: rgba(255, 193, 7, 0.3) !important;
                    border-radius: 4px !important;
                }

                .sparta-emoji-container .epr-body::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 193, 7, 0.6) !important;
                }
            `}</style>

            {/* Top Bar Close Button (Neat Header Integration) */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-2.5 right-2.5 z-30 w-6 h-6 rounded-lg bg-white/10 hover:bg-sparta-gold hover:text-black text-white/70 flex items-center justify-center transition-all"
                    title="Закрыть"
                >
                    <X size={13} />
                </button>
            )}

            {/* Main Apple Emoji Picker */}
            <EmojiPicker
                onEmojiClick={onEmojiClick}
                theme={Theme.DARK}
                emojiStyle={EmojiStyle.APPLE}
                lazyLoadEmojis={true}
                searchPlaceHolder="Поиск эмодзи Спарта..."
                width="100%"
                height={410}
                suggestedEmojisMode={SuggestionMode.RECENT}
            />

            {/* Sparta Quick Bar Footer */}
            <div className="w-full px-3 py-2 bg-[#0e0f11] border-t border-sparta-gold/20 rounded-b-2xl flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider flex items-center gap-1">
                    <Sparkles size={12} className="text-sparta-gold" /> Настроение Спартанца
                </span>
                <div className="flex items-center gap-1">
                    {['🏆', '🥊', '⚽', '🔥', '💪'].map((emoji, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onEmojiClick({ emoji })}
                            className="w-7 h-7 text-base rounded-lg hover:bg-sparta-gold/30 hover:scale-115 flex items-center justify-center transition-all active:scale-95"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SpartaEmojiPicker;

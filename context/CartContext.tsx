import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem } from '../types/shop';
import { useAuth } from './AuthContext';

interface CartContextType {
    cartItems: CartItem[];
    addToCart: (product: Product, quantity: number, size?: string, color?: string, customName?: string, customNumber?: string, measurements?: Record<string, string>, fitStyle?: string) => void;
    removeFromCart: (cartItemId: string) => void;
    updateQuantity: (cartItemId: string, quantity: number) => void;
    clearCart: () => void;
    cartTotal: number;
    cartCount: number;
    isCartOpen: boolean;
    setIsCartOpen: (isOpen: boolean) => void;
    showToast: (message: string, type: ToastType) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

import { ShopToastContainer, ToastType } from '../components/shop/ShopToast';
import { safeLocalStorage } from '../utils/storage';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [toasts, setToasts] = useState<{ id: string, message: string, type: ToastType }[]>([]);

    // Load cart from localStorage on mount or user change
    useEffect(() => {
        if (user) {
            const savedCart = localStorage.getItem(`cart_${user.uid}`);
            if (savedCart) {
                try {
                    setCartItems(JSON.parse(savedCart));
                } catch (e) {
                    console.error("Failed to parse cart", e);
                }
            } else {
                setCartItems([]);
            }
        } else {
            setCartItems([]); // Clear local state if no user
        }
    }, [user]);

    // Save cart to localStorage when it changes
    useEffect(() => {
        if (user) {
            // Optimization: Strip heavy fields from product objects before saving to localStorage
            const optimizedCart = cartItems.map(item => ({
                ...item,
                product: {
                    id: item.product.id,
                    title: item.product.title,
                    price: item.product.price,
                    imageUrl: item.product.imageUrl,
                    category: item.product.category,
                    isCustomizable: item.product.isCustomizable,
                    // Remove heavy fields: gallery, reviews, colorImages, long descriptions
                    description: item.product.description?.substring(0, 100)
                }
            }));
            safeLocalStorage.setItem(`cart_${user.uid}`, JSON.stringify(optimizedCart));
        }
    }, [cartItems, user]);

    const showToast = (message: string, type: ToastType) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const addToCart = (product: Product, quantity: number, size?: string, color?: string, customName?: string, customNumber?: string, measurements?: Record<string, string>, fitStyle?: string) => {
        const cartItemId = `${product.id}-${size || 'nosize'}-${color || 'nocolor'}-${customName || 'noname'}-${customNumber || 'nonumber'}-${JSON.stringify(measurements || {})}-${fitStyle || 'standard'}`;

        setCartItems(prev => {
            const existing = prev.find(item => item.id === cartItemId);

            if (existing) {
                showToast(`Количество "${product.title}" в корзине обновлено`, 'success');
                return prev.map(item =>
                    item.id === cartItemId
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }

            showToast(`"${product.title}" добавлен в корзину`, 'success');
            return [...prev, {
                id: cartItemId,
                productId: product.id,
                product,
                quantity: quantity,
                selectedSize: size,
                selectedColor: color,
                customName,
                customNumber,
                measurements,
                fitStyle
            }];
        });
        setIsCartOpen(true);
    };

    const removeFromCart = (cartItemId: string) => {
        setCartItems(prev => {
            const item = prev.find(i => i.id === cartItemId);
            if (item) {
                showToast(`"${item.product.title}" удален из корзины`, 'info');
            }
            return prev.filter(item => item.id !== cartItemId);
        });
    };

    const updateQuantity = (cartItemId: string, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(cartItemId);
            return;
        }

        const item = cartItems.find(i => i.id === cartItemId);
        if (item && item.product.stock) {
            const stockKey = item.selectedSize || 'N/A';
            const availableStock = item.product.stock[stockKey] ?? 999;
            if (quantity > availableStock) {
                showToast(`Максимально доступное количество: ${availableStock}`, 'warning');
                return;
            }
        }

        setCartItems(prev =>
            prev.map(item =>
                item.id === cartItemId
                    ? { ...item, quantity }
                    : item
            )
        );
    };

    const clearCart = () => {
        setCartItems([]);
        showToast('Корзина очищена', 'info');
    };

    const cartTotal = cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            cartTotal,
            cartCount,
            isCartOpen,
            setIsCartOpen,
            showToast
        }}>
            {children}
            <ShopToastContainer toasts={toasts} onClose={removeToast} />
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};

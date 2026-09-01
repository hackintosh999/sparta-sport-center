import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Save, X, Search, ShoppingBag, ImageIcon, Loader2, DollarSign, Tag, Link as LinkIcon, Upload, Layers, List, EyeOff, Eye, Copy, Check, Package, Truck, CheckCircle, Clock as ClockIcon, FileText, User as UserIcon, Phone as PhoneIcon, Filter, ExternalLink, Calendar as CalendarIcon, Printer, AlertCircle, Users, Mail, RotateCcw, Sparkles, Flame, Zap, MapPin } from 'lucide-react';
import { db } from '../../firebase';
import { supabase } from '../../supabase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy, getDoc, where, getDocs } from 'firebase/firestore';
import { Product, SizeChart, SizeData as SizeDataInterface } from '../../types/shop';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Timestamp } from 'firebase/firestore';
import { JERSEY_CHILD, SHORTS_CHILD, JERSEY_ADULT, SHORTS_ADULT, PANTS_CHILD } from '../../constants/sizeCharts';

const AdminShop: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
    const [specRows, setSpecRows] = useState<{ id: string; key: string; value: string }[]>([]);

    // Image States
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Gallery States
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

    // Color Images States
    const [colorImageFiles, setColorImageFiles] = useState<Record<string, File>>({});
    const [colorImagePreviews, setColorImagePreviews] = useState<Record<string, string>>({});

    const [isSaving, setIsSaving] = useState(false);

    // Tabs & Filters
    const [mainTab, setMainTab] = useState<'products' | 'orders' | 'verification' | 'sizes' | 'size-charts'>('products');
    const [activeTab, setActiveTab] = useState<'info' | 'media' | 'stock' | 'extra'>('info');
    const [selectedCategory, setSelectedCategory] = useState<string>('Все');
    const [customColor, setCustomColor] = useState('');
    const [customSize, setCustomSize] = useState('');
    const [sizeCharts, setSizeCharts] = useState<SizeChart[]>([]);
    const [isEditingSizeChart, setIsEditingSizeChart] = useState(false);
    const [currentSizeChart, setCurrentSizeChart] = useState<Partial<SizeChart>>({});
    const [chartImageFile, setChartImageFile] = useState<File | null>(null);
    const [chartImagePreview, setChartImagePreview] = useState<string | null>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [orderSearchTerm, setOrderSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [groupFilter, setGroupFilter] = useState('all');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
    const [verificationSearchTerm, setVerificationSearchTerm] = useState('');
    const [foundOrder, setFoundOrder] = useState<any>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const scannerRef = React.useRef<Html5QrcodeScanner | null>(null);

    const orderStats = {
        totalRevenue: orders
            .filter(o => !['cancelled', 'failed'].includes(o.status))
            .reduce((acc, o) => acc + (o.totalAmount || 0), 0),
        totalOrders: orders.length,
        readyForPickup: orders.filter(o => o.status === 'ready_for_pickup').length
    };

    const categories = ['Все', 'Экипировка', 'Форма', 'Аксессуары', 'Сувениры'];

    // Initial Fetch - Products in Real Time
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(list);
            if (mainTab === 'products') setLoading(false);
        }, (error) => {
            console.error("Error fetching products:", error);
            if (mainTab === 'products') setLoading(false);
        });

        return () => unsubscribe();
    }, [mainTab]);

    // Initial Fetch - Orders
    useEffect(() => {
        if (mainTab !== 'orders') return;
        setLoading(true);

        let ordersData: any[] = [];
        let shopOrdersData: any[] = [];

        const updateOrders = () => {
            const combined = [...ordersData, ...shopOrdersData];
            // Remove duplicates by ID and sort by date
            const uniqueOrders = Array.from(new Map(combined.map(item => [item.id, item])).values());
            uniqueOrders.sort((a, b) => {
                const dateA = a.date?.seconds || a.createdAt?.seconds || 0;
                const dateB = b.date?.seconds || b.createdAt?.seconds || 0;
                return dateB - dateA;
            });
            setOrders(uniqueOrders);
            setLoading(false);
        };

        const q1 = query(collection(db, 'orders'), where('type', '==', 'shop_order'));
        const q2 = query(collection(db, 'shop_orders'));

        const unsubscribe1 = onSnapshot(q1, (snapshot) => {
            ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateOrders();
        });

        const unsubscribe2 = onSnapshot(q2, (snapshot) => {
            shopOrdersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateOrders();
        });

        return () => {
            unsubscribe1();
            unsubscribe2();
        };
    }, [mainTab]);

    // Initial Fetch - Size Charts
    useEffect(() => {
        const q = query(collection(db, 'size_charts'), orderBy('name', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setSizeCharts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SizeChart)));
        });
        return () => unsubscribe();
    }, []);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setGalleryFiles(prev => [...prev, ...files]);
            const newPreviews = files.map((file: any) => URL.createObjectURL(file));
            setGalleryPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeGalleryImage = (index: number) => {
        setGalleryFiles(prev => prev.filter((_, i) => i !== index));
        setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingGalleryImage = (urlToRemove: string) => {
        if (currentProduct.gallery) {
            setCurrentProduct({
                ...currentProduct,
                gallery: currentProduct.gallery.filter(url => url !== urlToRemove)
            });
        }
    };

    // Helper to upload to Supabase
    const uploadToSupabase = async (file: File, folder: string): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        const { data, error } = await supabase.storage
            .from('shop-products')
            .upload(filePath, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('shop-products')
            .getPublicUrl(filePath);

        return publicUrl;
    };

    // Helper to compress image to Blob for Supabase
    const compressToBlob = (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200; // Better quality for Supabase
                    const MAX_HEIGHT = 1200;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Canvas to Blob failed'));
                    }, 'image/jpeg', 0.85);
                };
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const verifyOrder = async () => {
        if (!verificationSearchTerm.trim()) return;
        setIsVerifying(true);
        setFoundOrder(null);
        try {
            const q = query(collection(db, 'orders'), where('type', '==', 'shop_order'));
            const snapshot = await getDocs(q);
            const term = verificationSearchTerm.trim().toUpperCase();

            // Search by last 6 chars of ID OR full ID
            const orderDoc = snapshot.docs.find(doc =>
                doc.id.slice(-6).toUpperCase() === term ||
                doc.id.toUpperCase() === term
            );

            if (orderDoc) {
                setFoundOrder({ id: orderDoc.id, ...orderDoc.data() });
            }
        } catch (error) {
            console.error("Verification error:", error);
        } finally {
            setIsVerifying(false);
        }
    };


    useEffect(() => {
        if (isScanning) {
            scannerRef.current = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            );

            scannerRef.current.render(
                (decodedText) => {
                    setVerificationSearchTerm(decodedText);
                    setIsScanning(false);
                    if (scannerRef.current) {
                        scannerRef.current.clear();
                    }
                },
                (error) => {
                    // console.warn(error);
                }
            );
        } else {
            if (scannerRef.current) {
                scannerRef.current.clear();
                scannerRef.current = null;
            }
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear();
            }
        };
    }, [isScanning]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            let imageUrl = currentProduct.imageUrl || '';
            let galleryUrls = currentProduct.gallery || [];

            // Upload Main Image to Supabase
            if (imageFile) {
                const blob = await compressToBlob(imageFile);
                imageUrl = await uploadToSupabase(new File([blob], imageFile.name, { type: 'image/jpeg' }), 'main');
            }

            // Upload Gallery Images to Supabase
            if (galleryFiles.length > 0) {
                const newUrls = await Promise.all(galleryFiles.map(async (file) => {
                    const blob = await compressToBlob(file);
                    return uploadToSupabase(new File([blob], file.name, { type: 'image/jpeg' }), 'gallery');
                }));
                galleryUrls = [...galleryUrls, ...newUrls];
            }

            // Upload Color Images to Supabase
            const newColorImages: Record<string, string> = { ...(currentProduct.colorImages || {}) };
            for (const color of Object.keys(colorImageFiles)) {
                const file = colorImageFiles[color];
                const blob = await compressToBlob(file);
                newColorImages[color] = await uploadToSupabase(new File([blob], file.name, { type: 'image/jpeg' }), 'colors');
            }

            const finalSpecs: Record<string, string> = {};
            specRows.forEach(row => {
                const k = row.key ? row.key.trim() : '';
                const v = row.value !== undefined && row.value !== null ? String(row.value).trim() : '';
                if (k && v) {
                    finalSpecs[k] = v;
                }
            });

            const productData = {
                title: currentProduct.title || '',
                price: Number(currentProduct.price) || 0,
                oldPrice: Number(currentProduct.oldPrice) || 0,
                isHidden: !!currentProduct.isHidden,
                badges: currentProduct.badges || [],
                stock: currentProduct.stock || {},
                category: currentProduct.category || 'Экипировка',
                description: currentProduct.description || '',
                imageUrl,
                colors: currentProduct.colors || [],
                colorImages: newColorImages,
                sizes: currentProduct.sizes || [],
                gallery: galleryUrls,
                specifications: finalSpecs,
                isCustomizable: !!currentProduct.isCustomizable,
                isMadeToOrder: !!currentProduct.isMadeToOrder,
                lowStockThreshold: Number(currentProduct.lowStockThreshold) || 3,
                productionTime: currentProduct.productionTime || '',
                deliveryInfo: currentProduct.deliveryInfo || '',
                sizeChartUrl: currentProduct.sizeChartUrl || '',
                orderLink: currentProduct.orderLink || '',
                updatedAt: serverTimestamp()
            };

            if (currentProduct.id) {
                await updateDoc(doc(db, 'products', currentProduct.id), productData);
            } else {
                await addDoc(collection(db, 'products'), {
                    ...productData,
                    createdAt: serverTimestamp()
                });
            }

            setIsEditing(false);
            setCurrentProduct({});
            setSpecRows([]);
            setImageFile(null);
            setImagePreview(null);
            setGalleryFiles([]);
            setGalleryPreviews([]);
            setColorImageFiles({});
            setColorImagePreviews({});
        } catch (error: any) {
            console.error("Error saving product:", error);
            // Using alert for admin as a simple fallback, but we could add a better UI here
            alert(`Ошибка при сохранении: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleClone = async (product: Product) => {
        try {
            const { id, createdAt, updatedAt, ...rest } = product;
            const clonedData = {
                ...rest,
                title: `${rest.title} (Копия)`,
                isHidden: true, // Hide by default
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            await addDoc(collection(db, 'products'), clonedData);
            // Optionally open the clone for editing
        } catch (error) {
            console.error("Error cloning product:", error);
            alert("Ошибка при клонировании товара");
        }
    };

    const toggleProductVisibility = async (product: Product) => {
        try {
            const productRef = doc(db, 'products', product.id);
            await updateDoc(productRef, {
                isHidden: !product.isHidden,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error toggling visibility:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Вы уверены, что хотите удалить этот товар?')) {
            try {
                await deleteDoc(doc(db, 'products', id));
            } catch (error) {
                console.error("Error deleting product:", error);
            }
        }
    };

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        setIsUpdatingStatus(orderId);
        try {
            // Check in which collection the order exists
            const orderRef = doc(db, 'orders', orderId);
            const shopOrderRef = doc(db, 'shop_orders', orderId);

            const [orderSnap, shopOrderSnap] = await Promise.all([
                getDoc(orderRef),
                getDoc(shopOrderRef)
            ]);

            if (orderSnap.exists()) {
                await updateDoc(orderRef, {
                    status: newStatus,
                    trackingUpdateAt: serverTimestamp()
                });
            } else if (shopOrderSnap.exists()) {
                await updateDoc(shopOrderRef, {
                    status: newStatus,
                    trackingUpdateAt: serverTimestamp()
                });
            }

            // Add notification for the user
            const order = orders.find(o => o.id === orderId);
            if (order && order.userId) {
                await addDoc(collection(db, 'notifications'), {
                    userId: order.userId,
                    title: 'Статус заказа изменен 📦',
                    message: `Статус вашего заказа #${orderId.slice(0, 8)} обновлен на: ${newStatus}`,
                    type: 'order',
                    isRead: false,
                    createdAt: serverTimestamp()
                });
            }
        } catch (error) {
            console.error("Error updating order status:", error);
        } finally {
            setIsUpdatingStatus(null);
        }
    };

    const migrateInitialSizeCharts = async () => {
        if (!window.confirm('Перенести текущие константы таблиц размеров в базу данных? Это заменит существующие записи с такими же ID.')) return;
        setIsSaving(true);
        try {
            const initialCharts: SizeChart[] = [
                {
                    id: 'jersey-child',
                    name: 'Олимпийка Юниор',
                    type: 'jersey',
                    category: 'child',
                    imageUrl: '/images/size-charts/jersey-child.png',
                    disclaimers: ['Свобода облегания +10см', 'Погрешность 1-2см'],
                    measurements: JERSEY_CHILD as any
                },
                {
                    id: 'shorts-child',
                    name: 'Шорты Юниор',
                    type: 'shorts',
                    category: 'child',
                    imageUrl: '/images/size-charts/shorts-child.png',
                    disclaimers: ['Свобода облегания +10см', 'Погрешность 1-2см', 'Таблица актуальна как для шорт, так и для брюк'],
                    measurements: SHORTS_CHILD as any
                },
                {
                    id: 'pants-child',
                    name: 'Штаны Юниор',
                    type: 'pants',
                    category: 'child',
                    imageUrl: '/images/size-charts/pants-child.jpg',
                    disclaimers: ['Свобода облегания +10см', 'Погрешность 1-2см'],
                    measurements: PANTS_CHILD as any
                },
                {
                    id: 'jersey-adult',
                    name: 'Олимпийка Взрослая',
                    type: 'jersey',
                    category: 'adult',
                    imageUrl: '/images/size-charts/jersey-adult.png',
                    disclaimers: ['Свобода облегания +10см', 'Погрешность 1-2см'],
                    measurements: JERSEY_ADULT as any
                },
                {
                    id: 'shorts-adult',
                    name: 'Шорты Взрослые',
                    type: 'shorts',
                    category: 'adult',
                    imageUrl: '/images/size-charts/shorts-adult.png',
                    disclaimers: ['Свобода облегания +10см', 'Погрешность 1-2см'],
                    measurements: SHORTS_ADULT as any
                }
            ];

            for (const chart of initialCharts) {
                await updateDoc(doc(db, 'size_charts', chart.id), {
                    ...chart,
                    updatedAt: serverTimestamp()
                }).catch(async () => {
                    await addDoc(collection(db, 'size_charts'), {
                        ...chart,
                        updatedAt: serverTimestamp()
                    });
                });
            }
            alert('Миграция успешно завершена!');
        } catch (error: any) {
            console.error("Migration error:", error);
            alert(`Ошибка миграции: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSizeChart = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            let imageUrl = currentSizeChart.imageUrl || '';
            if (chartImageFile) {
                const blob = await compressToBlob(chartImageFile);
                imageUrl = await uploadToSupabase(new File([blob], chartImageFile.name, { type: 'image/jpeg' }), 'size-charts');
            }

            const chartData = {
                ...currentSizeChart,
                imageUrl,
                updatedAt: serverTimestamp()
            };

            if (currentSizeChart.id) {
                const { id, ...rest } = chartData;
                await updateDoc(doc(db, 'size_charts', id), rest);
            } else {
                const newId = `${chartData.type}-${chartData.category}-${Date.now()}`;
                await updateDoc(doc(db, 'size_charts', newId), { ...chartData, id: newId });
            }

            setIsEditingSizeChart(false);
            setCurrentSizeChart({});
            setChartImageFile(null);
            setChartImagePreview(null);
        } catch (error: any) {
            console.error("Error saving size chart:", error);
            alert(`Ошибка при сохранении: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const updateEstimatedArrival = async (orderId: string, arrivalDate: string) => {
        try {
            await updateDoc(doc(db, 'orders', orderId), {
                estimatedArrival: arrivalDate,
                trackingUpdateAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating arrival date:", error);
        }
    };

    const updateTrackingInfo = async (orderId: string, trackingNumber: string, trackingUrl: string) => {
        try {
            await updateDoc(doc(db, 'orders', orderId), {
                trackingNumber,
                trackingUrl,
                trackingUpdateAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating tracking info:", error);
        }
    };

    const printGroupManifest = (groupName: string) => {
        const groupOrders = orders.filter(o => o.groupName === groupName && o.status !== 'delivered' && o.status !== 'cancelled');
        if (groupOrders.length === 0) {
            alert('Нет активных заказов для этой группы');
            return;
        }

        let printContent = `
            <html>
            <head>
                <title>Ведомость выдачи заказов - ${groupName}</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    th { bg-color: #f4f4f4; }
                    .header { text-align: center; margin-bottom: 30px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>SPARTA SPORTS CENTER</h1>
                    <h2>Ведомость выдачи заказов: ${groupName}</h2>
                    <p>Дата формирования: ${new Date().toLocaleDateString()}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Спортсмен</th>
                            <th>Заказ / Состав</th>
                            <th>Спецификация</th>
                            <th>Подпись</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${groupOrders.map(o => `
                            <tr>
                                <td>
                                    <strong>${o.childName || o.userName}</strong>
                                    ${o.phone ? `<br><small style="color: #666;">${o.phone}</small>` : ''}
                                </td>
                                <td>
                                    ${o.items.map((i: any) => `
                                        <div style="margin-bottom: 8px;">
                                            <strong>${i.title}</strong> (${i.quantity} шт)
                                            ${i.customName ? `<br><span style="font-size: 10px; color: #555;">ИМЯ: ${i.customName}</span>` : ''}
                                            ${i.customNumber ? `<br><span style="font-size: 10px; color: #555;">НОМЕР: ${i.customNumber}</span>` : ''}
                                        </div>
                                    `).join('')}
                                </td>
                                <td>
                                    ${o.items.map((i: any) => `
                                        <div style="margin-bottom: 8px;">
                                            ${i.size || '-'} / ${i.color || '-'}
                                            ${i.measurements ? `<br><span style="font-size: 10px; color: #777;">${Object.entries(i.measurements).map(([k, v]) => `${k}: ${v}`).join(', ')}</span>` : ''}
                                        </div>
                                    `).join('')}
                                </td>
                                <td style="width: 120px;"></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.print();
        }
    };

    const addSpecRow = () => {
        setSpecRows(prev => [...prev, { id: Math.random().toString(36).substring(2, 9), key: '', value: '' }]);
    };

    const addSpecPreset = (presetKey: string, presetVal: string) => {
        setSpecRows(prev => {
            const existing = prev.find(p => p.key.trim().toLowerCase() === presetKey.toLowerCase());
            if (existing) {
                return prev.map(p => p.id === existing.id ? { ...p, value: presetVal } : p);
            }
            return [...prev, { id: Math.random().toString(36).substring(2, 9), key: presetKey, value: presetVal }];
        });
    };

    const updateSpecKey = (id: string, newKey: string) => {
        setSpecRows(prev => prev.map(item => item.id === id ? { ...item, key: newKey } : item));
    };

    const updateSpecValue = (id: string, newValue: string) => {
        setSpecRows(prev => prev.map(item => item.id === id ? { ...item, value: newValue } : item));
    };

    const removeSpecRow = (id: string) => {
        setSpecRows(prev => prev.filter(item => item.id !== id));
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'Все' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const calculateTotalStock = (product: Product): number => {
        if (typeof product.stock === 'number') return product.stock;
        if (typeof product.stock === 'object' && product.stock !== null) {
            return Object.values(product.stock as Record<string, number>).reduce((a: number, b: number) => a + (Number(b) || 0), 0);
        }
        return 0;
    };

    const filteredOrders = orders.filter((o: any) => {
        const matchesSearch = (o.id || '').toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
            (o.childName && o.childName.toLowerCase().includes(orderSearchTerm.toLowerCase())) ||
            (o.userName && o.userName.toLowerCase().includes(orderSearchTerm.toLowerCase())) ||
            (o.email && o.email.toLowerCase().includes(orderSearchTerm.toLowerCase())) ||
            o.items?.some((item: any) =>
                (item.title || '').toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
                (item.customName && item.customName.toLowerCase().includes(orderSearchTerm.toLowerCase())) ||
                (item.customNumber && item.customNumber.toString().includes(orderSearchTerm))
            );
        const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
        const matchesGroup = groupFilter === 'all' || (o.groupName || 'Без группы') === groupFilter;
        return matchesSearch && matchesStatus && matchesGroup;
    });

    const uniqueGroups = Array.from(new Set(orders.map(o => o.groupName || 'Без группы').filter(Boolean)));

    return (
        <div className="p-6 md:p-8 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 bg-[#111] p-6 rounded-3xl border border-white/5 shadow-2xl">
                <div>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600 mb-2 flex items-center gap-3">
                        <ShoppingBag className="text-yellow-500" />
                        Sparta Shop Admin
                    </h1>
                    <div className="flex gap-4 mt-4">
                        <button
                            onClick={() => setMainTab('products')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all border ${mainTab === 'products'
                                ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20'
                                : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10 hover:text-white'}`}
                        >
                            <Package size={18} />
                            Товары
                        </button>
                        <button
                            onClick={() => setMainTab('orders')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all border ${mainTab === 'orders'
                                ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20'
                                : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10 hover:text-white'}`}
                        >
                            <Truck size={18} />
                            Заказы
                            {orders.filter(o => o.status === 'new').length > 0 && (
                                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] text-white">
                                    {orders.filter(o => o.status === 'new').length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setMainTab('size-charts')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all border ${mainTab === 'size-charts'
                                ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/20'
                                : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10 hover:text-white'}`}
                        >
                            <List size={18} />
                            Таблицы размеров
                        </button>
                    </div>
                </div>

                {mainTab === 'products' && (
                    <div className="flex gap-4">
                        <button
                            onClick={async () => {
                                if (!window.confirm('Обновить коллекцию Sparta? Старые товары этой серии будут удалены.')) return;
                                try {
                                    setIsSaving(true);
                                    const specificTitles = [
                                        'Игровая форма Sparta (Зеленая)',
                                        'Игровая форма Sparta (Серая)',
                                        'Парадный костюм Sparta',
                                        'Рюкзак Sparta',
                                        'Шапка и Снуд Sparta',
                                        'Пуховик Sparta "Classic" (Черный)',
                                        'Пуховик Sparta "Lion" (Черный)',
                                        'Пуховик Sparta "Lion" (Зеленый)'
                                    ];
                                    const allSnap = await getDocs(collection(db, 'products'));
                                    for (const doc of allSnap.docs) {
                                        if (specificTitles.includes(doc.data().title)) {
                                            await deleteDoc(doc.ref);
                                        }
                                    }

                                    const spartaProducts = [
                                        {
                                            title: 'Игровая форма Sparta (Зеленая)',
                                            price: 4500,
                                            category: 'Форма',
                                            isCustomizable: true,
                                            description: 'Фирменная игровая форма Sparta. Индивидуальный пошив. В комплекте: футболка и шорты.',
                                            sizes: ['116', '122', '128', '134', '140', '146', '152', '158', 'S', 'M', 'L'],
                                            stock: { '116': 10, '122': 10, '128': 10, '134': 10, '140': 10, '146': 10, '152': 10, '158': 10, 'S': 10, 'M': 10, 'L': 10 },
                                            imageUrl: '/shop/sparta-uniform-green.png',
                                            sizeChartUrl: '/shop/size-charts/kids-tshirt.png',
                                            badges: ['new', 'hit']
                                        },
                                        {
                                            title: 'Игровая форма Sparta (Серая)',
                                            price: 4500,
                                            category: 'Форма',
                                            isCustomizable: true,
                                            description: 'Фирменная игровая форма Sparta в сером цвете. Индивидуальный пошив. Премиальное качество.',
                                            sizes: ['116', '122', '128', '134', '140', '146', '152', '158', 'S', 'M', 'L'],
                                            stock: { '116': 10, '122': 10, '128': 10, '134': 10, '140': 10, '146': 10, '152': 10, '158': 10, 'S': 10, 'M': 10, 'L': 10 },
                                            imageUrl: '/shop/sparta-uniform-grey.png',
                                            sizeChartUrl: '/shop/size-charts/kids-tshirt.png',
                                            badges: ['new']
                                        },
                                        {
                                            title: 'Парадный костюм Sparta',
                                            price: 6500,
                                            category: 'Форма',
                                            isCustomizable: true,
                                            description: 'Стильный парадный костюм для спортсменов. Подходит для тренировок и поездок.',
                                            sizes: ['116', '122', '128', '134', '140', '146', '152', '158', 'S', 'M', 'L'],
                                            stock: { '116': 5, '122': 5, '128': 5, '134': 5, '140': 5, '146': 5, '152': 5, '158': 5, 'S': 5, 'M': 5, 'L': 5 },
                                            imageUrl: '/shop/sparta-tracksuit.png',
                                            sizeChartUrl: '/shop/size-charts/kids-tshirt.png'
                                        },
                                        {
                                            title: 'Рюкзак Sparta',
                                            price: 3500,
                                            category: 'Аксессуары',
                                            isCustomizable: false,
                                            description: 'Вместительный и надежный рюкзак для спортивной формы и мяча.',
                                            stock: { 'N/A': 50 },
                                            imageUrl: '/shop/sparta-backpack.png'
                                        },
                                        {
                                            title: 'Шапка и Снуд Sparta',
                                            price: 2200,
                                            category: 'Аксессуары',
                                            isCustomizable: false,
                                            description: 'Теплый комплект для тренировок в холодное время года.',
                                            stock: { 'N/A': 30 },
                                            imageUrl: '/shop/sparta-hat-snood.png'
                                        },
                                        {
                                            title: 'Пуховик Sparta "Classic" (Черный)',
                                            price: 8900,
                                            category: 'Экипировка',
                                            isCustomizable: false,
                                            description: 'Теплый зимний куртка-пуховик Sparta для тренировок и сборов в зимний период.',
                                            stock: { 'S': 15, 'M': 20, 'L': 25, 'XL': 15, 'XXL': 10 },
                                            imageUrl: '/shop/sparta-puff-black.png',
                                            badges: ['new']
                                        },
                                        {
                                            title: 'Пуховик Sparta "Lion" (Черный)',
                                            price: 13900,
                                            category: 'Экипировка',
                                            isCustomizable: false,
                                            description: 'Эксклюзивный пуховик Sparta серии Lion с золотым гербом и контрастной подкладкой.',
                                            stock: { 'S': 10, 'M': 15, 'L': 20, 'XL': 10 },
                                            imageUrl: '/shop/sparta-puff-lion-black.png',
                                            badges: ['new']
                                        },
                                        {
                                            title: 'Пуховик Sparta "Lion" (Зеленый)',
                                            price: 13900,
                                            category: 'Экипировка',
                                            isCustomizable: false,
                                            description: 'Эксклюзивный пуховик Sparta серии Lion в зеленом цвете с фирменной спортивной эмблемой.',
                                            stock: { 'S': 10, 'M': 15, 'L': 20, 'XL': 10 },
                                            imageUrl: '/shop/sparta-puff-lion-green.png',
                                            badges: ['new', 'hit']
                                        }
                                    ];

                                    for (const p of spartaProducts) {
                                        await addDoc(collection(db, 'products'), {
                                            ...p,
                                            createdAt: serverTimestamp(),
                                            updatedAt: serverTimestamp(),
                                            isHidden: false,
                                            colors: [],
                                            colorImages: {},
                                            gallery: [],
                                            specifications: { 'Материал': 'Спортивный полиэстер', 'Производство': 'Россия' }
                                        });
                                    }
                                    alert('Коллекция Sparta успешно обновлена!');
                                } catch (error) {
                                    console.error(error);
                                    alert('Ошибка при обновлении коллекции');
                                } finally {
                                    setIsSaving(false);
                                }
                            }}
                            className="flex items-center gap-2 bg-black hover:bg-white/10 text-yellow-500 px-6 py-4 rounded-2xl font-black transition-all border border-yellow-500/30 uppercase tracking-tighter"
                        >
                            <RotateCcw size={18} />
                            КОЛЛЕКЦИЯ
                        </button>
                        <button
                            onClick={() => {
                                setCurrentProduct({ category: 'Экипировка', specifications: {}, isHidden: false, badges: [], stock: {}, isCustomizable: false });
                                setSpecRows([]);
                                setImagePreview(null);
                                setImageFile(null);
                                setGalleryFiles([]);
                                setGalleryPreviews([]);
                                setColorImageFiles({});
                                setColorImagePreviews({});
                                setIsEditing(true);
                            }}
                            className="flex items-center gap-2 bg-sparta-gold hover:bg-yellow-400 text-black px-8 py-4 rounded-2xl font-black transition-all transform hover:scale-105 shadow-xl shadow-yellow-500/20 uppercase tracking-tighter"
                        >
                            <Plus size={22} strokeWidth={3} />
                            Добавить Товар
                        </button>
                    </div>
                )}

                {mainTab === 'size-charts' && (
                    <div className="flex gap-4">
                        <button
                            onClick={migrateInitialSizeCharts}
                            className="flex items-center gap-2 bg-black hover:bg-white/10 text-blue-400 px-6 py-4 rounded-2xl font-black transition-all border border-blue-500/30 uppercase tracking-tighter"
                        >
                            <RotateCcw size={18} />
                            МИГРАЦИЯ
                        </button>
                        <button
                            onClick={() => {
                                setCurrentSizeChart({
                                    name: '',
                                    type: 'jersey',
                                    category: 'child',
                                    measurements: [],
                                    disclaimers: ['Свобода облегания +10см', 'Погрешность 1-2см']
                                });
                                setChartImagePreview(null);
                                setChartImageFile(null);
                                setIsEditingSizeChart(true);
                            }}
                            className="flex items-center gap-2 bg-sparta-gold hover:bg-yellow-400 text-black px-8 py-4 rounded-2xl font-black transition-all transform hover:scale-105 shadow-xl shadow-yellow-500/20 uppercase tracking-tighter"
                        >
                            <Plus size={22} strokeWidth={3} />
                            Добавить Таблицу
                        </button>
                    </div>
                )}
            </div>

            {/* Tab Content */}
            {mainTab === 'size-charts' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sizeCharts.map(chart => (
                        <motion.div
                            key={chart.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden group hover:border-blue-500/50 transition-all shadow-xl"
                        >
                            <div className="relative h-48 bg-black/40 flex items-center justify-center overflow-hidden">
                                {chart.imageUrl ? (
                                    <img src={chart.imageUrl} alt={chart.name} className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <ImageIcon className="text-white/20" size={48} />
                                )}
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => {
                                            setCurrentSizeChart(chart);
                                            setIsEditingSizeChart(true);
                                        }}
                                        className="p-2 bg-white text-black rounded-lg hover:bg-blue-500 hover:text-white transition-colors shadow-lg"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (window.confirm('Удалить эту таблицу?')) {
                                                await deleteDoc(doc(db, 'size_charts', chart.id));
                                            }
                                        }}
                                        className="p-2 bg-white text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors shadow-lg"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="absolute bottom-4 left-4 flex gap-2">
                                    <span className="px-3 py-1 bg-blue-500 text-white text-[10px] font-black uppercase rounded-full">
                                        {chart.type}
                                    </span>
                                    <span className="px-3 py-1 bg-white/10 text-white text-[10px] font-black uppercase border border-white/20 rounded-full backdrop-blur-md">
                                        {chart.category === 'child' ? 'Юниор' : 'Взрослый'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-6">
                                <h3 className="text-white font-black uppercase tracking-tight mb-2 truncate">{chart.name}</h3>
                                <p className="text-gray-500 text-xs font-bold uppercase truncate">
                                    Строк замеров: {chart.measurements?.length || 0}
                                </p>
                            </div>
                        </motion.div>
                    ))}

                    {sizeCharts.length === 0 && !loading && (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                            <Layers className="mx-auto text-white/5 mb-4" size={64} />
                            <p className="text-gray-500 font-black uppercase tracking-widest">Таблицы не найдены</p>
                            <button
                                onClick={migrateInitialSizeCharts}
                                className="mt-4 text-blue-400 font-bold hover:underline"
                            >
                                Нажмите здесь для миграции начальных данных
                            </button>
                        </div>
                    )}
                </div>
            ) : mainTab === 'products' ? (
                <>
                    {/* Filters & Search */}
                    <div className="flex flex-col lg:flex-row gap-6 mb-8">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Поиск товаров..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors"
                            />
                        </div>

                        {/* Categories */}
                        <div className="flex overflow-x-auto pb-2 lg:pb-0 gap-2 no-scrollbar">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${selectedCategory === cat
                                        ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Products Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <AnimatePresence>
                            {filteredProducts.map(product => {
                                const totalStock = calculateTotalStock(product);
                                return (
                                    <motion.div
                                        key={product.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className={`bg-black/40 border ${product.isHidden ? 'border-red-500/20 grayscale-[0.5]' : 'border-white/5'} rounded-2xl overflow-hidden group hover:border-yellow-500/30 transition-all relative flex flex-col`}
                                    >
                                        <div className="relative h-48 bg-white/5 overflow-hidden">
                                            {product.imageUrl ? (
                                                <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                    <ImageIcon size={48} />
                                                </div>
                                            )}

                                            {/* Quick Info Overlays */}
                                            <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
                                                {product.badges?.includes('hit') && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded shadow-sm uppercase tracking-wider">
                                                        <Flame size={10} className="fill-white" />
                                                        <span>ХИТ</span>
                                                    </span>
                                                )}
                                                {product.badges?.includes('new') && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white text-[10px] font-black rounded shadow-sm uppercase tracking-wider">
                                                        <Sparkles size={10} className="fill-white" />
                                                        <span>NEW</span>
                                                    </span>
                                                )}
                                                {product.badges?.includes('last_chance') && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500 text-white text-[10px] font-black rounded shadow-sm uppercase tracking-wider">
                                                        <Zap size={10} className="fill-white" />
                                                        <span>ШАНС</span>
                                                    </span>
                                                )}
                                                {product.isCustomizable && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-black text-[10px] font-black rounded shadow-sm uppercase tracking-wider">
                                                        <Sparkles size={10} className="fill-black" />
                                                        <span>ПОШИВ</span>
                                                    </span>
                                                )}
                                            </div>

                                            {/* Stock Badge */}
                                            <div className={`absolute bottom-2 right-2 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider backdrop-blur-md border ${
                                                product.isMadeToOrder
                                                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                                                    : totalStock === 0
                                                        ? 'bg-red-500/20 border-red-500/50 text-red-500'
                                                        : totalStock <= (product.lowStockThreshold || 3)
                                                            ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                                                            : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                            }`}>
                                                {product.isMadeToOrder ? '🧵 Под заказ' : `Склад: ${totalStock} шт`}
                                            </div>

                                            {/* Action Buttons Overlay */}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-30">
                                                <button
                                                    onClick={() => {
                                                        setCurrentProduct(product);
                                                        const initialSpecs = Object.entries(product.specifications || {}).map(([k, v]) => ({
                                                            id: Math.random().toString(36).substring(2, 9),
                                                            key: k,
                                                            value: String(v)
                                                        }));
                                                        setSpecRows(initialSpecs);
                                                        setImagePreview(product.imageUrl);
                                                        setGalleryFiles([]);
                                                        setGalleryPreviews([]);
                                                        setActiveTab('info');
                                                        setIsEditing(true);
                                                    }}
                                                    className="p-3 bg-yellow-500 text-black rounded-xl hover:scale-110 transition-transform shadow-lg"
                                                    title="Редактировать"
                                                >
                                                    <Edit2 size={20} />
                                                </button>
                                                <button
                                                    onClick={() => handleClone(product)}
                                                    className="p-3 bg-blue-500 text-white rounded-xl hover:scale-110 transition-transform shadow-lg"
                                                    title="Дублировать"
                                                >
                                                    <Copy size={20} />
                                                </button>
                                                <button
                                                    onClick={() => toggleProductVisibility(product)}
                                                    className={`p-3 rounded-xl hover:scale-110 transition-transform shadow-lg ${product.isHidden ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}
                                                    title={product.isHidden ? "Показать" : "Скрыть"}
                                                >
                                                    {product.isHidden ? <Eye size={20} /> : <EyeOff size={20} />}
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(product.id);
                                                    }}
                                                    className="p-3 bg-red-500/80 hover:bg-red-500 text-white rounded-xl hover:scale-110 transition-transform shadow-lg z-50"
                                                    title="Удалить"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-4 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start gap-2 mb-2">
                                                <h3 className="font-black text-white leading-tight uppercase tracking-tight line-clamp-2">{product.title}</h3>
                                                <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-1 rounded uppercase shrink-0">{product.category}</span>
                                            </div>
                                            <div className="mt-auto flex items-center gap-3">
                                                <span className="text-yellow-500 font-mono font-black text-xl">{product.price.toLocaleString()} ₽</span>
                                                {product.oldPrice && product.oldPrice > product.price && (
                                                    <span className="text-gray-600 line-through text-xs font-bold">{product.oldPrice.toLocaleString()} ₽</span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </>
            ) : mainTab === 'orders' ? (
                <div className="space-y-6">
                    {/* Verification Tool */}
                    <div className="bg-sparta-gold/10 border border-sparta-gold/30 p-6 rounded-3xl shadow-xl shadow-sparta-gold/5">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sparta-gold text-[10px] font-black uppercase tracking-[0.2em] mb-3 ml-2">Выдача по коду (QR / Цифры)</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sparta-gold/60"><Copy size={20} /></div>
                                    <input
                                        type="text"
                                        placeholder="Введите код (последние 6 знаков) или сканируйте..."
                                        value={verificationSearchTerm}
                                        onChange={(e) => setVerificationSearchTerm(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && verifyOrder()}
                                        className="w-full bg-black/60 border border-sparta-gold/20 rounded-2xl py-4 pl-14 pr-4 text-white font-mono text-lg focus:outline-none focus:border-sparta-gold shadow-inner"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <button
                                    onClick={() => setIsScanning(!isScanning)}
                                    className={`h-[60px] px-6 rounded-2xl font-black transition-all flex items-center gap-3 border-2 ${isScanning ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                                >
                                    {isScanning ? <X size={20} /> : <ImageIcon size={20} />}
                                    {isScanning ? 'СТОП' : 'СКАНЕР'}
                                </button>
                                <button
                                    onClick={verifyOrder}
                                    disabled={isVerifying}
                                    className="h-[60px] flex-1 md:flex-none px-8 bg-sparta-gold text-black font-black rounded-2xl hover:bg-yellow-500 transition-all flex items-center gap-3 disabled:opacity-50"
                                >
                                    {isVerifying ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                                    ПРОВЕРИТЬ
                                </button>
                            </div>
                        </div>

                        {isScanning && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-6 overflow-hidden bg-black rounded-2xl border border-white/10"
                            >
                                <div id="reader" className="w-full max-w-sm mx-auto" />
                            </motion.div>
                        )}

                        <AnimatePresence>
                            {foundOrder && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="mt-6 p-6 bg-black/60 rounded-3xl border-2 border-sparta-gold/30 shadow-2xl flex flex-col gap-6"
                                >
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-sparta-gold flex items-center justify-center text-black shadow-lg shadow-sparta-gold/20">
                                                <UserIcon size={32} />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-white uppercase tracking-tight">{foundOrder.userName}</h4>
                                                <p className="text-sparta-gold font-mono text-sm">Заказ #{foundOrder.id.toUpperCase()}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="px-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 font-black uppercase tracking-widest">
                                                Статус: {foundOrder.status}
                                            </div>
                                            <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">
                                                {foundOrder.date?.seconds ? new Date(foundOrder.date.seconds * 1000).toLocaleString('ru-RU') : ''}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Items List */}
                                    <div className="grid gap-3">
                                        <p className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em] mb-1">Состав заказа к выдаче:</p>
                                        {foundOrder.items?.map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-black overflow-hidden border border-white/10 flex-shrink-0">
                                                        {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" /> : <ShoppingBag size={20} className="m-auto text-white/10" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold">{item.title}</p>
                                                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                                            <span className="text-sparta-gold text-[10px] font-black uppercase tracking-tighter">
                                                                {item.quantity} шт • {item.size || '-'} {item.color ? `• ${item.color}` : ''}
                                                            </span>
                                                            {item.customName && (
                                                                <span className="text-blue-400 text-[10px] font-black uppercase tracking-tighter border-l border-white/10 pl-3">
                                                                    ИМЯ: {item.customName}
                                                                </span>
                                                            )}
                                                            {item.customNumber && (
                                                                <span className="text-green-400 text-[10px] font-black uppercase tracking-tighter border-l border-white/10 pl-3">
                                                                    НОМЕР: {item.customNumber}
                                                                </span>
                                                            )}
                                                            {item.measurements && Object.keys(item.measurements).length > 0 && (
                                                                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-tighter border-l border-white/10 pl-3">
                                                                    {Object.entries(item.measurements).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-white font-mono font-bold">{(item.price * item.quantity).toLocaleString()} ₽</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-white/5">
                                        <button
                                            onClick={() => {
                                                updateOrderStatus(foundOrder.id, 'delivered');
                                                setFoundOrder(null);
                                                setVerificationSearchTerm('');
                                            }}
                                            className="flex-1 h-14 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-green-500/20 uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95"
                                        >
                                            <CheckCircle size={24} />
                                            Подтвердить выдачу
                                        </button>
                                        <button
                                            onClick={() => setFoundOrder(null)}
                                            className="px-8 h-14 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white font-black rounded-2xl transition-all uppercase tracking-widest"
                                        >
                                            Закрыть
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Общая выручка</p>
                            <h3 className="text-2xl font-russo text-sparta-gold">{orderStats.totalRevenue.toLocaleString()} ₽</h3>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Всего заказов</p>
                            <h3 className="text-2xl font-russo text-white">{orderStats.totalOrders}</h3>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Готовы к выдаче</p>
                            <h3 className="text-2xl font-russo text-green-500">{orderStats.readyForPickup}</h3>
                        </div>
                    </div>

                    {/* Orders Controls */}
                    <div className="flex flex-col lg:flex-row gap-4 bg-white/5 p-6 rounded-2xl border border-white/10">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Поиск по ID, имени или email..."
                                value={orderSearchTerm}
                                onChange={(e) => setOrderSearchTerm(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-yellow-500/50"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500/50"
                            >
                                <option value="all">Все статусы</option>
                                <option value="new">Новые</option>
                                <option value="processing">В обработке</option>
                                <option value="shipped">Отправлены</option>
                                <option value="ready_for_pickup">Готовы к выдаче</option>
                                <option value="delivered">Доставлены</option>
                                <option value="cancelled">Отменены</option>
                            </select>

                            <select
                                value={groupFilter}
                                onChange={(e) => setGroupFilter(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-500/50"
                            >
                                <option value="all">Все группы</option>
                                {uniqueGroups.map(group => (
                                    <option key={group} value={group}>{group}</option>
                                ))}
                            </select>
                        </div>

                        {/* Print Action */}
                        {groupFilter !== 'all' && (
                            <button
                                onClick={() => printGroupManifest(groupFilter)}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold transition-all border border-white/10"
                            >
                                <Printer size={18} />
                                Печать Ведомости
                            </button>
                        )}
                    </div>

                    {/* Orders List */}
                    <div className="grid gap-4">
                        {filteredOrders.length > 0 ? (
                            filteredOrders.map((order) => {
                                const isAging = order.status === 'new' && order.date?.seconds && (Date.now() / 1000 - order.date.seconds > 86400);

                                return (
                                    <motion.div
                                        key={order.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`bg-theme-card border ${isAging ? 'border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-theme-border'} rounded-2xl p-6 transition-all hover:border-theme-border-gold overflow-hidden relative shadow-lg`}
                                    >
                                        {isAging && (
                                            <div className="absolute top-0 left-0 bg-red-500 text-white text-[8px] font-black px-2 py-0.5 uppercase tracking-widest flex items-center gap-1">
                                                <AlertCircle size={8} /> Просрочен
                                            </div>
                                        )}

                                        <div className="flex flex-col lg:flex-row justify-between gap-6">
                                            {/* Left: User & Main Info */}
                                            <div className="flex gap-4 min-w-0 flex-1">
                                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-500 shrink-0">
                                                    <UserIcon size={24} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-white font-bold">{order.childName || order.userName}</h3>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(order.id);
                                                                setCopiedId(order.id);
                                                                setTimeout(() => setCopiedId(null), 2000);
                                                            }}
                                                            className="text-[10px] bg-theme-field border border-theme-border px-2 py-0.5 rounded text-theme-muted font-mono hover:text-sparta-gold transition-all flex items-center gap-1 active:scale-95"
                                                        >
                                                            {copiedId === order.id ? <Check size={8} className="text-green-500" /> : <Copy size={8} />}
                                                            #{order.id.slice(0, 8).toUpperCase()}
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3 text-xs text-theme-muted">
                                                        <span className="flex items-center gap-1"><Mail size={12} /> {order.email}</span>
                                                        {order.phone && (
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(order.phone);
                                                                    setCopiedId(`phone_${order.id}`);
                                                                    setTimeout(() => setCopiedId(null), 2000);
                                                                }}
                                                                className="flex items-center gap-1 hover:text-sparta-gold transition-all active:scale-95"
                                                            >
                                                                {copiedId === `phone_${order.id}` ? <Check size={10} className="text-green-500" /> : <PhoneIcon size={12} />}
                                                                {order.phone}
                                                            </button>
                                                        )}
                                                        <span className="flex items-center gap-1 text-sparta-gold font-bold"><Users size={12} /> {order.groupName || 'Группа не указана'}</span>
                                                        <span className="flex items-center gap-1"><CalendarIcon size={12} /> {order.date?.seconds ? new Date(order.date.seconds * 1000).toLocaleString() : 'Неизвестно'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Middle: Items */}
                                            <div className="flex-1 bg-theme-field/40 p-4 rounded-xl border border-theme-border">
                                                <p className="text-[10px] uppercase font-bold text-theme-muted mb-2 tracking-widest">Состав заказа</p>
                                                <div className="space-y-2">
                                                    {order.items?.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex flex-col gap-1 py-2 border-b border-theme-border last:border-0 group/item">
                                                            <div className="flex justify-between items-center">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sparta-gold font-bold">{item.quantity}x</span>
                                                                    <span className="text-theme-main font-bold">{item.title}</span>
                                                                </div>
                                                                <p className="text-theme-main font-mono text-xs">{(item.price * item.quantity).toLocaleString()} ₽</p>
                                                            </div>
                                                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                                                <span className="text-[10px] font-black text-theme-muted uppercase tracking-widest">
                                                                    {item.size || '-'} / {item.color || '-'}
                                                                </span>
                                                                {item.customName && (
                                                                    <span className="text-[10px] font-black text-blue-500/80 uppercase tracking-widest border-l border-theme-border pl-3">
                                                                        Имя: {item.customName}
                                                                    </span>
                                                                )}
                                                                {item.customNumber && (
                                                                    <span className="text-[10px] font-black text-green-500/80 uppercase tracking-widest border-l border-theme-border pl-3">
                                                                        # {item.customNumber}
                                                                    </span>
                                                                )}
                                                                {item.measurements && Object.keys(item.measurements).length > 0 && (
                                                                    <span className="text-[10px] font-bold text-theme-muted uppercase tracking-widest border-l border-theme-border pl-3">
                                                                        {Object.entries(item.measurements).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="pt-2 border-t border-theme-border flex justify-between items-center mt-2">
                                                        <p className="text-xs text-theme-muted">Итого:</p>
                                                        <p className="text-lg font-russo text-sparta-gold">{(order.totalAmount || 0).toLocaleString()} ₽</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Actions & Tracking */}
                                            <div className="flex flex-col gap-4 w-full lg:w-64">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 relative">
                                                        <select
                                                            disabled={isUpdatingStatus === order.id}
                                                            value={order.status}
                                                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                                            className={`w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none transition-all ${order.status === 'delivered' ? 'text-green-500 border-green-500/30' :
                                                                order.status === 'ready_for_pickup' ? 'text-orange-500 border-orange-500/30' :
                                                                    'text-white'
                                                                }`}
                                                        >
                                                            <option value="new">Новый</option>
                                                            <option value="processing">В обработке</option>
                                                            <option value="shipped">Отправлен</option>
                                                            <option value="ready_for_pickup">Готов к выдаче</option>
                                                            <option value="delivered">Доставлен</option>
                                                            <option value="cancelled">Отменен</option>
                                                        </select>
                                                        {isUpdatingStatus === order.id && (
                                                            <Loader2 size={14} className="animate-spin absolute right-10 top-3 text-sparta-gold" />
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm('Вы уверены, что хотите удалить этот заказ?')) {
                                                                try {
                                                                    const orderRef = doc(db, 'orders', order.id);
                                                                    const shopOrderRef = doc(db, 'shop_orders', order.id);
                                                                    const [oSnap, sSnap] = await Promise.all([getDoc(orderRef), getDoc(shopOrderRef)]);
                                                                    if (oSnap.exists()) await deleteDoc(orderRef);
                                                                    else if (sSnap.exists()) await deleteDoc(shopOrderRef);
                                                                } catch (error) {
                                                                    console.error("Error deleting order:", error);
                                                                }
                                                            }
                                                        }}
                                                        className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-500/10"
                                                        title="Удалить заказ"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>

                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <p className="text-[10px] uppercase font-bold text-gray-600 mb-2 tracking-widest flex items-center gap-1">
                                                            <ClockIcon size={10} /> Ож. прибытие
                                                        </p>
                                                        <input
                                                            type="date"
                                                            defaultValue={order.estimatedArrival ? (order.estimatedArrival.toDate ? order.estimatedArrival.toDate().toISOString().split('T')[0] : order.estimatedArrival) : ''}
                                                            onChange={(e) => updateEstimatedArrival(order.id, e.target.value)}
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:border-sparta-gold/50"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <p className="text-[10px] uppercase font-bold text-gray-600 mb-2 tracking-widest">Трек-номер</p>
                                                        <input
                                                            type="text"
                                                            placeholder="Номер"
                                                            defaultValue={order.trackingNumber || ''}
                                                            onBlur={(e) => updateTrackingInfo(order.id, e.target.value, order.trackingUrl || '')}
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:border-sparta-gold/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase font-bold text-gray-600 mb-2 tracking-widest">Ссылка</p>
                                                        <input
                                                            type="text"
                                                            placeholder="URL"
                                                            defaultValue={order.trackingUrl || ''}
                                                            onBlur={(e) => updateTrackingInfo(order.id, order.trackingNumber || '', e.target.value)}
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:border-sparta-gold/50"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="py-20 text-center bg-white/5 border border-dashed border-white/10 rounded-2xl flex flex-col items-center">
                                <ShoppingBag size={64} className="text-white/10 mb-4" />
                                <h3 className="text-xl text-white font-bold">Заказы не найдены</h3>
                                <p className="text-gray-500 mt-2">Попробуйте изменить параметры поиска или фильтры</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}

            {loading && (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-yellow-500" size={48} />
                </div>
            )}

            {/* Edit Modal */}
            <AnimatePresence>
                {isEditing && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                        >
                            <form onSubmit={handleSave} className="flex flex-col h-[80vh]">
                                {/* Tabs Navigation */}
                                <div className="flex px-6 border-b border-white/5 bg-black/20">
                                    {[
                                        { id: 'info', label: 'Инфо', icon: ShoppingBag },
                                        { id: 'media', label: 'Медиа', icon: ImageIcon },
                                        { id: 'stock', label: 'Склад', icon: Layers },
                                        { id: 'extra', label: 'Доп.', icon: Tag },
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 ${activeTab === tab.id
                                                ? 'border-yellow-500 text-white bg-white/5'
                                                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            <tab.icon size={16} />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex-1 overflow-y-auto p-6">
                                    {activeTab === 'info' && (
                                        <div className="space-y-6 max-w-2xl mx-auto">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="md:col-span-2">
                                                    <label className="block text-gray-400 text-xs font-black uppercase tracking-widest mb-2">Название товара</label>
                                                    <input
                                                        required
                                                        value={currentProduct.title || ''}
                                                        onChange={e => setCurrentProduct({ ...currentProduct, title: e.target.value })}
                                                        className="w-full bg-black border border-white/10 rounded-xl p-4 text-white focus:border-yellow-500/50 focus:outline-none transition-colors"
                                                        placeholder="Напр. Игровая футболка 2024"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-gray-400 text-xs font-black uppercase tracking-widest mb-2">Цена (₽)</label>
                                                    <div className="relative">
                                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                                        <input
                                                            type="number"
                                                            required
                                                            value={currentProduct.price || ''}
                                                            onChange={e => setCurrentProduct({ ...currentProduct, price: Number(e.target.value) })}
                                                            className="w-full bg-black border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:border-yellow-500/50 focus:outline-none"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-gray-400 text-xs font-black uppercase tracking-widest mb-2">Старая цена (₽)</label>
                                                    <div className="relative">
                                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                                        <input
                                                            type="number"
                                                            value={currentProduct.oldPrice || ''}
                                                            onChange={e => setCurrentProduct({ ...currentProduct, oldPrice: Number(e.target.value) })}
                                                            className="w-full bg-black border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:border-yellow-500/50 focus:outline-none"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-gray-400 text-xs font-black uppercase tracking-widest mb-2">Категория</label>
                                                    <select
                                                        value={currentProduct.category || 'Экипировка'}
                                                        onChange={e => setCurrentProduct({ ...currentProduct, category: e.target.value })}
                                                        className="w-full bg-black border border-white/10 rounded-xl p-4 text-white focus:border-yellow-500/50 focus:outline-none appearance-none cursor-pointer"
                                                    >
                                                        {categories.filter(c => c !== 'Все').map(c => (
                                                            <option key={c} value={c}>{c}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-gray-400 text-xs font-black uppercase tracking-widest mb-2">Ссылка VK (Market)</label>
                                                    <div className="relative">
                                                        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                                        <input
                                                            value={currentProduct.orderLink || ''}
                                                            onChange={e => setCurrentProduct({ ...currentProduct, orderLink: e.target.value })}
                                                            className="w-full bg-black border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:border-yellow-500/50 focus:outline-none"
                                                            placeholder="https://vk.com/..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-gray-400 text-xs font-black uppercase tracking-widest mb-2">Описание</label>
                                                <textarea
                                                    rows={3}
                                                    value={currentProduct.description || ''}
                                                    onChange={e => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                                                    className="w-full bg-black border border-white/10 rounded-xl p-4 text-white focus:border-yellow-500/50 focus:outline-none"
                                                    placeholder="Расскажите о товаре..."
                                                />
                                            </div>

                                            {/* Quick Badges & Customization */}
                                            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <label className="text-white text-xs font-black uppercase tracking-wider flex items-center gap-2">
                                                            <Sparkles className={currentProduct.isCustomizable ? "text-yellow-400" : "text-gray-500"} size={16} />
                                                            Печать фамилии и номера (Индивидуальный пошив)
                                                        </label>
                                                        <p className="text-gray-500 text-[10px] uppercase font-bold mt-0.5">
                                                            Показывает золотистый бейдж персонализации и поля нанесения в корзине
                                                        </p>
                                                    </div>
                                                    <div
                                                        onClick={() => setCurrentProduct({ ...currentProduct, isCustomizable: !currentProduct.isCustomizable })}
                                                        className={`w-12 h-6 rounded-full p-0.5 cursor-pointer transition-colors duration-300 relative ${!currentProduct.isCustomizable ? 'bg-gray-700' : 'bg-yellow-500'}`}
                                                    >
                                                        <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${!currentProduct.isCustomizable ? 'translate-x-0' : 'translate-x-6'}`} />
                                                    </div>
                                                </div>

                                                <div className="pt-3 border-t border-white/5">
                                                    <div className="flex items-center justify-between mb-2.5">
                                                        <label className="text-gray-400 text-xs font-black uppercase tracking-widest">
                                                            Ярлык на фото товара (Бейдж)
                                                        </label>
                                                        {currentProduct.badges && currentProduct.badges.length > 0 ? (
                                                            <span className="text-[10px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                <Check size={10} /> Активен: {currentProduct.badges.includes('hit') ? 'Хит продаж' : currentProduct.badges.includes('new') ? 'Новинка' : 'Последний шанс'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                                                                Без ярлыка
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2.5">
                                                        {[
                                                            { 
                                                                id: 'hit', 
                                                                label: 'Хит продаж', 
                                                                icon: Flame, 
                                                                activeStyle: 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/40 font-black',
                                                                inactiveStyle: 'bg-white/5 border-white/10 text-gray-400 hover:border-red-500/40 hover:text-red-400' 
                                                            },
                                                            { 
                                                                id: 'new', 
                                                                label: 'Новинка', 
                                                                icon: Sparkles, 
                                                                activeStyle: 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/40 font-black',
                                                                inactiveStyle: 'bg-white/5 border-white/10 text-gray-400 hover:border-emerald-500/40 hover:text-emerald-400' 
                                                            },
                                                            { 
                                                                id: 'last_chance', 
                                                                label: 'Последний шанс', 
                                                                icon: Zap, 
                                                                activeStyle: 'bg-orange-600 text-white border-orange-500 shadow-lg shadow-orange-600/40 font-black',
                                                                inactiveStyle: 'bg-white/5 border-white/10 text-gray-400 hover:border-orange-500/40 hover:text-orange-400' 
                                                            }
                                                        ].map(b => {
                                                            const isSelected = currentProduct.badges?.includes(b.id as any);
                                                            const IconComp = b.icon;
                                                            return (
                                                                <button
                                                                    key={b.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const cur = currentProduct.badges || [];
                                                                        // Toggle badge: if clicked already selected, turn it off; else set as single active badge
                                                                        const next = isSelected ? [] : [b.id as any];
                                                                        setCurrentProduct({ ...currentProduct, badges: next });
                                                                    }}
                                                                    className={`py-3 px-3 rounded-xl border text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                                        isSelected ? b.activeStyle : b.inactiveStyle
                                                                    }`}
                                                                >
                                                                    <IconComp size={14} className={isSelected ? 'fill-white text-white' : ''} />
                                                                    <span>{b.label}</span>
                                                                    {isSelected && <Check size={13} strokeWidth={3} className="ml-0.5 text-white" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Production & Delivery Times */}
                                                <div className="pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-gray-400 text-xs font-black uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                                            <ClockIcon size={13} className="text-yellow-500" />
                                                            Срок пошива / изготовления
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={currentProduct.productionTime || ''}
                                                            onChange={e => setCurrentProduct({ ...currentProduct, productionTime: e.target.value })}
                                                            className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white text-xs font-bold focus:border-yellow-500 outline-none"
                                                            placeholder="Например: 3-5 рабочих дней"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-gray-400 text-xs font-black uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                                            <MapPin size={13} className="text-yellow-500" />
                                                            Место / способ получения
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={currentProduct.deliveryInfo || ''}
                                                            onChange={e => setCurrentProduct({ ...currentProduct, deliveryInfo: e.target.value })}
                                                            className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white text-xs font-bold focus:border-yellow-500 outline-none"
                                                            placeholder="Например: Выдача у тренера в манеже"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'media' && (
                                        <div className="space-y-8 max-w-2xl mx-auto">
                                            {/* Main Image */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div>
                                                    <label className="block text-gray-400 text-xs font-black uppercase tracking-widest mb-3">Основное фото</label>
                                                    <div
                                                        onClick={() => document.getElementById('product-image')?.click()}
                                                        className="aspect-square bg-black border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-yellow-500 transition-all relative overflow-hidden group shadow-2xl"
                                                    >
                                                        {imagePreview || currentProduct.imageUrl ? (
                                                            <img src={imagePreview || currentProduct.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="text-center p-6">
                                                                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-yellow-500 group-hover:text-black transition-colors">
                                                                    <Upload size={32} />
                                                                </div>
                                                                <span className="text-gray-500 text-sm font-bold">Нажмите для загрузки</span>
                                                            </div>
                                                        )}
                                                        <input id="product-image" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-gray-400 text-xs font-black uppercase tracking-widest mb-3">Галерея</label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <>
                                                            {currentProduct.gallery?.map((url, idx) => (
                                                                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border border-white/5">
                                                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeExistingGalleryImage(url)}
                                                                        className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 group-hover:scale-100"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            {galleryPreviews.map((preview, idx) => (
                                                                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border border-yellow-500/30">
                                                                    <img src={preview} alt="" className="w-full h-full object-cover" />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeGalleryImage(idx)}
                                                                        className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </>
                                                        <button
                                                            type="button"
                                                            onClick={() => document.getElementById('gallery-images')?.click()}
                                                            className="aspect-square bg-black border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center hover:border-yellow-500 transition-colors group"
                                                        >
                                                            <Plus className="text-gray-600 group-hover:text-yellow-500 transition-colors" size={32} />
                                                        </button>
                                                        <input id="gallery-images" type="file" accept="image/*" multiple onChange={handleGalleryChange} className="hidden" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Colors & Color Images */}
                                            <div className="border-t border-white/5 pt-8">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <label className="block text-gray-400 text-xs font-black uppercase tracking-widest">Цветовые решения</label>
                                                        <p className="text-gray-600 text-[10px] uppercase font-bold tracking-wider mt-1">Добавьте цвета и загрузите для них фото</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={customColor}
                                                            onChange={e => setCustomColor(e.target.value)}
                                                            placeholder="Напр. Синий"
                                                            className="bg-black border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-yellow-500/50 outline-none"
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    if (customColor.trim()) {
                                                                        const c = customColor.trim();
                                                                        if (!currentProduct.colors?.includes(c)) {
                                                                            setCurrentProduct({ ...currentProduct, colors: [...(currentProduct.colors || []), c] });
                                                                        }
                                                                        setCustomColor('');
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (customColor.trim()) {
                                                                    const c = customColor.trim();
                                                                    if (!currentProduct.colors?.includes(c)) {
                                                                        setCurrentProduct({ ...currentProduct, colors: [...(currentProduct.colors || []), c] });
                                                                    }
                                                                    setCustomColor('');
                                                                }
                                                            }}
                                                            className="bg-yellow-500 text-black p-2 rounded-xl"
                                                        >
                                                            <Plus size={20} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {currentProduct.colors?.map(color => (
                                                        <div key={color} className="flex items-center gap-4 bg-black/40 p-3 rounded-2xl border border-white/5 group">
                                                            <div
                                                                onClick={() => document.getElementById(`color-btn-${color}`)?.click()}
                                                                className="w-16 h-16 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden cursor-pointer hover:border-yellow-500 transition-all shrink-0 relative bg-black"
                                                            >
                                                                {colorImagePreviews[color] || currentProduct.colorImages?.[color] ? (
                                                                    <img src={colorImagePreviews[color] || currentProduct.colorImages?.[color]} className="w-full h-full object-cover" alt={color} />
                                                                ) : (
                                                                    <ImageIcon size={24} className="text-gray-700" />
                                                                )}
                                                                <input
                                                                    id={`color-btn-${color}`}
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={(e) => {
                                                                        if (e.target.files?.[0]) {
                                                                            const file = e.target.files[0];
                                                                            setColorImageFiles(prev => ({ ...prev, [color]: file }));
                                                                            setColorImagePreviews(prev => ({ ...prev, [color]: URL.createObjectURL(file) }));
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <span className="block text-white font-black uppercase text-xs tracking-wider mb-1 truncate">{color}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newColors = currentProduct.colors?.filter(c => c !== color) || [];
                                                                        setCurrentProduct({ ...currentProduct, colors: newColors });
                                                                    }}
                                                                    className="text-red-500 text-[10px] font-black uppercase tracking-widest hover:text-red-400 transition-colors"
                                                                >
                                                                    Удалить
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'stock' && (
                                        <div className="space-y-6 max-w-2xl mx-auto">
                                            {/* 1. Mode Switcher: Made-to-Order vs Strict Stock Management */}
                                            <div className="bg-white/5 p-5 rounded-3xl border border-white/10 shadow-2xl space-y-4">
                                                <div>
                                                    <h3 className="text-white font-black uppercase tracking-widest flex items-center gap-2 text-sm">
                                                        <Layers size={18} className="text-yellow-500" />
                                                        Режим наличия и производства
                                                    </h3>
                                                    <p className="text-gray-400 text-xs mt-1">
                                                        Выберите, как товар доступен для заказа родителям
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentProduct({ ...currentProduct, isMadeToOrder: true })}
                                                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                                                            currentProduct.isMadeToOrder
                                                                ? 'bg-amber-500/15 border-amber-500 text-white ring-2 ring-amber-500/30'
                                                                : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'
                                                        }`}
                                                    >
                                                        <div className={`p-2.5 rounded-xl flex-shrink-0 ${currentProduct.isMadeToOrder ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-400'}`}>
                                                            <Sparkles size={18} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-russo text-sm text-white uppercase">🧵 Пошив под заказ</h4>
                                                            <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                                                                Все размеры доступны всегда (пошив 3–5 дней на фабрике)
                                                            </p>
                                                        </div>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentProduct({ ...currentProduct, isMadeToOrder: false })}
                                                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                                                            !currentProduct.isMadeToOrder
                                                                ? 'bg-yellow-500/15 border-yellow-500 text-white ring-2 ring-yellow-500/30'
                                                                : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'
                                                        }`}
                                                    >
                                                        <div className={`p-2.5 rounded-xl flex-shrink-0 ${!currentProduct.isMadeToOrder ? 'bg-yellow-500 text-black' : 'bg-white/5 text-gray-400'}`}>
                                                            <Layers size={18} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-russo text-sm text-white uppercase">📦 Складской учёт</h4>
                                                            <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                                                                Строгий учёт количества штук для каждого размера
                                                            </p>
                                                        </div>
                                                    </button>
                                                </div>

                                                {currentProduct.isMadeToOrder && (
                                                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex items-center gap-3">
                                                        <Sparkles className="text-amber-400 flex-shrink-0" size={20} />
                                                        <p className="text-xs text-amber-200 leading-relaxed">
                                                            В карточке товара отображается бейдж <strong>«Пошив под заказ: {currentProduct.productionTime || '3–5 дней'}»</strong>. Родители смогут свободно заказывать форму любого размера с нанесением имени и номера.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 2. Stock Inventory & Sizes */}
                                            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 shadow-2xl space-y-4">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                    <div>
                                                        <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                                                            Размерная сетка и остатки
                                                        </h3>
                                                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                                                            {currentProduct.isMadeToOrder ? 'Доступные размеры для заказа' : 'Количество штук на складе'}
                                                        </p>
                                                    </div>

                                                    {!currentProduct.isMadeToOrder && currentProduct.sizes && currentProduct.sizes.length > 0 && (
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const stockObj = (typeof currentProduct.stock === 'object' && currentProduct.stock !== null) ? { ...currentProduct.stock } : {};
                                                                    currentProduct.sizes?.forEach(s => {
                                                                        stockObj[s] = 10;
                                                                    });
                                                                    setCurrentProduct({ ...currentProduct, stock: stockObj });
                                                                }}
                                                                className="px-2.5 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer"
                                                            >
                                                                Все по 10 шт
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const stockObj = (typeof currentProduct.stock === 'object' && currentProduct.stock !== null) ? { ...currentProduct.stock } : {};
                                                                    currentProduct.sizes?.forEach(s => {
                                                                        stockObj[s] = 5;
                                                                    });
                                                                    setCurrentProduct({ ...currentProduct, stock: stockObj });
                                                                }}
                                                                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer"
                                                            >
                                                                Все по 5 шт
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const stockObj = (typeof currentProduct.stock === 'object' && currentProduct.stock !== null) ? { ...currentProduct.stock } : {};
                                                                    currentProduct.sizes?.forEach(s => {
                                                                        stockObj[s] = 0;
                                                                    });
                                                                    setCurrentProduct({ ...currentProduct, stock: stockObj });
                                                                }}
                                                                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer"
                                                            >
                                                                Обнулить
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {(!currentProduct.sizes || currentProduct.sizes.length === 0) ? (
                                                    <div className="flex items-center gap-4 bg-yellow-500/5 p-5 rounded-2xl border border-yellow-500/10">
                                                        <div className="flex-1">
                                                            <h4 className="text-white font-black text-xs uppercase">ОБЩИЙ ОСТАТОК (БЕЗРАЗМЕРНЫЙ)</h4>
                                                            <p className="text-gray-500 text-[10px] font-bold uppercase mt-1">Для аксессуаров, рюкзаков, бутылок</p>
                                                        </div>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                className="w-28 bg-black border border-white/20 rounded-xl p-3 text-center text-lg font-black text-yellow-500 focus:border-yellow-500 outline-none"
                                                                value={currentProduct.stock?.['N/A'] !== undefined ? currentProduct.stock['N/A'] : ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const stockObj = (typeof currentProduct.stock === 'object' && currentProduct.stock !== null) ? currentProduct.stock : {};
                                                                    const newStock = { ...stockObj };
                                                                    if (val === '') delete newStock['N/A'];
                                                                    else newStock['N/A'] = Number(val);
                                                                    setCurrentProduct({ ...currentProduct, stock: newStock });
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2.5">
                                                        {currentProduct.sizes.map(size => {
                                                            const currentQty = currentProduct.stock?.[size] !== undefined ? currentProduct.stock[size] : 0;
                                                            const isZero = currentQty === 0;
                                                            const isLow = currentQty > 0 && currentQty <= (currentProduct.lowStockThreshold || 3);

                                                            return (
                                                                <div key={size} className="flex items-center justify-between gap-3 bg-black/50 p-3 sm:p-4 rounded-2xl border border-white/5 hover:border-white/15 transition-all">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-black font-russo font-black text-base shadow flex-shrink-0">
                                                                            {size}
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-xs font-bold text-white uppercase tracking-wider">{size}</span>
                                                                            {!currentProduct.isMadeToOrder && (
                                                                                <div className="mt-0.5">
                                                                                    {isZero ? (
                                                                                        <span className="text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                                                                                            ● Нет на складе
                                                                                        </span>
                                                                                    ) : isLow ? (
                                                                                        <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded animate-pulse">
                                                                                            🔥 Заканчивается: {currentQty} шт
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                                                                                            ● В наличии: {currentQty} шт
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        {!currentProduct.isMadeToOrder && (
                                                                            <div className="flex items-center bg-black border border-white/10 rounded-xl overflow-hidden">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const stockObj = (typeof currentProduct.stock === 'object' && currentProduct.stock !== null) ? currentProduct.stock : {};
                                                                                        const newQty = Math.max(0, (Number(stockObj[size]) || 0) - 1);
                                                                                        setCurrentProduct({ ...currentProduct, stock: { ...stockObj, [size]: newQty } });
                                                                                    }}
                                                                                    className="px-2.5 py-2 text-gray-400 hover:text-white hover:bg-white/10 transition-colors font-black text-sm"
                                                                                >
                                                                                    -1
                                                                                </button>
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    className="w-14 bg-transparent py-2 text-center text-sm font-mono font-bold text-white focus:outline-none"
                                                                                    value={currentProduct.stock?.[size] !== undefined ? currentProduct.stock[size] : ''}
                                                                                    onChange={(e) => {
                                                                                        const val = e.target.value;
                                                                                        const stockObj = (typeof currentProduct.stock === 'object' && currentProduct.stock !== null) ? currentProduct.stock : {};
                                                                                        const newStock = { ...stockObj };
                                                                                        if (val === '') delete newStock[size];
                                                                                        else newStock[size] = Math.max(0, Number(val));
                                                                                        setCurrentProduct({ ...currentProduct, stock: newStock });
                                                                                    }}
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const stockObj = (typeof currentProduct.stock === 'object' && currentProduct.stock !== null) ? currentProduct.stock : {};
                                                                                        const newQty = (Number(stockObj[size]) || 0) + 1;
                                                                                        setCurrentProduct({ ...currentProduct, stock: { ...stockObj, [size]: newQty } });
                                                                                    }}
                                                                                    className="px-2.5 py-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 transition-colors font-black text-sm"
                                                                                >
                                                                                    +1
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const stockObj = (typeof currentProduct.stock === 'object' && currentProduct.stock !== null) ? currentProduct.stock : {};
                                                                                        const newQty = (Number(stockObj[size]) || 0) + 5;
                                                                                        setCurrentProduct({ ...currentProduct, stock: { ...stockObj, [size]: newQty } });
                                                                                    }}
                                                                                    className="px-2.5 py-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors font-black text-xs border-l border-white/10"
                                                                                >
                                                                                    +5
                                                                                </button>
                                                                            </div>
                                                                        )}

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const newSizes = currentProduct.sizes?.filter(s => s !== size) || [];
                                                                                const stockObj = (typeof currentProduct.stock === 'object' && currentProduct.stock !== null) ? currentProduct.stock : {};
                                                                                const newStock = { ...stockObj };
                                                                                delete newStock[size];
                                                                                setCurrentProduct({ ...currentProduct, sizes: newSizes, stock: newStock });
                                                                            }}
                                                                            className="p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                                                                            title="Удалить размер"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-3 pt-2">
                                                    <div className="relative flex-1">
                                                        <List size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                                        <input
                                                            type="text"
                                                            value={customSize}
                                                            onChange={e => setCustomSize(e.target.value)}
                                                            placeholder="Новый размер (116, 122, 128, S, M...)"
                                                            className="w-full bg-black border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-white text-sm focus:border-yellow-500 outline-none shadow-inner"
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    if (customSize.trim()) {
                                                                        const s = customSize.trim();
                                                                        if (!currentProduct.sizes?.includes(s)) {
                                                                            setCurrentProduct({ ...currentProduct, sizes: [...(currentProduct.sizes || []), s] });
                                                                        }
                                                                        setCustomSize('');
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (customSize.trim()) {
                                                                const s = customSize.trim();
                                                                if (!currentProduct.sizes?.includes(s)) {
                                                                    setCurrentProduct({ ...currentProduct, sizes: [...(currentProduct.sizes || []), s] });
                                                                }
                                                                setCustomSize('');
                                                            }
                                                        }}
                                                        className="h-12 px-5 bg-yellow-500 hover:bg-yellow-400 text-black font-russo uppercase text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-yellow-500/20 active:scale-95 transition-all cursor-pointer"
                                                    >
                                                        <Plus size={18} />
                                                        <span>Добавить</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'extra' && (
                                        <div className="space-y-8 max-w-2xl mx-auto">
                                            {/* Visibility & Badges */}
                                            <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                                                    <div>
                                                        <label className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                                                            <Eye className="text-white" />
                                                            Видимость на сайте
                                                        </label>
                                                        <p className="text-gray-500 text-[10px] font-bold uppercase mt-1">
                                                            {currentProduct.isHidden ? 'Товар скрыт от покупателей' : 'Товар доступен в каталоге'}
                                                        </p>
                                                    </div>
                                                    <div
                                                        onClick={() => setCurrentProduct({ ...currentProduct, isHidden: !currentProduct.isHidden })}
                                                        className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300 relative ${currentProduct.isHidden ? 'bg-gray-700' : 'bg-green-500'}`}
                                                    >
                                                        <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 ${currentProduct.isHidden ? 'translate-x-0' : 'translate-x-6'}`} />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                                                    <div>
                                                        <label className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                                                            <Edit2 className={currentProduct.isCustomizable ? "text-yellow-500" : "text-gray-500"} size={20} />
                                                            Индивидуальный пошив
                                                        </label>
                                                        <p className="text-gray-500 text-[10px] font-bold uppercase mt-1">
                                                            {currentProduct.isCustomizable ? 'Покупатель может указать имя и номер' : 'Стандартный товар без кастомизации'}
                                                        </p>
                                                    </div>
                                                    <div
                                                        onClick={() => setCurrentProduct({ ...currentProduct, isCustomizable: !currentProduct.isCustomizable })}
                                                        className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300 relative ${!currentProduct.isCustomizable ? 'bg-gray-700' : 'bg-yellow-500'}`}
                                                    >
                                                        <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 ${!currentProduct.isCustomizable ? 'translate-x-0' : 'translate-x-6'}`} />
                                                    </div>
                                                </div>

                                                <div className="mb-8 pb-6 border-b border-white/5">
                                                    <label className="text-white font-black uppercase tracking-widest flex items-center gap-2 mb-4">
                                                        <Layers className="text-blue-400" size={20} />
                                                        Привязка таблицы размеров
                                                    </label>
                                                    <select
                                                        value={currentProduct.sizeChartId || ''}
                                                        onChange={(e) => setCurrentProduct({ ...currentProduct, sizeChartId: e.target.value || undefined })}
                                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold focus:border-blue-500 outline-none transition-all"
                                                    >
                                                        <option value="">Автоматический подбор (по категории/типу)</option>
                                                        {sizeCharts.map(chart => (
                                                            <option key={chart.id} value={chart.id}>
                                                                {chart.name} ({chart.category === 'child' ? 'Юниор' : 'Взрослый'} - {chart.type})
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <p className="text-gray-500 text-[10px] font-bold uppercase mt-2 italic">
                                                        * Если не выбрано, система попробует найти таблицу по типу товара (Верх/Низ) и категории (Юниор/Взрослый)
                                                    </p>
                                                </div>

                                                <div className="mb-8 pb-6 border-b border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-gray-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                            <ClockIcon size={14} className="text-yellow-500" />
                                                            Срок пошива / изготовления
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={currentProduct.productionTime || ''}
                                                            onChange={e => setCurrentProduct({ ...currentProduct, productionTime: e.target.value })}
                                                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold focus:border-yellow-500 outline-none"
                                                            placeholder="Например: 3-5 рабочих дней"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-gray-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                            <MapPin size={14} className="text-yellow-500" />
                                                            Место / способ получения
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={currentProduct.deliveryInfo || ''}
                                                            onChange={e => setCurrentProduct({ ...currentProduct, deliveryInfo: e.target.value })}
                                                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold focus:border-yellow-500 outline-none"
                                                            placeholder="Например: Выдача у тренера в манеже"
                                                        />
                                                    </div>
                                                </div>

                                                <label className="block text-gray-400 text-xs font-black uppercase tracking-widest mb-4">Маркетинговые ярлыки (Badges)</label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {[
                                                        { id: 'hit', label: 'Хит продаж', color: 'bg-red-500', icon: Flame, iconColor: 'text-red-400' },
                                                        { id: 'new', label: 'Новинка', color: 'bg-green-500', icon: Sparkles, iconColor: 'text-green-400' },
                                                        { id: 'last_chance', label: 'Последний шанс', color: 'bg-orange-500', icon: Zap, iconColor: 'text-orange-400' }
                                                    ].map(badge => {
                                                        const isSelected = currentProduct.badges?.includes(badge.id as any);
                                                        const IconComp = badge.icon;
                                                        return (
                                                            <div
                                                                key={badge.id}
                                                                onClick={() => {
                                                                    const next = isSelected ? [] : [badge.id as any];
                                                                    setCurrentProduct({ ...currentProduct, badges: next });
                                                                }}
                                                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group ${isSelected
                                                                    ? `border-${badge.color.split('-')[1]}-500 bg-${badge.color.split('-')[1]}-500/20 shadow-lg shadow-${badge.color.split('-')[1]}-500/20`
                                                                    : 'border-white/5 bg-black/40 hover:border-white/20'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`p-2 rounded-xl ${isSelected ? `bg-${badge.color.split('-')[1]}-500 text-white` : `bg-white/5 ${badge.iconColor}`}`}>
                                                                        <IconComp size={18} className={isSelected ? 'fill-current text-white' : ''} />
                                                                    </div>
                                                                    <span className={`text-sm font-black uppercase tracking-tight ${isSelected ? 'text-white' : 'text-gray-400'}`}>{badge.label}</span>
                                                                </div>
                                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? `bg-${badge.color.split('-')[1]}-500 border-transparent shadow-md` : 'border-gray-700 group-hover:border-gray-500'}`}>
                                                                    {isSelected && <Check size={13} strokeWidth={3} className="text-white" />}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Specifications */}
                                            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <h3 className="text-white font-black uppercase tracking-widest text-sm">Характеристики товара</h3>
                                                        <p className="text-gray-400 text-xs mt-0.5">Отображаются родителям на странице товара в виде аккуратного списка</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={addSpecRow}
                                                        className="text-xs bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-xl font-russo uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                                                    >
                                                        + Своя строка
                                                    </button>
                                                </div>

                                                {/* Быстрые шаблоны */}
                                                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                                    <span className="text-[11px] font-bold text-gray-500 uppercase mr-1">Быстрый шаблон:</span>
                                                    {[
                                                        { label: '+ Комплект', key: 'Комплект', val: 'Игровая футболка + шорты' },
                                                        { label: '+ Ткань', key: 'Ткань', val: 'Дышащий спортивный полиэстер' },
                                                        { label: '+ Нанесение', key: 'Нанесение', val: 'Фамилия и номер включены' },
                                                        { label: '+ Уход', key: 'Уход', val: 'Стирка при 30°C (без глажки)' },
                                                        { label: '+ Материал', key: 'Материал', val: '100% полиэстер' },
                                                        { label: '+ Сезон', key: 'Сезон', val: 'Всесезонный' },
                                                        { label: '+ Производство', key: 'Производство', val: 'Россия' },
                                                    ].map(preset => (
                                                        <button
                                                            key={preset.key}
                                                            type="button"
                                                            onClick={() => addSpecPreset(preset.key, preset.val)}
                                                            className="px-2.5 py-1 bg-white/5 hover:bg-yellow-500/20 hover:border-yellow-500/40 text-gray-300 hover:text-yellow-400 rounded-lg text-xs font-bold border border-white/10 transition-colors cursor-pointer"
                                                        >
                                                            {preset.label}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Список характеристик */}
                                                <div className="space-y-3 pt-2">
                                                    {specRows.map((row) => (
                                                        <div key={row.id} className="flex gap-2 items-center group">
                                                            <input
                                                                placeholder="Название (напр. Комплект / Ткань)"
                                                                value={row.key}
                                                                onChange={(e) => updateSpecKey(row.id, e.target.value)}
                                                                className="w-1/3 bg-black border border-white/10 rounded-xl p-3 text-xs font-bold text-white focus:border-yellow-500 outline-none"
                                                            />
                                                            <input
                                                                placeholder="Значение (напр. Футболка + шорты / Полиэстер)"
                                                                value={row.value}
                                                                onChange={(e) => updateSpecValue(row.id, e.target.value)}
                                                                className="flex-1 bg-black border border-white/10 rounded-xl p-3 text-xs text-gray-300 focus:border-yellow-500 outline-none"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => removeSpecRow(row.id)}
                                                                className="p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer flex-shrink-0"
                                                                title="Удалить характеристику"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {specRows.length === 0 && (
                                                        <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-2xl">
                                                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Характеристики пока не добавлены</p>
                                                            <p className="text-gray-600 text-[11px] mt-1">Используйте кнопки шаблонов выше или кнопку «+ Своя строка»</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 border-t border-white/5 flex justify-between items-center bg-black/40">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="text-gray-500 font-black uppercase tracking-widest hover:text-white px-6 py-2 transition-colors"
                                    >
                                        Отмена
                                    </button>
                                    <div className="flex gap-4">
                                        {currentProduct.id && (
                                            <button
                                                type="button"
                                                onClick={() => handleClone(currentProduct as Product)}
                                                className="flex items-center gap-2 bg-blue-500/10 text-blue-500 px-6 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all"
                                            >
                                                <Copy size={18} />
                                                Клон
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="min-w-[160px] flex items-center justify-center gap-3 bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 text-black px-8 py-3 rounded-xl font-black uppercase tracking-widest transition-all shadow-xl shadow-yellow-500/20 active:scale-95"
                                        >
                                            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                            {isSaving ? 'Сохранение...' : 'СОХРАНИТЬ'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* Size Chart Edit Modal */}
                {isEditingSizeChart && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-black border border-white/10 w-full max-w-4xl rounded-[40px] shadow-2xl relative my-auto"
                        >
                            <form onSubmit={handleSaveSizeChart}>
                                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                                    <div>
                                        <h2 className="text-white text-3xl font-black uppercase tracking-tighter italic">
                                            {currentSizeChart.id ? 'РЕДАКТИРОВАНИЕ ТАБЛИЦЫ' : 'НОВАЯ ТАБЛИЦА'}
                                        </h2>
                                        <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Управление размерной сеткой</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingSizeChart(false)}
                                        className="h-12 w-12 bg-white/5 hover:bg-white/10 text-white rounded-2xl flex items-center justify-center transition-all"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest block mb-2">Название</label>
                                                <input
                                                    required
                                                    value={currentSizeChart.name}
                                                    onChange={(e) => setCurrentSizeChart({ ...currentSizeChart, name: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold focus:border-blue-500 outline-none transition-all"
                                                    placeholder="Напр. Олимпийка Юниор"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest block mb-2">Тип</label>
                                                    <select
                                                        value={currentSizeChart.type}
                                                        onChange={(e) => setCurrentSizeChart({ ...currentSizeChart, type: e.target.value as any })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold focus:border-blue-500 outline-none transition-all"
                                                    >
                                                        <option value="jersey">Верх (Олимпийки)</option>
                                                        <option value="shorts">Низ (Шорты)</option>
                                                        <option value="pants">Брюки (Низ)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest block mb-2">Категория</label>
                                                    <select
                                                        value={currentSizeChart.category}
                                                        onChange={(e) => setCurrentSizeChart({ ...currentSizeChart, category: e.target.value as any })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold focus:border-blue-500 outline-none transition-all"
                                                    >
                                                        <option value="child">Юниор (Дети)</option>
                                                        <option value="adult">Взрослый</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest block mb-2">Дисклеймеры</label>
                                                {currentSizeChart.disclaimers?.map((d, i) => (
                                                    <div key={i} className="flex gap-2 mb-2">
                                                        <input
                                                            value={d}
                                                            onChange={(e) => {
                                                                const next = [...(currentSizeChart.disclaimers || [])];
                                                                next[i] = e.target.value;
                                                                setCurrentSizeChart({ ...currentSizeChart, disclaimers: next });
                                                            }}
                                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const next = currentSizeChart.disclaimers?.filter((_, idx) => idx !== i);
                                                                setCurrentSizeChart({ ...currentSizeChart, disclaimers: next });
                                                            }}
                                                            className="p-3 text-red-500 bg-red-500/10 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentSizeChart({ ...currentSizeChart, disclaimers: [...(currentSizeChart.disclaimers || []), ''] })}
                                                    className="w-full py-2 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all"
                                                >
                                                    + Добавить пояснение
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest block mb-2">Изображение таблицы</label>
                                            <div
                                                className="aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-blue-500/50 transition-all"
                                                onClick={() => document.getElementById('chart-image-upload')?.click()}
                                            >
                                                {chartImagePreview || currentSizeChart.imageUrl ? (
                                                    <img src={chartImagePreview || currentSizeChart.imageUrl} className="w-full h-full object-contain p-4 transition-transform group-hover:scale-105" />
                                                ) : (
                                                    <div className="text-center p-8">
                                                        <div className="h-16 w-16 bg-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                            <Upload size={32} />
                                                        </div>
                                                        <p className="text-white font-black uppercase tracking-tighter italic">Нажмите для загрузки</p>
                                                        <p className="text-gray-500 text-[10px] font-bold uppercase mt-1">PNG или JPG с прозрачностью</p>
                                                    </div>
                                                )}
                                                <input
                                                    type="file"
                                                    id="chart-image-upload"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        if (e.target.files?.[0]) {
                                                            const file = e.target.files[0];
                                                            setChartImageFile(file);
                                                            setChartImagePreview(URL.createObjectURL(file));
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Measurements Table Editor */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <label className="text-gray-400 text-[10px] font-black uppercase tracking-widest block">Таблица замеров</label>
                                                <p className="text-gray-500 text-[10px] font-bold uppercase">Укажите параметры для каждого размера</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = [...(currentSizeChart.measurements || []), { label: '' }];
                                                    setCurrentSizeChart({ ...currentSizeChart, measurements: next as any });
                                                }}
                                                className="bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
                                            >
                                                + Добавить строку
                                            </button>
                                        </div>

                                        <div className="overflow-x-auto bg-white/5 rounded-3xl border border-white/10">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-white/10 bg-white/5">
                                                        <th className="p-4 text-white text-[10px] font-black uppercase">Размер</th>
                                                        <th className="p-4 text-white text-[10px] font-black uppercase">A (Длина)</th>
                                                        <th className="p-4 text-white text-[10px] font-black uppercase">B (Ширина)</th>
                                                        {currentSizeChart.type === 'jersey' && <th className="p-4 text-white text-[10px] font-black uppercase">Грудь (Min-Max)</th>}
                                                        {(currentSizeChart.type === 'shorts' || currentSizeChart.type === 'pants') && <th className="p-4 text-white text-[10px] font-black uppercase">Талия (Min-Max)</th>}
                                                        <th className="p-4 w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {currentSizeChart.measurements?.map((m: any, i) => (
                                                        <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                            <td className="p-2">
                                                                <input
                                                                    value={m.label}
                                                                    onChange={(e) => {
                                                                        const next = [...(currentSizeChart.measurements || [])];
                                                                        next[i] = { ...m, label: e.target.value };
                                                                        setCurrentSizeChart({ ...currentSizeChart, measurements: next as any });
                                                                    }}
                                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white text-center font-black"
                                                                    placeholder="XL"
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    type="number"
                                                                    value={m.lengthA || m.length || ''}
                                                                    onChange={(e) => {
                                                                        const next = [...(currentSizeChart.measurements || [])];
                                                                        const val = parseFloat(e.target.value);
                                                                        next[i] = { ...m, lengthA: val, length: val }; // set both for compatibility
                                                                        setCurrentSizeChart({ ...currentSizeChart, measurements: next as any });
                                                                    }}
                                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white text-center"
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    type="number"
                                                                    value={m.widthB || m.width || ''}
                                                                    onChange={(e) => {
                                                                        const next = [...(currentSizeChart.measurements || [])];
                                                                        const val = parseFloat(e.target.value);
                                                                        next[i] = { ...m, widthB: val, width: val }; // set both for compatibility
                                                                        setCurrentSizeChart({ ...currentSizeChart, measurements: next as any });
                                                                    }}
                                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white text-center"
                                                                />
                                                            </td>
                                                            {currentSizeChart.type === 'jersey' && (
                                                                <td className="p-2">
                                                                    <div className="flex items-center gap-1">
                                                                        <input
                                                                            type="number"
                                                                            value={m.chestMin}
                                                                            onChange={(e) => {
                                                                                const next = [...(currentSizeChart.measurements || [])];
                                                                                next[i] = { ...m, chestMin: parseFloat(e.target.value) };
                                                                                setCurrentSizeChart({ ...currentSizeChart, measurements: next as any });
                                                                            }}
                                                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white text-center"
                                                                        />
                                                                        <span className="text-gray-600">-</span>
                                                                        <input
                                                                            type="number"
                                                                            value={m.chestMax}
                                                                            onChange={(e) => {
                                                                                const next = [...(currentSizeChart.measurements || [])];
                                                                                next[i] = { ...m, chestMax: parseFloat(e.target.value) };
                                                                                setCurrentSizeChart({ ...currentSizeChart, measurements: next as any });
                                                                            }}
                                                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white text-center"
                                                                        />
                                                                    </div>
                                                                </td>
                                                            )}
                                                            {(currentSizeChart.type === 'shorts' || currentSizeChart.type === 'pants') && (
                                                                <td className="p-2">
                                                                    <div className="flex items-center gap-1">
                                                                        <input
                                                                            type="number"
                                                                            value={m.waistMin}
                                                                            onChange={(e) => {
                                                                                const next = [...(currentSizeChart.measurements || [])];
                                                                                next[i] = { ...m, waistMin: parseFloat(e.target.value) };
                                                                                setCurrentSizeChart({ ...currentSizeChart, measurements: next as any });
                                                                            }}
                                                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white text-center"
                                                                        />
                                                                        <span className="text-gray-600">-</span>
                                                                        <input
                                                                            type="number"
                                                                            value={m.waistMax}
                                                                            onChange={(e) => {
                                                                                const next = [...(currentSizeChart.measurements || [])];
                                                                                next[i] = { ...m, waistMax: parseFloat(e.target.value) };
                                                                                setCurrentSizeChart({ ...currentSizeChart, measurements: next as any });
                                                                            }}
                                                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white text-center"
                                                                        />
                                                                    </div>
                                                                </td>
                                                            )}
                                                            <td className="p-2 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const next = currentSizeChart.measurements?.filter((_, idx) => idx !== i);
                                                                        setCurrentSizeChart({ ...currentSizeChart, measurements: next as any });
                                                                    }}
                                                                    className="text-red-500 hover:text-white transition-colors"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 border-t border-white/5 flex justify-between items-center bg-black/40 rounded-b-[40px]">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingSizeChart(false)}
                                        className="text-gray-500 font-black uppercase tracking-widest hover:text-white px-6 py-2 transition-colors"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="min-w-[200px] flex items-center justify-center gap-3 bg-blue-500 hover:bg-blue-400 disabled:bg-gray-700 disabled:text-gray-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                        {isSaving ? 'Сохранение...' : 'СОХРАНИТЬ ТАБЛИЦУ'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminShop;

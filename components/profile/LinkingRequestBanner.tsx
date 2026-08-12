import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Check, X, Bell, ShieldCheck } from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, serverTimestamp, getDoc, deleteDoc } from 'firebase/firestore';
import { GlassCard, Button } from '../UIComponents';

interface LinkingRequest {
    id: string;
    fromId: string;
    fromName: string;
    toId: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: any;
}

export const LinkingRequestBanner: React.FC<{ userId: string }> = ({ userId }) => {
    const [requests, setRequests] = useState<LinkingRequest[]>([]);

    useEffect(() => {
        if (!userId) return;

        const q = query(
            collection(db, 'linking_requests'),
            where('toId', '==', userId),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LinkingRequest));
            setRequests(reqs);
        });

        return () => unsubscribe();
    }, [userId]);

    const handleAction = async (requestId: string, fromId: string, action: 'accept' | 'reject') => {
        try {
            if (action === 'accept') {
                // 1. Update Parent document
                const parentRef = doc(db, 'users', fromId);
                await updateDoc(parentRef, {
                    childrenIds: arrayUnion(userId)
                });

                // 2. Update Child (current user) document
                const childRef = doc(db, 'users', userId);
                await updateDoc(childRef, {
                    parentId: fromId,
                    isLinked: true,
                    linkedAt: serverTimestamp()
                });

                // 3. Delete or update request
                await deleteDoc(doc(db, 'linking_requests', requestId));
            } else {
                await updateDoc(doc(db, 'linking_requests', requestId), {
                    status: 'rejected',
                    updatedAt: serverTimestamp()
                });
            }
        } catch (error) {
            console.error("Error handling linking request:", error);
        }
    };

    return (
        <AnimatePresence>
            {requests.map((req) => (
                <motion.div
                    key={req.id}
                    initial={{ height: 0, opacity: 0, y: -20 }}
                    animate={{ height: 'auto', opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -20 }}
                    className="overflow-hidden mb-4"
                >
                    <GlassCard className="!p-4 border-l-4 border-l-yellow-500 bg-yellow-500/10 backdrop-blur-xl">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-yellow-500/20 text-yellow-500">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white flex items-center gap-2">
                                        Запрос на привязку аккаунта
                                        <span className="px-2 py-0.5 rounded text-[10px] bg-yellow-500 text-black uppercase font-black">Семья</span>
                                    </h4>
                                    <p className="text-sm text-gray-400">
                                        <span className="text-yellow-400 font-medium">{req.fromName}</span> хочет привязать ваш аккаунт к своему родительскому кабинету.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    className="!px-4 !py-2 text-xs text-gray-400 hover:text-white"
                                    onClick={() => handleAction(req.id, req.fromId, 'reject')}
                                >
                                    Отклонить
                                </Button>
                                <Button
                                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold !px-4 !py-2 text-xs"
                                    onClick={() => handleAction(req.id, req.fromId, 'accept')}
                                >
                                    <Check size={16} className="mr-2" />
                                    Принять
                                </Button>
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>
            ))}
        </AnimatePresence>
    );
};
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, BarChart2, Users } from 'lucide-react';
import { db } from '../../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

interface PollMessageProps {
    pollId: string;
    groupId: string;
    userId: string;
    isMe: boolean;
}

const PollMessage: React.FC<PollMessageProps> = ({ pollId, groupId, userId, isMe }) => {
    const [poll, setPoll] = useState<any>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [isVoting, setIsVoting] = useState(false);

    useEffect(() => {
        if (!pollId) return;

        const unsubscribe = onSnapshot(doc(db, 'group_polls', pollId), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setPoll({ id: snapshot.id, ...data });

                // Check if user has already voted
                const voted = data.options.some((opt: any) => opt.votes?.includes(userId));
                setHasVoted(voted);
            }
        });

        return () => unsubscribe();
    }, [pollId, userId]);

    const handleVote = async (optionIndex: number) => {
        if (!poll || isVoting) return;
        setIsVoting(true);

        try {
            const newOptions = [...poll.options];

            // If already voted, remove old vote first (if voting for a different option)
            const currentVoteIndex = poll.options.findIndex((opt: any) => opt.votes?.includes(userId));

            if (currentVoteIndex === optionIndex) {
                // Clicking same option: remove vote
                newOptions[optionIndex].votes = newOptions[optionIndex].votes.filter((id: string) => id !== userId);
            } else {
                // Clicking different option or first time:
                if (currentVoteIndex !== -1) {
                    newOptions[currentVoteIndex].votes = newOptions[currentVoteIndex].votes.filter((id: string) => id !== userId);
                }
                newOptions[optionIndex].votes = [...(newOptions[optionIndex].votes || []), userId];
            }

            await updateDoc(doc(db, 'group_polls', pollId), {
                options: newOptions
            });
        } catch (error) {
            console.error("Error voting:", error);
        } finally {
            setIsVoting(false);
        }
    };

    if (!poll) return null;

    const totalVotes = poll.options.reduce((acc: number, opt: any) => acc + (opt.votes?.length || 0), 0);

    return (
        <div className={`p-5 rounded-3xl bg-[#1a1a1a] border border-white/10 shadow-2xl min-w-[280px] w-full max-w-sm ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-sparta-gold/10 flex items-center justify-center text-sparta-gold">
                    <BarChart2 size={20} />
                </div>
                <div>
                    <h4 className="text-sm font-russo text-white uppercase tracking-tight">{poll.question}</h4>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1">
                        <Users size={10} /> {totalVotes} {totalVotes === 1 ? 'голос' : 'голосов'}
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {poll.options.map((option: any, index: number) => {
                    const votes = option.votes?.length || 0;
                    const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                    const isSelected = option.votes?.includes(userId);

                    return (
                        <button
                            key={index}
                            onClick={() => handleVote(index)}
                            disabled={isVoting || poll.closed}
                            className="w-full text-left relative group outline-none"
                        >
                            <div className={`relative z-10 p-3 rounded-xl border transition-all flex items-center justify-between ${isSelected
                                    ? 'bg-sparta-gold/10 border-sparta-gold/50'
                                    : 'bg-white/5 border-white/5 hover:bg-white/[0.08] hover:border-white/10'
                                }`}>
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-sparta-gold border-sparta-gold text-black' : 'border-white/20'
                                        }`}>
                                        {isSelected && <CheckCircle2 size={12} />}
                                    </div>
                                    <span className={`text-[11px] font-bold uppercase tracking-tight truncate ${isSelected ? 'text-sparta-gold' : 'text-white/70'}`}>
                                        {option.text}
                                    </span>
                                </div>
                                <span className={`text-[10px] font-black tracking-tighter ml-2 ${isSelected ? 'text-sparta-gold' : 'text-white/30'}`}>
                                    {percentage}%
                                </span>
                            </div>

                            {/* Progress bar background */}
                            <div className="absolute inset-0 p-0.5 pointer-events-none overflow-hidden rounded-xl">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    className={`h-full opacity-10 transition-all ${isSelected ? 'bg-sparta-gold' : 'bg-white'}`}
                                />
                            </div>
                        </button>
                    );
                })}
            </div>

            {poll.closed && (
                <div className="mt-4 pt-4 border-t border-white/5 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Опрос завершен</p>
                </div>
            )}
        </div>
    );
};

export default PollMessage;
import React from 'react';
import { Wrench } from 'lucide-react';

interface MaintenanceScreenProps {
    message?: string;
}

const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ message }) => {
    return (
        <div className="min-h-screen bg-sparta-black flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <div className="w-20 h-20 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-6">
                    <Wrench className="text-orange-400" size={36} />
                </div>
                <h1 className="text-3xl font-russo text-white mb-3">Технические работы</h1>
                <p className="text-white/50 text-base leading-relaxed">
                    {message || 'Ведутся технические работы. Скоро вернёмся!'}
                </p>
                <div className="mt-8 flex items-center justify-center gap-2 text-white/20 text-sm">
                    <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                    SPARTA Sports Center
                </div>
            </div>
        </div>
    );
};

export default MaintenanceScreen;

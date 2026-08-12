import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const LegalLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
                <nav className="flex space-x-4 mb-8 border-b border-slate-800 pb-4 text-sm font-medium text-slate-400">
                    <Link to="/legal/requisites" className="hover:text-emerald-400">Реквизиты</Link>
                    <Link to="/legal/public-offer" className="hover:text-emerald-400">Публичная оферта</Link>
                    <Link to="/legal/education-info" className="hover:text-emerald-400">Сведения об организации</Link>
                </nav>
                <Outlet />
            </div>
        </div>
    );
};

export default LegalLayout;

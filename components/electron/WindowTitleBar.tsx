import React from 'react';

const WindowTitleBar: React.FC = () => {
    // Only render if running in Electron environment
    if (typeof window === 'undefined' || !(window as any).electron) {
        return null;
    }

    return (
        <div className="bg-slate-900 text-white h-8 flex items-center justify-between px-3 select-none drag-region">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
                <span className="font-semibold text-slate-200">Sparta Sports Center</span>
            </div>
            <div className="flex items-center space-x-2 no-drag">
                <button
                    onClick={() => (window as any).electron?.minimize()}
                    className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 focus:outline-none"
                    title="Minimize"
                />
                <button
                    onClick={() => (window as any).electron?.maximize()}
                    className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 focus:outline-none"
                    title="Maximize"
                />
                <button
                    onClick={() => (window as any).electron?.close()}
                    className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 focus:outline-none"
                    title="Close"
                />
            </div>
        </div>
    );
};

export default WindowTitleBar;

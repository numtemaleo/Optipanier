import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import type { Page } from '../types';

interface AppContextType {
    page: Page;
    setPage: (page: Page) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const getPageFromHash = (): Page => {
    const hash = window.location.hash.substring(1);
    const validPages: Page[] = ['analyze', 'list', 'chat', 'live', 'compare', 'profile', 'cards', 'budget', 'alerts', 'receiptLog'];
    return validPages.find(p => p === hash) || 'analyze';
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [page, setPageState] = useState<Page>(getPageFromHash());

    useEffect(() => {
        const handleHashChange = () => {
            setPageState(getPageFromHash());
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);
    
    const setPage = (newPage: Page) => {
        window.location.hash = newPage;
        setPageState(newPage);
    }

    const value = useMemo(() => ({ page, setPage }), [page]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

import React from 'react';
import { useAppContext } from './AppContext';
import type { Page } from '../types';

const Header: React.FC = () => {
  const { page, setPage } = useAppContext();

  const navItems: { id: Page; label: string; icon: string }[] = [
    { id: 'analyze', label: 'Scanner un Ticket', icon: 'receipt-outline' },
    { id: 'list', label: 'Liste de Courses', icon: 'list-outline' },
    { id: 'compare', label: 'Comparer les Prix', icon: 'pricetag-outline' },
    { id: 'chat', label: 'Assistant Chat', icon: 'chatbubbles-outline' },
    { id: 'live', label: 'Assistant Vocal', icon: 'mic-outline' },
    { id: 'profile', label: 'Profil', icon: 'person-outline' },
  ];

  const baseClasses = "flex-1 text-center py-3 px-2 rounded-full transition-all duration-300 ease-in-out flex items-center justify-center gap-2";
  const activeClasses = "bg-primary text-white shadow-lg font-semibold";
  const inactiveClasses = "text-text-light hover:bg-primary/10 hover:text-primary";

  return (
    <nav className="bg-white p-2 rounded-full shadow-md flex space-x-2">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setPage(item.id)}
          className={`${baseClasses} ${page === item.id ? activeClasses : inactiveClasses}`}
        >
          <ion-icon name={item.icon} class="text-xl"></ion-icon>
          <span className="hidden sm:inline">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default Header;
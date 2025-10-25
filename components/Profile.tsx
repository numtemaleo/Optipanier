import React from 'react';
import Card from './common/Card';
import { useAppContext } from './AppContext';
import type { Page } from '../types';

const Profile: React.FC = () => {
    const { setPage } = useAppContext();

    const menuItems: { page: Page; title: string; description: string; icon: string }[] = [
        { 
            page: 'cards', 
            title: 'Gérer mes Cartes de Fidélité', 
            description: 'Ajoutez, consultez et utilisez vos cartes numériquement.',
            icon: 'card-outline'
        },
        { 
            page: 'budget', 
            title: 'Budget & Analyse des Dépenses', 
            description: 'Analysez vos dépenses à partir des tickets archivés.',
            icon: 'pie-chart-outline'
        },
        { 
            page: 'alerts', 
            title: 'Gérer les Alertes de Prix', 
            description: 'Recevez des notifications sur les offres de vos articles favoris.',
            icon: 'notifications-outline'
        },
        { 
            page: 'receiptLog', 
            title: 'Voir Tous les Tickets Archivés', 
            description: 'Parcourez, consultez et gérez tout votre historique d\'achats.',
            icon: 'archive-outline'
        },
    ];

    return (
        <Card>
            <h2 className="text-2xl font-bold mb-6 text-center">Mon Profil</h2>
            <div className="space-y-4">
                {menuItems.map(item => (
                    <button
                        key={item.page}
                        onClick={() => setPage(item.page)}
                        className="w-full text-left p-4 bg-gray-50 rounded-xl hover:bg-primary/10 transition-colors flex items-center gap-4"
                    >
                        <div className="bg-primary/10 text-primary p-3 rounded-lg">
                             <ion-icon name={item.icon} class="text-2xl"></ion-icon>
                        </div>
                        <div className="flex-grow">
                            <p className="font-bold text-lg text-text-main">{item.title}</p>
                            <p className="text-sm text-text-light">{item.description}</p>
                        </div>
                        <ion-icon name="chevron-forward-outline" class="text-xl text-text-light"></ion-icon>
                    </button>
                ))}
            </div>
        </Card>
    );
};

export default Profile;
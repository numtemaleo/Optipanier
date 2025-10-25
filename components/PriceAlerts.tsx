import React, { useState, useEffect, useCallback } from 'react';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { compareItemPrices } from '../services/geminiService';
import { useAppContext } from './AppContext';
import type { AlertItem, PriceComparison } from '../types';

const PriceAlerts: React.FC = () => {
    const { setPage } = useAppContext();
    const [alertItems, setAlertItems] = useState<AlertItem[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const savedItems = localStorage.getItem('optiPanierAlertItems');
            if (savedItems) {
                setAlertItems(JSON.parse(savedItems));
            }
        } catch (e) {
            console.error("Failed to load alert items:", e);
        }
    }, []);

    const saveItems = (items: AlertItem[]) => {
        setAlertItems(items);
        localStorage.setItem('optiPanierAlertItems', JSON.stringify(items));
    };

    const handleAddItem = () => {
        if (!newItemName.trim()) return;
        const newItem: AlertItem = {
            id: Date.now().toString(),
            name: newItemName.trim(),
        };
        saveItems([newItem, ...alertItems]);
        setNewItemName('');
    };

    const handleDeleteItem = (idToDelete: string) => {
        saveItems(alertItems.filter(item => item.id !== idToDelete));
    };

    const checkAllForDeals = useCallback(async () => {
        if (alertItems.length === 0) return;
        setIsLoading(true);
        setError(null);
        
        const updatedItems = [...alertItems];

        for (let i = 0; i < updatedItems.length; i++) {
            try {
                const response = await compareItemPrices(updatedItems[i].name);
                // Find the best deal (lowest price)
                if (response.comparison && response.comparison.length > 0) {
                    const bestDeal = response.comparison.reduce((min, p) => p.price < min.price ? p : min);
                    updatedItems[i].deal = bestDeal;
                } else {
                    updatedItems[i].deal = undefined;
                }
            } catch (err) {
                console.error(`Failed to fetch price for ${updatedItems[i].name}`, err);
                // Optionally set an error state on the item itself
            }
        }
        
        saveItems(updatedItems);
        setIsLoading(false);

    }, [alertItems]);


    return (
        <Card>
            <div className="flex items-center mb-6">
                <button onClick={() => setPage('profile')} className="text-text-light hover:text-primary" aria-label="Retour au profil">
                    <ion-icon name="arrow-back-outline" class="text-2xl"></ion-icon>
                </button>
                <h2 className="text-2xl font-bold text-center flex-grow">Alertes de Prix</h2>
                <div className="w-6"></div> {/* Spacer */}
            </div>

            <div className="flex gap-2 mb-6">
                <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                    placeholder="Ajoutez un produit favori à suivre..."
                    className="flex-grow p-3 border border-border-light rounded-full focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <Button onClick={handleAddItem} className="w-full sm:w-auto">Ajouter</Button>
            </div>
            
            {alertItems.length === 0 ? (
                 <p className="text-center text-text-light py-8">Ajoutez vos produits favoris pour recevoir des alertes sur les meilleures offres.</p>
            ) : (
                <div className="space-y-3">
                    {alertItems.map(item => (
                        <Card key={item.id} className="bg-gray-50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg">{item.name}</p>
                                    {item.deal ? (
                                        <div className="mt-2 text-sm bg-secondary/20 p-2 rounded-md">
                                            <p><span className="font-semibold">Meilleure Offre Trouvée :</span> <span className="text-primary font-bold">€{item.deal.price.toFixed(2)}</span> chez {item.deal.store}</p>
                                            {item.deal.promotion && item.deal.promotion.toLowerCase() !== 'n/a' && <p className="text-secondary font-bold">{item.deal.promotion}</p>}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-text-light">Pas d'info d'offre pour le moment. Vérifiez les offres !</p>
                                    )}
                                </div>
                                <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:text-red-700 ml-4 text-xl" aria-label={`Supprimer l'alerte pour ${item.name}`}>
                                    <ion-icon name="trash-outline"></ion-icon>
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <div className="text-center mt-8">
                <Button onClick={checkAllForDeals} disabled={isLoading || alertItems.length === 0}>
                    {isLoading ? 'Vérification...' : 'Vérifier Toutes les Offres'}
                </Button>
                {isLoading && <Spinner />}
            </div>

        </Card>
    );
};

export default PriceAlerts;
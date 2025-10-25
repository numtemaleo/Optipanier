import React, { useState, useEffect, useMemo } from 'react';
import Card from './common/Card';
import { getAllReceipts } from '../utils/db';
import { useAppContext } from './AppContext';
import type { ArchivedReceipt } from '../types';

const BudgetTracker: React.FC = () => {
    const { setPage } = useAppContext();
    const [receipts, setReceipts] = useState<ArchivedReceipt[]>([]);

    useEffect(() => {
        const loadReceipts = async () => {
            try {
                const savedReceipts = await getAllReceipts();
                setReceipts(savedReceipts);
            } catch (e) {
                console.error("Failed to parse archived receipts:", e);
            }
        };
        loadReceipts();
    }, []);

    const stats = useMemo(() => {
        if (receipts.length === 0) {
            return { totalSpent: 0, topItems: [] };
        }

        const totalSpent = receipts.reduce((sum, receipt) => sum + (receipt.total || 0), 0);
        
        const itemCounts = new Map<string, number>();
        receipts.forEach(receipt => {
            receipt.items.forEach(item => {
                const itemName = item.name.toLowerCase().trim();
                itemCounts.set(itemName, (itemCounts.get(itemName) || 0) + 1);
            });
        });

        const topItems = [...itemCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count }));

        return { totalSpent, topItems };

    }, [receipts]);

    return (
        <Card>
            <div className="flex items-center mb-6">
                <button onClick={() => setPage('profile')} className="text-text-light hover:text-primary" aria-label="Retour au profil">
                    <ion-icon name="arrow-back-outline" class="text-2xl"></ion-icon>
                </button>
                <h2 className="text-2xl font-bold text-center flex-grow">Budget & Analyse</h2>
                <div className="w-6"></div> {/* Spacer */}
            </div>

            {receipts.length === 0 ? (
                <p className="text-center text-text-light py-8">Aucune donnée de ticket disponible. Commencez par scanner des tickets pour suivre votre budget.</p>
            ) : (
                <div className="space-y-6">
                    <Card className="bg-primary/10 text-center">
                        <p className="text-text-light">Total Dépensé (tickets archivés)</p>
                        <p className="text-4xl font-bold text-primary">€{stats.totalSpent.toFixed(2)}</p>
                    </Card>

                    <div>
                        <h3 className="text-xl font-bold mb-4">Top 5 des Articles les Plus Achetés</h3>
                        {stats.topItems.length > 0 ? (
                             <ul className="space-y-2">
                                {stats.topItems.map((item, index) => (
                                    <li key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                        <span className="font-semibold">{item.name}</span>
                                        <span className="text-text-light">Acheté {item.count} fois</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-text-light">Pas assez de données pour afficher le top articles.</p>
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
};

export default BudgetTracker;
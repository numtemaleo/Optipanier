import React, { useState, useEffect, useCallback } from 'react';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { getAllReceipts, deleteReceipt } from '../utils/db';
import { useAppContext } from './AppContext';
import type { ArchivedReceipt } from '../types';

const ReceiptLog: React.FC = () => {
    const { setPage } = useAppContext();
    const [receipts, setReceipts] = useState<ArchivedReceipt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedReceipt, setSelectedReceipt] = useState<ArchivedReceipt | null>(null);

    const loadReceipts = useCallback(async () => {
        setIsLoading(true);
        try {
            const savedReceipts = await getAllReceipts();
            setReceipts(savedReceipts);
        } catch (e) {
            console.error("Failed to load receipts for log:", e);
            setError("Impossible de charger l'historique des tickets depuis la base de données.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadReceipts();
    }, [loadReceipts]);

    const handleDelete = async (id: string) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer définitivement ce ticket ?')) {
            try {
                await deleteReceipt(id);
                loadReceipts(); // Refresh the list
            } catch (e) {
                setError("La suppression du ticket a échoué.");
            }
        }
    };

    const renderModal = () => {
        if (!selectedReceipt) return null;

        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedReceipt(null)}>
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-2xl font-bold">{selectedReceipt.store} - {selectedReceipt.date}</h3>
                        <button onClick={() => setSelectedReceipt(null)} className="text-2xl text-text-light hover:text-primary" aria-label="Fermer les détails du ticket">
                            <ion-icon name="close-circle-outline"></ion-icon>
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-bold mb-2">Articles</h4>
                            <ul className="space-y-1 max-h-96 overflow-y-auto pr-2 text-sm">
                                {selectedReceipt.items.map((item, index) => (
                                    <li key={index} className="flex justify-between border-b py-1">
                                        <span>{item.name}</span>
                                        <span>€{item.price.toFixed(2)}</span>
                                    </li>
                                ))}
                            </ul>
                             <p className="text-right font-bold text-lg mt-4">Total: €{selectedReceipt.total?.toFixed(2)}</p>
                        </div>
                        <div>
                            <h4 className="font-bold mb-2">Ticket Original</h4>
                            <img src={`data:image/jpeg;base64,${selectedReceipt.imageBase64}`} alt="Receipt" className="rounded-lg shadow-md w-full" />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {renderModal()}
            <Card>
                <div className="flex items-center mb-6">
                    <button onClick={() => setPage('profile')} className="text-text-light hover:text-primary" aria-label="Retour au profil">
                        <ion-icon name="arrow-back-outline" class="text-2xl"></ion-icon>
                    </button>
                    <h2 className="text-2xl font-bold text-center flex-grow">Historique des Tickets</h2>
                    <div className="w-6"></div> {/* Spacer */}
                </div>

                {isLoading && <Spinner />}
                {error && <p className="text-red-500 text-center my-4">{error}</p>}

                {!isLoading && !error && (
                    receipts.length === 0 ? (
                        <p className="text-center text-text-light py-8">Aucun ticket n'a encore été archivé.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th className="p-3 rounded-l-lg">Magasin</th>
                                        <th className="p-3">Date</th>
                                        <th className="p-3 text-right">Total</th>
                                        <th className="p-3 rounded-r-lg text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {receipts.map(receipt => (
                                        <tr key={receipt.id} className="border-b border-border-light">
                                            <td className="p-3 font-semibold">{receipt.store}</td>
                                            <td className="p-3">{receipt.date}</td>
                                            <td className="p-3 text-right font-bold">€{receipt.total?.toFixed(2)}</td>
                                            <td className="p-3 text-center">
                                                <button onClick={() => setSelectedReceipt(receipt)} className="text-primary hover:underline text-xl mx-2" aria-label={`Voir les détails pour le ticket de ${receipt.store} du ${receipt.date}`}>
                                                    <ion-icon name="eye-outline"></ion-icon>
                                                </button>
                                                <button onClick={() => handleDelete(receipt.id)} className="text-red-500 hover:underline text-xl mx-2" aria-label={`Supprimer le ticket de ${receipt.store} du ${receipt.date}`}>
                                                     <ion-icon name="trash-outline"></ion-icon>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </Card>
        </>
    );
};

export default ReceiptLog;
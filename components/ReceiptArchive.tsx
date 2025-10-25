import React, { useState } from 'react';
import type { ArchivedReceipt } from '../types';
import Card from './common/Card';

interface ReceiptArchiveProps {
    receipts: ArchivedReceipt[];
    onDelete: (id: string) => void;
}

const ReceiptArchive: React.FC<ReceiptArchiveProps> = ({ receipts, onDelete }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    if (receipts.length === 0) {
        return null;
    }

    return (
        <div className="mt-8">
            <h3 className="text-xl font-bold mb-4 text-center">Archive des Tickets</h3>
            <div className="space-y-3">
                {receipts.map((receipt) => (
                    <Card key={receipt.id} className="bg-gray-50">
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleExpand(receipt.id)}>
                            <div>
                                <p className="font-bold">{receipt.store}</p>
                                <p className="text-sm text-text-light">{receipt.date}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-lg">€{receipt.total?.toFixed(2) || 'N/A'}</p>
                                <span className="text-sm text-primary">{expandedId === receipt.id ? 'Cacher' : 'Voir'} les détails</span>
                            </div>
                        </div>
                        {expandedId === receipt.id && (
                            <div className="mt-4 pt-4 border-t border-border-light grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-bold mb-2">Articles</h4>
                                    <ul className="space-y-1 max-h-60 overflow-y-auto pr-2">
                                        {receipt.items.map((item, itemIndex) => (
                                            <li key={itemIndex} className="flex justify-between text-sm">
                                                <span>{item.name}</span>
                                                <span>€{item.price.toFixed(2)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold mb-2">Ticket Original</h4>
                                    <img src={`data:image/jpeg;base64,${receipt.imageBase64}`} alt={`Receipt from ${receipt.store} on ${receipt.date}`} className="rounded-lg shadow-md w-full" />
                                </div>
                                <div className="md:col-span-2 text-center mt-2">
                                    <button onClick={(e) => { e.stopPropagation(); onDelete(receipt.id); }} className="text-sm text-red-500 hover:underline">
                                        Supprimer cette archive
                                    </button>
                                </div>
                            </div>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default ReceiptArchive;
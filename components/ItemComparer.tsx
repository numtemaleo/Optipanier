import React, { useState, useCallback } from 'react';
import { compareItemPrices } from '../services/geminiService';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import type { PriceComparison } from '../types';

const ItemComparer: React.FC = () => {
    const [itemName, setItemName] = useState('');
    const [results, setResults] = useState<PriceComparison[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCompare = useCallback(async () => {
        if (!itemName.trim()) {
            setError("Veuillez entrer un nom d'article.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setResults(null);
        try {
            const response = await compareItemPrices(itemName);
            setResults(response.comparison);
        } catch (err) {
            setError("La comparaison des prix a échoué. Veuillez essayer un autre article.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [itemName]);

    return (
        <Card>
            <h2 className="text-2xl font-bold mb-4 text-center">Comparer les Prix des Articles</h2>
            <p className="text-center text-text-light mb-6">Entrez un produit pour trouver le meilleur prix dans les magasins populaires.</p>

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCompare()}
                    placeholder="ex: Oeufs bio x12"
                    className="flex-grow p-3 border border-border-light rounded-full focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <Button onClick={handleCompare} disabled={isLoading} className="w-full sm:w-auto">Comparer</Button>
            </div>

            {isLoading && <Spinner />}
            {error && <p className="text-red-500 text-center mt-4">{error}</p>}

            {results && (
                <div className="mt-8">
                    <h3 className="text-xl font-bold mb-4 text-center">Comparaison pour "{itemName}"</h3>
                    {results.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-200">
                                    <tr>
                                        <th className="p-3 rounded-l-lg">Magasin</th>
                                        <th className="p-3">Produit</th>
                                        <th className="p-3">Promotion</th>
                                        <th className="p-3 rounded-r-lg text-right">Prix</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((item, index) => (
                                        <tr key={index} className="border-b border-border-light">
                                            <td className="p-3 font-semibold">{item.store}</td>
                                            <td className="p-3">{item.productName}</td>
                                            <td className="p-3 text-secondary font-bold">{item.promotion && item.promotion.toLowerCase() !== 'n/a' ? item.promotion : '-'}</td>
                                            <td className="p-3 text-right font-bold text-primary">€{item.price.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-center text-text-light mt-4">Aucun résultat trouvé pour cet article.</p>
                    )}
                </div>
            )}
        </Card>
    );
};

export default ItemComparer;
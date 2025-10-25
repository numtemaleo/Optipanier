import React, { useState, useEffect, useCallback } from 'react';
import { analyzeLoyaltyCard } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';
import { addLoyaltyCard, getAllLoyaltyCards, deleteLoyaltyCard } from '../utils/db';
import { useAppContext } from './AppContext';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import type { LoyaltyCard } from '../types';

const LoyaltyCards: React.FC = () => {
    const { setPage } = useAppContext();
    const [cards, setCards] = useState<LoyaltyCard[]>([]);
    const [view, setView] = useState<'list' | 'add' | 'display'>('list');
    const [selectedCard, setSelectedCard] = useState<LoyaltyCard | null>(null);

    // Form state
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [cardDetails, setCardDetails] = useState<{ store: string; number: string }>({ store: '', number: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadCards = useCallback(async () => {
         try {
            const savedCards = await getAllLoyaltyCards();
            setCards(savedCards);
        } catch (e) {
            console.error("Failed to load loyalty cards:", e);
            setError("Impossible de charger les cartes de fidélité depuis la base de données.");
        }
    }, []);

    useEffect(() => {
        loadCards();
    }, [loadCards]);

    const resetForm = () => {
        setImageFile(null);
        setImagePreview(null);
        setCardDetails({ store: '', number: '' });
        setIsLoading(false);
        setError(null);
    };

    const handleAnalyze = useCallback(async () => {
        if (!imageFile) return;
        setIsLoading(true);
        setError(null);
        try {
            const imageDataBase64 = await fileToBase64(imageFile);
            const result = await analyzeLoyaltyCard(imageDataBase64, imageFile.type);
            setCardDetails(result);
        } catch (err) {
            setError("L'analyse de la carte a échoué. Veuillez saisir les détails manuellement.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [imageFile]);

    const handleSave = async () => {
        if (!cardDetails.store.trim() || !cardDetails.number.trim()) {
            setError('Le nom du magasin et le numéro de la carte sont requis.');
            return;
        }
        const newCard: LoyaltyCard = {
            id: Date.now().toString(),
            ...cardDetails,
        };
        try {
            await addLoyaltyCard(newCard);
            await loadCards(); // Refresh list
            resetForm();
            setView('list');
        } catch (e) {
            setError("La sauvegarde de la carte dans la base de données a échoué.");
        }
    };
    
    const handleDelete = async (idToDelete: string) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette carte ?')) {
            try {
                await deleteLoyaltyCard(idToDelete);
                await loadCards(); // Refresh list
            } catch (e) {
                setError("La suppression de la carte a échoué.");
            }
        }
    };

    const handleCardSelect = (card: LoyaltyCard) => {
        setSelectedCard(card);
        setView('display');
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setError(null);
            setCardDetails({ store: '', number: '' });
        }
    };

    const renderAddCardView = () => (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Ajouter une Carte de Fidélité</h2>
                <button onClick={() => { setView('list'); resetForm(); }} className="text-text-light hover:text-primary text-2xl" aria-label="Fermer le formulaire d'ajout">
                    <ion-icon name="close-circle-outline"></ion-icon>
                </button>
            </div>
            <div className="flex flex-col items-center gap-4 mb-6">
                <label htmlFor="card-upload" className="w-full max-w-sm cursor-pointer bg-gray-50 border-2 border-dashed border-border-light rounded-xl p-6 text-center hover:bg-primary/10 transition-colors">
                    <ion-icon name="camera-outline" class="text-4xl text-primary mx-auto"></ion-icon>
                    <p className="mt-2 text-text-light">{imageFile ? imageFile.name : 'Prenez une photo de votre carte'}</p>
                    <input id="card-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
                {imagePreview && <img src={imagePreview} alt="Card preview" className="rounded-lg shadow-md max-w-xs w-full" />}
                <Button onClick={handleAnalyze} disabled={!imageFile || isLoading}>
                    {isLoading ? 'Analyse en cours...' : 'Analyser avec l\'IA'}
                </Button>
            </div>
            
            {isLoading && <Spinner />}
            {error && <p className="text-red-500 text-center my-4">{error}</p>}

            <div className="space-y-4">
                 <input type="text" placeholder="Nom du Magasin (ex: Carrefour)" value={cardDetails.store} onChange={(e) => setCardDetails({...cardDetails, store: e.target.value})} className="w-full p-3 border border-border-light rounded-full focus:ring-2 focus:ring-primary focus:outline-none" />
                 <input type="text" placeholder="Numéro de Carte" value={cardDetails.number} onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})} className="w-full p-3 border border-border-light rounded-full focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>

            <div className="text-center mt-6">
                <Button onClick={handleSave} disabled={!cardDetails.store || !cardDetails.number}>
                    Sauvegarder la Carte
                </Button>
            </div>
        </Card>
    );

    const renderDisplayView = () => (
        selectedCard && (
            <Card>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{selectedCard.store}</h2>
                    <button onClick={() => { setView('list'); setSelectedCard(null); }} className="text-text-light hover:text-primary text-2xl" aria-label="Fermer la vue de la carte">
                        <ion-icon name="close-circle-outline"></ion-icon>
                    </button>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-inner flex flex-col items-center text-center">
                    <p className="text-text-light text-sm mb-4">Scannez le code-barres à la caisse</p>
                    <div style={{ fontFamily: "'Libre Barcode 39', cursive" }} className="text-8xl leading-none break-all">
                        {selectedCard.number}
                    </div>
                    <p className="font-mono text-xl tracking-widest mt-4">{selectedCard.number}</p>
                </div>
            </Card>
        )
    );

    const renderListView = () => (
         <Card>
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => setPage('profile')} className="text-text-light hover:text-primary" aria-label="Retour au profil">
                    <ion-icon name="arrow-back-outline" class="text-2xl"></ion-icon>
                </button>
                <h2 className="text-2xl font-bold">Mes Cartes de Fidélité</h2>
                <div className="w-6"></div> {/* Spacer */}
            </div>
            
            {error && <p className="text-red-500 text-center my-4">{error}</p>}

            {cards.length === 0 ? (
                <p className="text-center text-text-light py-8">Vous n'avez pas encore ajouté de carte de fidélité.</p>
            ) : (
                <div className="space-y-3">
                    {cards.map(card => (
                         <div key={card.id} className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                            <div onClick={() => handleCardSelect(card)} className="cursor-pointer flex-grow">
                                <p className="font-bold text-lg">{card.store}</p>
                                <p className="text-sm text-text-light">{card.number}</p>
                            </div>
                            <button onClick={() => handleDelete(card.id)} className="text-red-500 hover:text-red-700 ml-4" aria-label={`Supprimer la carte de fidélité ${card.store}`}>
                                <ion-icon name="trash-outline"></ion-icon>
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <div className="text-center mt-8">
                <Button onClick={() => setView('add')}>
                    <ion-icon name="add-outline" class="mr-2"></ion-icon>
                    Ajouter une Nouvelle Carte
                </Button>
            </div>
        </Card>
    );

    switch(view) {
        case 'add': return renderAddCardView();
        case 'display': return renderDisplayView();
        case 'list':
        default: return renderListView();
    }
};

export default LoyaltyCards;
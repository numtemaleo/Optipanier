import React, { useState, useCallback, useEffect } from 'react';
import { optimizeShoppingList, getTtsAudio } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/helpers';
import { getAllReceipts } from '../utils/db';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import MarkdownRenderer from './common/MarkdownRenderer';
import type { GenerateContentResponse } from '@google/genai';
import type { MapGroundingSource, ArchivedReceipt } from '../types';

// Web Speech API interface
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const ShoppingListOptimizer: React.FC = () => {
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [result, setResult] = useState<GenerateContentResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const recognitionRef = React.useRef<any | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'fr-FR';
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setNewItem(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setError('La reconnaissance vocale a échoué. Veuillez taper le texte.');
        setIsListening(false);
      };
      
       recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);
  
  const handleVoiceInput = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleAddItem = () => {
    if (newItem.trim()) {
      setItems([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemoveItem = (indexToRemove: number) => {
    setItems(items.filter((_, index) => index !== indexToRemove));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(position.coords);
        setIsGettingLocation(false);
      },
      () => {
        setError("Impossible de récupérer votre position.");
        setIsGettingLocation(false);
      }
    );
  };
  
  const handleOptimize = useCallback(async () => {
    if (items.length === 0) {
      setError('Veuillez ajouter au moins un article à votre liste.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const receiptHistory: ArchivedReceipt[] = await getAllReceipts();
      const response = await optimizeShoppingList(items, location, receiptHistory);
      setResult(response);
    } catch (err) {
      setError("L'optimisation de la liste a échoué. Veuillez réessayer.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [items, location]);

  const playResultAudio = async () => {
    if (result) {
      try {
        const audioData = await getTtsAudio(result.text);
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        const decodedData = decode(audioData);
        const buffer = await decodeAudioData(decodedData, audioContext, 24000, 1);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
      } catch (err) {
        console.error("Failed to play audio:", err);
        setError("Désolé, nous n'avons pas pu jouer l'audio.");
      }
    }
  };
  
  const groundingChunks: MapGroundingSource[] = result?.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => chunk.maps)
    .filter(Boolean) as MapGroundingSource[] || [];


  return (
    <Card>
      <h2 className="text-2xl font-bold mb-4 text-center">Optimiseur de Liste de Courses</h2>
      <p className="text-center text-text-light mb-6">Créez votre liste et laissez notre IA trouver le circuit le moins cher, en se basant sur votre historique et les offres en temps réel !</p>
      
      <div className="flex gap-2 mb-4">
        <div className="relative flex-grow">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            placeholder="Tapez ou utilisez le micro pour ajouter..."
            className="w-full p-3 pl-4 border border-border-light rounded-full focus:ring-2 focus:ring-primary focus:outline-none"
          />
          {recognitionRef.current && (
             <button onClick={handleVoiceInput} className={`absolute right-3 top-1/2 -translate-y-1/2 text-2xl ${isListening ? 'text-red-500 animate-pulse' : 'text-primary'}`} aria-label={isListening ? "Arrêter l'écoute" : 'Démarrer la saisie vocale'}>
                <ion-icon name="mic-outline"></ion-icon>
            </button>
          )}
        </div>
        <Button onClick={handleAddItem} className="w-full sm:w-auto">Ajouter</Button>
      </div>

      <ul className="mb-6 space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
            <span>{item}</span>
            <button onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700" aria-label={`Supprimer ${item}`}>
              <ion-icon name="trash-outline"></ion-icon>
            </button>
          </li>
        ))}
      </ul>

      <div className="text-center space-y-4">
        <Button onClick={handleGetLocation} disabled={isGettingLocation || !!location} variant="secondary">
          {isGettingLocation ? 'Obtention de la position...' : location ? 'Position acquise !' : 'Partager ma position (résultats améliorés)'}
        </Button>
        <Button onClick={handleOptimize} disabled={isLoading || items.length === 0}>
          {isLoading ? 'Optimisation...' : 'Optimiser mon Panier'}
        </Button>
      </div>
      
      {isLoading && <Spinner />}
      {error && <p className="text-red-500 text-center mt-4">{error}</p>}

      {result && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Votre Plan Optimisé</h3>
            <button onClick={playResultAudio} className="text-primary hover:text-green-600 text-2xl" title="Lire le plan à voix haute" aria-label="Lire le plan à voix haute">
                <ion-icon name="volume-high-outline"></ion-icon>
            </button>
          </div>
          <Card className="bg-gray-50">
            <MarkdownRenderer content={result.text} />
          </Card>
          
          {groundingChunks.length > 0 && (
            <div className="mt-6">
                <h4 className="font-bold text-lg mb-2">Lieux Suggérés (depuis Google Maps) :</h4>
                <ul className="space-y-2">
                    {groundingChunks.map((chunk, index) => (
                        <li key={index} className="bg-blue-50 p-3 rounded-lg">
                            <a href={chunk.uri} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline">
                                {chunk.title}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default ShoppingListOptimizer;
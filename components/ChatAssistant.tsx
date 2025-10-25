import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { Chat } from '@google/genai';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import MarkdownRenderer from './common/MarkdownRenderer';
import { getAllReceipts } from '../utils/db';
import type { ChatMessage, GroundingSource, ArchivedReceipt } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const ChatAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const initializeChat = async () => {
        let historyInstruction = '';
        try {
            const savedReceipts: ArchivedReceipt[] = await getAllReceipts();
            
            if (savedReceipts.length > 0) {
                const historySummary = savedReceipts.slice(0, 10).map(r => 
                    `- Un ticket de ${r.store} le ${r.date} d'un total de ${r.total?.toFixed(2)} €.`
                ).join('\n');
                historyInstruction = `\n\nVoici un résumé de l'historique d'achat récent de l'utilisateur :\n${historySummary}\nUtilisez ces informations UNIQUEMENT si l'utilisateur vous interroge sur ses achats passés ou ses habitudes de dépense.`;
            }
        } catch(e) {
            console.error("Could not load purchase history for AI", e);
        }
        
        try {
            const savedHistory = localStorage.getItem('optiPanierQueryHistory');
            if (savedHistory) {
                setQueryHistory(JSON.parse(savedHistory));
            }
        } catch (e) {
            console.error("Failed to parse query history:", e);
        }


        const systemInstruction = `Vous êtes un assistant d'achat serviable nommé OptiPanier. Répondez aux questions des utilisateurs sur les produits, les promotions et les magasins. Gardez vos réponses concises, utiles et bien formatées en utilisant Markdown (tableaux, listes, texte en gras). Lorsque vous fournissez des informations, essayez toujours de les présenter de la manière la plus claire possible, en utilisant un tableau s'il s'agit de comparaisons.` + historyInstruction;

        chatRef.current = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: systemInstruction,
            },
        });
        setMessages([{ role: 'model', text: 'Bonjour ! Comment puis-je vous aider à trouver les meilleures offres aujourd\'hui ?' }]);
    };
    
    initializeChat();

  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (prompt?: string) => {
    const currentInput = prompt || input;
    if (!currentInput.trim() || !chatRef.current) return;

    // Update and save history
    const updatedHistory = [currentInput.trim(), ...queryHistory.filter(q => q.toLowerCase() !== currentInput.trim().toLowerCase())].slice(0, 5);
    setQueryHistory(updatedHistory);
    localStorage.setItem('optiPanierQueryHistory', JSON.stringify(updatedHistory));

    const userMessage: ChatMessage = { role: 'user', text: currentInput };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatRef.current.sendMessage({ message: currentInput });
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(c => c.web).filter(Boolean) as GroundingSource[] || [];
      const modelMessage: ChatMessage = { role: 'model', text: response.text, sources: groundingChunks };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: ChatMessage = { role: 'model', text: 'Désolé, j\'ai rencontré une erreur. Veuillez réessayer.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleHistoryClick = (query: string) => {
    sendMessage(query);
  };

  return (
    <Card className="flex flex-col h-[70vh]">
      <h2 className="text-2xl font-bold mb-4 text-center">Assistant Chat</h2>
      <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-4 mb-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-md p-3 rounded-2xl ${msg.role === 'user' ? 'bg-primary text-white font-semibold' : 'bg-gray-100 text-text-main'}`}>
              <MarkdownRenderer content={msg.text} />
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300/50">
                  <p className="text-xs font-bold mb-1">Sources :</p>
                  <ul className="text-xs space-y-1">
                    {msg.sources.map((source, i) => (
                      <li key={i}>
                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="hover:underline opacity-80 font-normal">
                            {i+1}. {source.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
         {isLoading && (
            <div className="flex justify-start">
                <div className="p-3 rounded-2xl bg-gray-100">
                    <Spinner />
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
          placeholder="Posez une question sur les promos..."
          className="flex-grow p-3 border border-border-light rounded-full focus:ring-2 focus:ring-primary focus:outline-none"
          disabled={isLoading}
        />
        <Button onClick={() => sendMessage()} disabled={isLoading || !input.trim()} aria-label="Envoyer le message">
            <ion-icon name="send" class="text-xl"></ion-icon>
        </Button>
      </div>
      
      {queryHistory.length > 0 && !isLoading && (
          <div className="mt-4 text-center">
              <p className="text-sm text-text-light mb-2">Recherches récentes :</p>
              <div className="flex flex-wrap justify-center gap-2">
                  {queryHistory.map((query, index) => (
                      <button
                          key={index}
                          onClick={() => handleHistoryClick(query)}
                          className="bg-gray-200 text-text-light text-sm px-3 py-1 rounded-full hover:bg-primary/20 hover:text-primary transition-colors"
                      >
                          {query}
                      </button>
                  ))}
              </div>
          </div>
      )}
    </Card>
  );
};

export default ChatAssistant;
import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";
import type { ReceiptData, PriceComparison } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const receiptSchema = {
    type: Type.OBJECT,
    properties: {
        store: { type: Type.STRING, description: 'Nom du supermarché ou magasin.' },
        date: { type: Type.STRING, description: 'Date de l\'achat au format AAAA-MM-JJ.' },
        items: {
            type: Type.ARRAY,
            description: 'Liste des articles achetés.',
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: 'Nom du produit.' },
                    price: { type: Type.NUMBER, description: 'Prix du produit.' },
                },
                required: ['name', 'price'],
            },
        },
        total: { type: Type.NUMBER, description: 'Le montant total du ticket de caisse.' },
    },
    required: ['store', 'date', 'items'],
};

export const analyzeReceipt = async (imageDataBase64: string, mimeType: string): Promise<ReceiptData> => {
    const imagePart = {
        inlineData: {
            mimeType,
            data: imageDataBase64,
        },
    };
    const textPart = {
        text: 'Analysez ce ticket de caisse et extrayez le nom du magasin, la date, et une liste de tous les articles avec leurs prix. Fournissez le résultat au format JSON demandé.',
    };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: receiptSchema,
        }
    });

    const jsonString = response.text.trim();
    return JSON.parse(jsonString);
};

export const analyzeLoyaltyCard = async (imageDataBase64: string, mimeType: string): Promise<{ store: string, number: string }> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            store: { type: Type.STRING, description: "Le nom du magasin pour la carte de fidélité (ex: 'Carrefour', 'Lidl')." },
            number: { type: Type.STRING, description: "Le numéro de la carte de fidélité ou du code-barres sous forme de chaîne." }
        },
        required: ['store', 'number']
    };

    const imagePart = {
        inlineData: {
            mimeType,
            data: imageDataBase64,
        },
    };
    const textPart = {
        text: 'Analysez cette image d\'une carte de fidélité. Extrayez le nom du magasin et le numéro complet de la carte. Fournissez le résultat au format JSON demandé.',
    };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
        }
    });

    return JSON.parse(response.text.trim());
};


export const optimizeShoppingList = async (items: string[], location: GeolocationCoordinates | null, receiptHistory: ReceiptData[]): Promise<GenerateContentResponse> => {
    
    let historyInstruction = '';
    if (receiptHistory.length > 0) {
        const historySummary = receiptHistory.slice(0, 20).map(r => 
            `Le ${r.date} chez ${r.store}, les articles incluaient : ${r.items.slice(0, 5).map(i => `${i.name} (${i.price.toFixed(2)}€)`).join(', ')}.`
        ).join('\n');
        historyInstruction = `Pour information, voici un résumé de l'historique d'achat récent de l'utilisateur. Utilisez-le pour guider vos recommandations sur les magasins où les articles sont historiquement les moins chers pour cet utilisateur :\n${historySummary}\n`;
    }
    
    const prompt = `
        Vous êtes un assistant d'achat expert nommé OptiPanier.
        Votre objectif est de m'aider à économiser sur mes courses.
        Voici ma liste de courses :
        ${items.map(item => `- ${item}`).join('\n')}

        ${historyInstruction}

        Veuillez créer un plan d'achat optimisé. Suggérez quels articles acheter dans quelles grandes surfaces (ex: Carrefour, Leader Price, Market, etc.) pour minimiser le coût total.
        Prenez en compte TROIS facteurs : 
        1. L'historique de prix personnel de l'utilisateur (si fourni) pour voir où il obtient habituellement de bons prix.
        2. Les promotions en temps réel et les prix actuels via la recherche Google.
        3. Un itinéraire logique multi-magasins.

        Si la localisation de l'utilisateur est fournie, suggérez des magasins à proximité.
        Formatez votre réponse en Markdown clair et lisible, en incluant des tableaux si pertinent.
    `;

    const config: any = {
        tools: [{ googleMaps: {} }],
    };

    if (location) {
        config.toolConfig = {
            retrievalConfig: {
                latLng: {
                    latitude: location.latitude,
                    longitude: location.longitude
                }
            }
        }
    }
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            ...config,
            thinkingConfig: { thinkingBudget: 32768 }
        },
    });
    return response;
}

export const getTtsAudio = async (text: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No audio data received from API.");
    }
    return base64Audio;
};

export const compareItemPrices = async (itemName: string): Promise<{ comparison: PriceComparison[] }> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            comparison: {
                type: Type.ARRAY,
                description: 'Liste des prix pour l\'article dans différents magasins.',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        store: { type: Type.STRING, description: 'Nom du supermarché.' },
                        productName: { type: Type.STRING, description: 'Le nom spécifique du produit trouvé.' },
                        price: { type: Type.NUMBER, description: 'Le prix de l\'article.' },
                        promotion: { type: Type.STRING, description: "Détails de toute promotion, ex: '2 pour 1', '20% de remise'. Utiliser 'N/A' si aucune." }
                    },
                    required: ['store', 'productName', 'price']
                }
            }
        },
        required: ['comparison']
    };

    const prompt = `Trouvez et comparez les prix pour l'article "${itemName}" dans plusieurs grands supermarchés français comme Carrefour, E.Leclerc, Auchan, Intermarché, et Lidl. Cherchez les prix actuels et les promotions actives. Fournissez le résultat au format JSON demandé. Si vous trouvez une bonne affaire, mettez-la en évidence. Retournez UNIQUEMENT le JSON, sans aucun texte ou formatage supplémentaire.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        }
    });

    try {
        // Clean the response to ensure it's valid JSON
        let jsonString = response.text.trim();
        if (jsonString.startsWith('```json')) {
            jsonString = jsonString.substring(7);
        }
        if (jsonString.endsWith('```')) {
            jsonString = jsonString.slice(0, -3);
        }
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse JSON from AI response:", response.text);
        throw new Error("Received an invalid format from the AI.");
    }
};
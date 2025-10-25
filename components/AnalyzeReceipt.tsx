import React, { useState, useCallback, useEffect } from 'react';
import { analyzeReceipt } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';
import { addReceipt, getAllReceipts, deleteReceipt } from '../utils/db';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import ReceiptArchive from './ReceiptArchive';
import type { ReceiptData, ArchivedReceipt } from '../types';

const AnalyzeReceipt: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [archivedReceipts, setArchivedReceipts] = useState<ArchivedReceipt[]>([]);

  const loadReceipts = useCallback(async () => {
    try {
      const receipts = await getAllReceipts();
      setArchivedReceipts(receipts);
    } catch (e) {
      console.error("Failed to load archived receipts:", e);
      setError("Impossible de charger les archives depuis la base de données.");
    }
  }, []);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setReceiptData(null);
      setError(null);
      setSuccessMessage(null);
      const b64 = await fileToBase64(file);
      setImageBase64(b64);
    }
  };

  const resetForm = () => {
    setImageFile(null);
    setImagePreview(null);
    setReceiptData(null);
    setImageBase64(null);
  };

  const handleAnalyzeClick = useCallback(async () => {
    if (!imageFile || !imageBase64) return;
    setIsLoading(true);
    setError(null);
    setReceiptData(null);
    setSuccessMessage(null);
    try {
      const result = await analyzeReceipt(imageBase64, imageFile.type);
      setReceiptData(result);
    } catch (err) {
      setError("L'analyse du ticket a échoué. Veuillez réessayer.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [imageFile, imageBase64]);
  
  const saveToArchive = async () => {
    if (!receiptData || !imageBase64) return;
    
    const newReceipt: ArchivedReceipt = {
      ...receiptData,
      id: Date.now().toString(),
      imageBase64,
    }

    try {
        await addReceipt(newReceipt);
        setSuccessMessage('Ticket sauvegardé avec succès dans vos archives !');
        resetForm();
        loadReceipts(); // Refresh the list
        setTimeout(() => setSuccessMessage(null), 4000);
    } catch (e) {
        setError("Impossible de sauvegarder le ticket dans la base de données.");
    }
  };
  
  const handleDeleteReceipt = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer définitivement ce ticket ?')) {
        try {
            await deleteReceipt(id);
            loadReceipts();
        } catch (e) {
            setError("La suppression du ticket a échoué.");
        }
    }
  };

  return (
    <>
      <Card>
        <h2 className="text-2xl font-bold mb-4 text-center text-text-main">Scanner un Ticket de Caisse</h2>
        <p className="text-center text-text-light mb-6">Uploadez la photo de votre ticket pour en extraire automatiquement les détails et l'archiver.</p>
        
        {successMessage && (
            <div className="bg-primary/10 border border-primary text-primary px-4 py-3 rounded-lg relative mb-6 text-center" role="alert">
                <strong className="font-bold">Succès !</strong>
                <span className="block sm:inline ml-2">{successMessage}</span>
            </div>
        )}

        <div className="flex flex-col items-center gap-6">
          <label htmlFor="receipt-upload" className="w-full max-w-sm cursor-pointer bg-gray-50 border-2 border-dashed border-border-light rounded-xl p-8 text-center hover:bg-primary/10 transition-colors">
            <ion-icon name="cloud-upload-outline" class="text-4xl text-primary mx-auto"></ion-icon>
            <p className="mt-2 text-text-light">{imageFile ? imageFile.name : 'Cliquez pour uploader un ticket'}</p>
            <input id="receipt-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
          
          {imagePreview && (
            <div className="w-full max-w-sm">
              <h3 className="font-bold text-lg mb-2">Aperçu de l'image :</h3>
              <img src={imagePreview} alt="Receipt preview" className="rounded-lg shadow-md w-full" />
            </div>
          )}

          <Button onClick={handleAnalyzeClick} disabled={!imageFile || isLoading}>
            {isLoading ? 'Analyse en cours...' : 'Analyser le Ticket'}
          </Button>
        </div>

        {isLoading && <Spinner />}
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        
        {receiptData && (
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4 text-center">Résultats de l'Analyse</h3>
            <Card className="bg-gray-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-lg">
                  <p><strong>Magasin :</strong> {receiptData.store}</p>
                  <p><strong>Date :</strong> {receiptData.date}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="p-3 rounded-l-lg">Article</th>
                      <th className="p-3 rounded-r-lg text-right">Prix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptData.items.map((item, index) => (
                      <tr key={index} className="border-b border-border-light">
                        <td className="p-3">{item.name}</td>
                        <td className="p-3 text-right">€{item.price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {receiptData.total && (
                  <p className="text-right font-bold text-xl mt-4">Total : €{receiptData.total.toFixed(2)}</p>
              )}
            </Card>
            <div className="text-center mt-6">
                <Button onClick={saveToArchive} variant="secondary">
                    <ion-icon name="archive-outline" class="mr-2"></ion-icon>
                    Confirmer & Archiver
                </Button>
            </div>
          </div>
        )}
      </Card>
      <ReceiptArchive receipts={archivedReceipts} onDelete={handleDeleteReceipt} />
    </>
  );
};

export default AnalyzeReceipt;
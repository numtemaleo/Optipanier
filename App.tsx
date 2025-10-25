import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AnalyzeReceipt from './components/AnalyzeReceipt';
import ShoppingListOptimizer from './components/ShoppingListOptimizer';
import ChatAssistant from './components/ChatAssistant';
import LiveAssistant from './components/LiveAssistant';
import ItemComparer from './components/ItemComparer';
import Profile from './components/Profile';
import BudgetTracker from './components/BudgetTracker';
import PriceAlerts from './components/PriceAlerts';
import ReceiptLog from './components/ReceiptLog';
import LoyaltyCards from './components/LoyaltyCards';
import { initDB } from './utils/db';
import { useAppContext } from './components/AppContext';

const App: React.FC = () => {
  const { page } = useAppContext();
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDB().then(success => {
      if (success) {
        setDbReady(true);
      } else {
        setError("Erreur Critique : Impossible d'initialiser la base de données. L'application ne peut pas fonctionner.");
        console.error("Failed to initialize database");
      }
    });
  }, []);

  const renderPage = () => {
    if (error) {
        return <div className="text-center p-10 text-red-600 font-bold">{error}</div>;
    }
    if (!dbReady) {
      return <div className="text-center p-10">Initialisation de la base de données...</div>;
    }
    switch (page) {
      case 'analyze':
        return <AnalyzeReceipt />;
      case 'list':
        return <ShoppingListOptimizer />;
      case 'compare':
        return <ItemComparer />;
      case 'chat':
        return <ChatAssistant />;
      case 'live':
        return <LiveAssistant />;
      case 'profile':
        return <Profile />;
      case 'cards':
        return <LoyaltyCards />;
      case 'budget':
        return <BudgetTracker />;
       case 'alerts':
        return <PriceAlerts />;
      case 'receiptLog':
        return <ReceiptLog />;
      default:
        return <AnalyzeReceipt />;
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-text-main">
      <div className="container mx-auto max-w-4xl p-4">
        <header className="text-center my-8">
          <h1 className="text-5xl font-bold text-primary">OptiPanier</h1>
          <p className="text-text-light mt-2 text-lg">Votre assistant d'achat intelligent pour un maximum d'économies !</p>
        </header>
        
        <Header />
        
        <main className="mt-8">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default App;
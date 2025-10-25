export type Page = 'analyze' | 'list' | 'chat' | 'live' | 'compare' | 'profile' | 'cards' | 'budget' | 'alerts' | 'receiptLog';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  sources?: GroundingSource[];
}

export interface ReceiptItem {
  name: string;
  price: number;
}

export interface ReceiptData {
  store: string;
  date: string;
  items: ReceiptItem[];
  total?: number;
}

export interface ArchivedReceipt extends ReceiptData {
  id: string;
  imageBase64: string;
}

export interface GroundingSource {
    uri: string;
    title: string;
}

export interface MapGroundingSource {
    uri: string;
    title: string;
    placeAnswerSources?: {
        reviewSnippets?: {
            text: string;
        }[]
    }[]
}

export interface PriceComparison {
    store: string;
    productName: string;
    price: number;
    promotion?: string;
}

export interface LoyaltyCard {
    id: string;
    store: string;
    number: string;
}

export interface AlertItem {
    id: string;
    name: string;
    deal?: PriceComparison;
}

export type DBStore = 'receipts' | 'loyaltyCards';

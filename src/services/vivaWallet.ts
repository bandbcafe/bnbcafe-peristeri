interface VivaWalletConfig {
  clientId: string;
  clientSecret: string;
  merchantId: string;
  apiKey: string;
  sourceCode: string;
  testMode: boolean;
}

interface PaymentOrderRequest {
  amount: number; // σε cents (π.χ. 1000 = €10.00)
  customerTrns: string;
  customer: {
    email: string;
    fullName: string;
    phone?: string;
    countryCode?: string;
    requestLang?: string;
  };
  sourceCode: string;
  merchantTrns: string;
  paymentTimeout?: number;
  tags?: string[];
}

interface PaymentOrderResponse {
  orderCode: string;
}

interface VivaTransaction {
  email: string;
  amount: number;
  orderCode: string;
  statusId: string;
  fullName: string;
  insDate: string;
  cardNumber?: string;
  currencyCode: string;
  customerTrns: string;
  merchantTrns: string;
  transactionTypeId: number;
  recurringSupport: boolean;
  totalInstallments: number;
  cardCountryCode?: string;
  cardIssuingBank?: string;
  currentInstallment: number;
  cardTypeId?: number;
}

class VivaWalletService {
  private config: VivaWalletConfig;
  private baseUrl: string;
  private accountsUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: VivaWalletConfig) {
    this.config = config;
    this.baseUrl = config.testMode 
      ? 'https://demo-api.vivapayments.com'
      : 'https://api.vivapayments.com';
    this.accountsUrl = config.testMode
      ? 'https://demo-accounts.vivapayments.com'
      : 'https://accounts.vivapayments.com';
  }

  /**
   * Λήψη access token με OAuth2
   */
  private async getAccessToken(): Promise<string> {
    // Έλεγχος αν το token είναι ακόμα έγκυρο
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      // Base64 encode των credentials
      const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

      const response = await fetch(`${this.accountsUrl}/connect/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[Viva] Token error: ${response.status}`, errorBody);
        console.error(`[Viva] Mode: ${this.config.testMode ? 'DEMO' : 'PRODUCTION'}, URL: ${this.accountsUrl}`);
        throw new Error(`Viva auth failed (${response.status}): ${errorBody}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      // Αφαιρούμε 60 δευτερόλεπτα για ασφάλεια
      this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

      return this.accessToken!;
    } catch (error) {
      console.error('Error getting Viva Wallet access token:', error);
      throw error;
    }
  }

  /**
   * Δημιουργία payment order
   */
  async createPaymentOrder(orderData: PaymentOrderRequest): Promise<PaymentOrderResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/checkout/v2/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          amount: orderData.amount,
          customerTrns: orderData.customerTrns,
          customer: {
            email: orderData.customer.email,
            fullName: orderData.customer.fullName,
            phone: orderData.customer.phone || '',
            countryCode: orderData.customer.countryCode || 'GR',
            requestLang: orderData.customer.requestLang || 'el-GR',
          },
          sourceCode: orderData.sourceCode,
          merchantTrns: orderData.merchantTrns,
          paymentTimeout: orderData.paymentTimeout || 1800, // 30 λεπτά
          tags: orderData.tags || [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`[Viva] Create order failed: ${response.status}`, errorData);
        console.error(`[Viva] Using ${this.config.testMode ? 'DEMO' : 'PRODUCTION'} mode`);
        console.error(`[Viva] Source code: ${orderData.sourceCode}`);
        throw new Error(`Viva ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      return { orderCode: data.orderCode.toString() };
    } catch (error) {
      console.error('Error creating Viva Wallet payment order:', error);
      throw error;
    }
  }

  /**
   * Επαλήθευση πληρωμής
   */
  async verifyTransaction(transactionId: string): Promise<VivaTransaction> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/checkout/v2/transactions/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to verify transaction: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error verifying Viva Wallet transaction:', error);
      throw error;
    }
  }

  /**
   * Δημιουργία Smart Checkout URL
   */
  getCheckoutUrl(orderCode: string): string {
    const baseCheckoutUrl = this.config.testMode
      ? 'https://demo.vivapayments.com/web/checkout'
      : 'https://www.vivapayments.com/web/checkout';
    
    return `${baseCheckoutUrl}?ref=${orderCode}`;
  }

  /**
   * Έλεγχος αν οι ρυθμίσεις είναι έγκυρες
   */
  isConfigValid(): boolean {
    return !!(
      this.config.clientId &&
      this.config.clientSecret &&
      this.config.merchantId &&
      this.config.sourceCode
    );
  }
}

export { VivaWalletService, type VivaWalletConfig, type PaymentOrderRequest, type VivaTransaction };

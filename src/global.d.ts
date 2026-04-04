export {};

declare global {
  interface Note {
    id: number;
    title: string;
    text: string;
    timestamp: string;
  }

  interface Supplier {
    id: number;
    companyName: string;
    phone: string;
    email: string;
    vatNumber: string;
    supplierType: string;
  }

  interface Reservation {
    id: number;
    title: string;
    description: string;
    phone: string;
    numberOfPeople: number;
    pricePerPerson: number;
    date: string;
    time: string;
  }

  interface Order {
    id: number;
    date_created: string;
    total: string;
    status: string;
    billing: {
      first_name: string;
      last_name: string;
      address_1: string;
      address_2?: string;
      city: string;
      state: string;
      postcode: string;
      phone: string;
    };
    line_items: Array<{
      id: number;
      name: string;
      product_id: number;
      quantity: number;
      total: string;
      total_tax: string;
      meta_data: Array<{ key: string; value: string }>;
    }>;
    meta_data: Array<{ key: string; value: string }>;
    payment_method: string;
    customer_note?: string;
    discount_total?: string;
  }


  interface Window {
    api: {
      // Sound Notifications
      onPlaySound: (callback: () => void) => void;
      onStopSound: (callback: () => void) => void;
      onGoToOrders: (callback: () => void) => void;

      // Suppliers Management
      getSuppliers: () => Promise<Supplier[]>;
      saveSuppliers: (suppliers: Supplier[]) => Promise<void>;
      editSupplier: (id: number, updatedSupplier: Supplier) => Promise<void>;
      deleteSupplier: (id: number) => Promise<void>;

      // Reservations Management
      getReservations: () => Promise<Reservation[]>;
      saveReservations: (reservations: Reservation[]) => Promise<void>;
      editReservation: (id: number, updatedReservation: Reservation) => Promise<void>;
      deleteReservation: (id: number) => Promise<void>;

      // Chat Management
      getChatNotes: () => Promise<Note[]>;
      saveChatNotes: (notes: Note[]) => Promise<void>;
      editChatNote: (id: number, updatedNote: Partial<Note>) => Promise<void>;
      deleteChatNote: (id: number) => Promise<void>;
      // Νέα μέθοδος για ενημέρωση δεδομένων
    onDataUpdated: (callback: () => void) => void;
    };
  }
}

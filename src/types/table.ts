export interface Table {
  id: string;
  name: string; // e.g., "Table 1", "A1", "VIP-1"
  status: 'available' | 'open' | 'closed' | 'alert';
  total: number;
  invoices: string[]; // Array of invoice IDs
  
  // Layout properties for visual positioning
  x: number; // X coordinate in the layout
  y: number; // Y coordinate in the layout
  width: number; // Width of the table
  height: number; // Height of the table
  rotation: number; // Rotation angle in degrees
  shape: 'rectangle' | 'circle' | 'square';
  seats: number; // Number of seats/chairs
  
  // WRAPP API integration
  wrappId?: string; // ID from WRAPP API when synced
  wrappData?: {
    lastSyncedAt?: Date; // Last time synced with WRAPP
    lastOrdersLoadedAt?: Date; // Last time orders were loaded
    wrappStatus?: string; // Original status from WRAPP
    wrappTotal?: string; // Original total from WRAPP (as string)
    invoiceCount?: number; // Number of invoices
    hasOrderData?: boolean; // Whether order data has been loaded
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  isActive: boolean;
  
  // Additional properties
  notes?: string;
  section?: string; // e.g., "Main Hall", "Terrace", "VIP Area"
  color?: string; // Custom color for the table
}

export interface TableLayout {
  id: string;
  name: string; // e.g., "Main Layout", "Summer Setup"
  description?: string;
  
  // Layout dimensions
  width: number; // Layout canvas width
  height: number; // Layout canvas height
  
  // Background and styling
  backgroundColor?: string;
  backgroundImage?: string;
  gridSize?: number; // Grid snap size for positioning
  
  // Room dimensions (real-world measurements)
  roomWidth?: number; // Real room width in meters
  roomHeight?: number; // Real room height in meters
  roomUnit?: 'meters' | 'feet'; // Unit of measurement
  
  // Divider lines
  dividerLines?: DividerLine[];
  
  // Price list for this layout
  selectedPriceListId?: string;
  
  // Tables in this layout
  tables: Table[];
  
  // Metadata
  isActive: boolean; // Currently active layout
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface DividerLine {
  id: string;
  name?: string; // Optional name for the divider
  x1: number; // Start X coordinate
  y1: number; // Start Y coordinate
  x2: number; // End X coordinate
  y2: number; // End Y coordinate
  color?: string; // Line color
  thickness?: number; // Line thickness in pixels
  style?: 'solid' | 'dashed' | 'dotted'; // Line style
  type?: 'wall' | 'partition' | 'decoration'; // Type of divider
}

export interface TableFormData {
  name: string;
  seats: number;
  section?: string;
  shape: 'rectangle' | 'circle' | 'square';
  width: number;
  height: number;
  color?: string;
  notes?: string;
}

export interface TablePosition {
  x: number;
  y: number;
  rotation: number;
}

export interface TableStats {
  total: number;
  available: number;
  open: number;
  closed: number;
  alert: number;
}

// WRAPP API interfaces based on documentation
export interface WrappTable {
  id: string;
  status: 'available' | 'open' | 'closed' | 'alert';
  name: string;
  total: string; // WRAPP returns as string
  invoices?: string[];
  error_message?: string | null;
}

export interface WrappTableCreateRequest {
  name?: string; // Optional - if not specified, a number will be assigned
}

export interface WrappTableUpdateRequest {
  name: string; // Required for update
}

export interface WrappTableOpenRequest {
  id?: string; // Required unless name is specified
  name?: string; // Required unless id is specified
}

export interface WrappTableTransferRequest {
  current_table: string; // Required - ID of source table
  target_table: string; // Required - ID of target table
  marks?: string[]; // Optional - myDATA marks to transfer
}

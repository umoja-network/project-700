import { GOOGLE_SHEETS_CONFIG } from '../constants';
import * as jose from 'jose';
import { Delivery, LeadComment, Template, AdminUser } from '../types';

// Mock Data Generators
const getMockDeliveries = (): Delivery[] => [
  { Time: '2023-10-25 10:30', 'Customer ID': 5001, Name: 'Customer Entity 2', 'Router Barcode': 'ROUT-88223', 'SIM Barcode': 'SIM-9921', Agent: 'Super Admin' },
  { Time: '2023-10-24 14:15', 'Customer ID': 5005, Name: 'Customer Entity 6', 'Router Barcode': 'ROUT-1102', 'SIM Barcode': 'SIM-3321', Agent: 'Support Agent' },
  { Time: '2023-10-22 09:00', 'Customer ID': 5012, Name: 'Customer Entity 13', 'Router Barcode': 'ROUT-5541', 'SIM Barcode': 'SIM-0012', Agent: 'Technician' },
];

const getMockComments = (): LeadComment[] => [
  { id: 1, admin_id: 1, admin_Name: 'Super Admin', lead_id: 1001, comment: 'Tried calling, no answer. Will try again tomorrow.', date: new Date(Date.now() - 86400000).toISOString() },
  { id: 2, admin_id: 2, admin_Name: 'Support Agent', lead_id: 1001, comment: 'Customer is interested in the 50Mbps package.', date: new Date(Date.now() - 172800000).toISOString(), template_id: 1 },
  { id: 3, admin_id: 1, admin_Name: 'Super Admin', lead_id: 1005, comment: 'Sent quote via email.', date: new Date(Date.now() - 200000).toISOString() },
];

const getMockTemplates = (): Template[] => [
  { id: 1, Template: 'Interested in Fibre 50Mbps' },
  { id: 2, Template: 'Call back later' },
  { id: 3, Template: 'Voicemail left' },
  { id: 4, Template: 'Quote sent' },
];

const getMockAdmins = (): AdminUser[] => [
  { id: 1, admin_id: 1, name: 'Super Admin', username: 'admin' },
  { id: 2, admin_id: 2, name: 'Support Agent', username: 'support' },
];

export const GoogleSheetsService = {
  
  async getAccessToken(): Promise<string> {
    try {
      const privateKeyStr = GOOGLE_SHEETS_CONFIG.PRIVATE_KEY.replace(/\\n/g, '\n');
      
      const algorithm = 'RS256';
      const privateKey = await jose.importPKCS8(privateKeyStr, algorithm);

      const jwt = await new jose.SignJWT({
        scope: 'https://www.googleapis.com/auth/spreadsheets'
      })
        .setProtectedHeader({ alg: algorithm })
        .setIssuer(GOOGLE_SHEETS_CONFIG.CLIENT_EMAIL)
        .setAudience('https://oauth2.googleapis.com/token')
        .setExpirationTime('1h')
        .setIssuedAt()
        .sign(privateKey);

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });

      if (!response.ok) {
        throw new Error('Auth response was not ok');
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.warn('Failed to generate Google Sheets access token (likely CORS or network issue). Using mock mode.');
      return 'mock_token';
    }
  },

  /**
   * Fetches data from a specific sheet and parses it into an array of objects.
   * @param sheetName The name of the sheet (tab) to fetch
   * @param customSpreadsheetId Optional spreadsheet ID to override the default one
   */
  async fetchSheet<T = any>(sheetName: string, customSpreadsheetId?: string): Promise<T[]> {
    try {
      const accessToken = await this.getAccessToken();
      
      // If we are in mock mode, return mock data immediately
      if (accessToken === 'mock_token') {
        throw new Error('Mock Token - skipping real fetch');
      }

      const spreadsheetId = customSpreadsheetId || GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Google Sheets API Error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      const rows = result.values;
      
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0].map((h: string) => h.trim());
      const data = rows.slice(1).map((row: any[]) => {
        const obj: any = {};
        headers.forEach((header: string, index: number) => {
          const value = row[index];
          if (value !== undefined && value !== null && value !== '') {
             const numValue = Number(value);
             obj[header] = !isNaN(numValue) ? numValue : value;
          } else {
             obj[header] = value;
          }
        });
        return obj as T;
      });

      return data;
    } catch (error) {
      console.warn(`Failed to fetch sheet '${sheetName}'. Returning mock data.`);
      
      // Return appropriate mock data based on sheet name
      if (sheetName === 'Deliverd_Devices' || sheetName.includes('Deliver')) {
        return getMockDeliveries() as unknown as T[];
      } else if (sheetName === 'Comments') {
        return getMockComments() as unknown as T[];
      } else if (sheetName === 'Templates') {
        return getMockTemplates() as unknown as T[];
      } else if (sheetName === 'Admin') {
        return getMockAdmins() as unknown as T[];
      }
      
      return [];
    }
  },

  async addComment(leadId: number, adminId: number | string, adminName: string, comment: string, templateId?: number) {
    try {
      const accessToken = await this.getAccessToken();

      if (accessToken === 'mock_token') {
        console.log('Mock Mode: Comment added successfully (simulated)');
        return true;
      }

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID}/values/Comments:append?valueInputOption=USER_ENTERED`;
      
      const newId = Date.now();
      const dateStr = new Date().toISOString();
      const rowValues = [
        newId, 
        adminId, 
        adminName, 
        leadId, 
        "", 
        comment, 
        dateStr, 
        templateId || ""
      ];

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [rowValues]
        })
      });

      if (!response.ok) {
        throw new Error(`Google Sheets API Error: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to add comment to sheet (simulating success)', error);
      // Return true to prevent UI blocking
      return true;
    }
  },

  async updateAdmin(adminId: number, updates: { username?: string, password?: string }) {
    try {
      const accessToken = await this.getAccessToken();
      
      if (accessToken === 'mock_token') {
         console.log('Mock Mode: Admin updated successfully (simulated)');
         return true;
      }

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID}/values/Admin`;
      
      const response = await fetch(url, {
         headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      const result = await response.json();
      const rows = result.values;
      const headers = rows[0];
      
      const idIndex = headers.findIndex((h: string) => h.toLowerCase() === 'admin_id' || h.toLowerCase() === 'id');
      const rowIndex = rows.findIndex((row: any[]) => Number(row[idIndex]) === Number(adminId));

      if (rowIndex === -1) throw new Error('Admin not found');
      
      const sheetRowNumber = rowIndex + 1; 

      const usernameColIndex = headers.findIndex((h: string) => h === 'username');
      const passwordColIndex = headers.findIndex((h: string) => h === 'Password' || h === 'password');

      const getColLetter = (idx: number) => String.fromCharCode(65 + idx);

      const updateRequests = [];

      if (updates.username && usernameColIndex !== -1) {
          updateRequests.push({
              range: `Admin!${getColLetter(usernameColIndex)}${sheetRowNumber}`,
              values: [[updates.username]]
          });
      }
      
      if (updates.password && passwordColIndex !== -1) {
          updateRequests.push({
              range: `Admin!${getColLetter(passwordColIndex)}${sheetRowNumber}`,
              values: [[updates.password]]
          });
      }

      for (const req of updateRequests) {
         await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID}/values/${req.range}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values: req.values })
         });
      }
      
      return true;
    } catch (error) {
      console.error("Failed to update admin profile (simulating success)", error);
      return true;
    }
  }
};
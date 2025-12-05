
import { GOOGLE_SHEETS_CONFIG } from '../constants';
import * as jose from 'jose';

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

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error('Failed to generate access token:', error);
      throw error;
    }
  },

  /**
   * Fetches data from a specific sheet and parses it into an array of objects.
   */
  async fetchSheet<T = any>(sheetName: string): Promise<T[]> {
    try {
      const accessToken = await this.getAccessToken();
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID}/values/${sheetName}`;
      
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
      console.error(`Failed to fetch sheet '${sheetName}'`, error);
      return [];
    }
  },

  async addComment(leadId: number, adminId: number | string, adminName: string, comment: string, templateId?: number) {
    try {
      const accessToken = await this.getAccessToken();
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID}/values/Comments:append?valueInputOption=USER_ENTERED`;
      
      // Order: id, admin_id, admin_Name, lead_id, lead_name, comment, date, template_id
      // We generate a simple numeric ID based on timestamp
      const newId = Date.now();
      const dateStr = new Date().toISOString();
      const rowValues = [
        newId, 
        adminId, 
        adminName, 
        leadId, 
        "", // lead_name not always available in context, skipping
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
      console.error('Failed to add comment to sheet', error);
      throw error;
    }
  },

  async updateAdmin(adminId: number, updates: { username?: string, password?: string }) {
    try {
      // 1. Fetch current admins to find row index
      const accessToken = await this.getAccessToken();
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID}/values/Admin`;
      
      const response = await fetch(url, {
         headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      const result = await response.json();
      const rows = result.values;
      const headers = rows[0];
      
      // Find row index (1-based for Sheets API, but array is 0-based)
      // Assuming 'admin_id' is one of the headers
      const idIndex = headers.findIndex((h: string) => h.toLowerCase() === 'admin_id' || h.toLowerCase() === 'id');
      const rowIndex = rows.findIndex((row: any[]) => Number(row[idIndex]) === Number(adminId));

      if (rowIndex === -1) throw new Error('Admin not found');
      
      const sheetRowNumber = rowIndex + 1; // 1-based index

      // 2. Determine columns to update
      const usernameColIndex = headers.findIndex((h: string) => h === 'username');
      const passwordColIndex = headers.findIndex((h: string) => h === 'Password' || h === 'password');

      // Helper to convert index to A1 notation (0 -> A, 26 -> AA) - Simplified for A-Z
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

      // Execute updates
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
      console.error("Failed to update admin profile", error);
      throw error;
    }
  }
};

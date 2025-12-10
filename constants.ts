

export const API_CONFIG = {
  LEADS_URL: 'https://portal.umoja.network/api/2.0/admin/crm/leads',
  LEADS_INFO_URL: 'https://portal.umoja.network/api/2.0/admin/crm/leads-info',
  CUSTOMERS_URL: 'https://portal.umoja.network/api/2.0/admin/customers/customer',
  CUSTOMER_BILLING_URL: 'https://portal.umoja.network/api/2.0/admin/customers/customer-billing/',
  CUSTOMER_NOTES_URL: 'https://portal.umoja.network/api/2.0/admin/customers/customer-notes',
  INVENTORY_URL: 'https://portal.umoja.network/api/2.0/admin/inventory/items',
  HEADERS: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic NGQwNzQwZGE2NjFjYjRlYTQzMjM2NmM5MGZhZGUxOWU6MmE0ZDkzOGVkNTYyMjg5MmExNDdmMjZjMmVlNTI2MmI='
  }
};

export const GOOGLE_SHEETS_CONFIG = {
  API_KEY: 'AIzaSyB7KkrxEuYwukMKD_IrI26Mj6NEijnlcck',
  SPREADSHEET_ID: '1uVkX1QGeiQ4njAC0IG6pQL6qip7bzrYNimpQYIwRS1s',
  DELIVERY_SPREADSHEET_ID: '1MkikAnYCWwW7T6S1Vo4tJsPicYoK05SzBN3DE_LbxmQ',
  CLIENT_EMAIL: 'project-700@trim-artifact-454314-d9.iam.gserviceaccount.com',
  // Using explicit newline characters for PEM format to avoid parsing errors
  PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDc1b9BcoKN2oFC\nCiizt5Sd7qTXcQQNjgKC6uOA0Uq4PPA/L34SF1l88PkC7+pOCBkBDAv591qLAyAc\ndHsjRpp4nHT3qdGFdjJVsKFOJ0pRL9kxQzGtaU97XSXuawqWqvoa+bxKKAee6sQ0\nov2tk3b44aFpM/lI/rtTsooRqVRC/Q20co84RiaDf2P05mJkYD7x0Qk1TRBU5J3Q\nHOMQDKnbAf3jEZtOjg/ZU/YktMEr6wiAI9qIfbuxrwICg9BrMgPVLZJuG+W0wnv/\n4kOm3WXP172+EZzHbk0Ss2/vrgWnhHOB6iNKQ5tCjZzfxLjbNxYnO5gbwtNwr2lT\nH4LLVTIFAgMBAAECggEAaDZaRflS0LxPiSmgIYc9k/X9Rknn/rmIR92utKiPmTfw\nq/Cujr0EFujkqdUr/dzmZ88Wi8SFrtovuh3hyjjURpyWuhUicdfgUv3CcU4rTPrG\nhO/PrqTmxDGl58gNvCI9WqOFjn0rc3wYUTqledcAKtzXPf0v45mKLyou67y7rcw6\n0XuMA3zUgOTB4qcPspfMaOZTIhi1et0R4bDeM1cm4apF8xwlG09qokO/GJDdHMY5\n2T9S8dYdxH//fCi+lJrngxkEFalcje7Tvwk2yUk+3o/NGaZi9Y4DZTHauNTOmujL\npG1F8giDQta8FvtE3br+uXHx4i9Gs11OiEYFYduSdQKBgQDwnDElF5EM55sS1atW\n1qODGXoSOUGmGNcCOdD/sZCZqlo4r6ytOkZGz3cDjZDYubwUQKqnUFfrogKUkOXL\nue3iQ6sdRqbOAa4aXCZThJJ7aiX0c0DcxOMsvNmRKFX3ogUyakzDv85zA0ABZqhn\n4lP7SQ3t6y7AgD5Z+rF5cCwCKwKBgQDq9cBr2WXGumJcbxwI1U0HMruaYUnn3/gU\nd1tklpqBmjWgQT3oZaT7l5rU8AZmssU4PoDnpvV3gLjaLS9O47r6tItL6wLPkyIk\nMCnIXUt4C109/Epd/NLrAFeB9w0qAp8X7RXZl0R7lTMLlBFRElEifwOYdUoB4dTp\nuBjlfY30jwKBgB8jB1UWfKXf3viMABVHx3cyt9Jd6Hn3IvPdyYcdUmogWnaVfVIZ\nhXiqZmtmSYVSW91/FNZ8FjSfDZhuO96mW/t46E7skq98FizBGhCayl4AOZMtywoG\nzKNAeSNIxf86z1Nb4D1AuBW4KPNFdqui5V1SceQFGFK/BdKdF5RwiLFrAoGAdqwL\nNS3HfvkypvcjlL6POjyAjrfmySvRNB0Y1xROE3mc7kUljJSSINTwye41fXd7ry26\nk8Y7ItGsC95Yj6LsFKZN2NlpQQhSbS66W83rSUWMIbukoBYLPdCdYjIyvu42BrKj\nn5QMbdLsxkNR/72dpyu52C4dZBf5HtbyFC83HLcCgYArYpPYnBaiC10UMEUHBCRP\nlM3aMbuT2NV8yhbAfaiZBivmUmY6MTsqU9jWhP08sCjnk/KfN92HfyilLrLS1E+R\nfY96SHRCrtmAopj2mrd/P2GSdhmj0di9PxqJ8OSqXzLf5DbYG4B/JGFtIK+kCUfj\niCNXPjjmkyCelBjJrIjXag==\n-----END PRIVATE KEY-----"
};

export const SUPABASE_CONFIG = {
  URL: process.env.REACT_APP_SUPABASE_URL || 'https://axfyxdxtjlalwzxbgpoz.supabase.co',
  KEY: process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4Znl4ZHh0amxhbHd6eGJncG96Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg4MjExOCwiZXhwIjoyMDc4NDU4MTE4fQ.RFpdrJd6aBHsUIFXfF-_mHDDT3c3vzq5DHUJ6Lyx_Hk'
};
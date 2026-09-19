# 🐉 Dergano & Dragons — Session Manager

Gestionale per sessioni di gioco di ruolo per ragazzi alla libreria Scamamu.

## ✅ Modifiche rispetto all'originale

- `turni` → **sessioni**
- `utenti` → **eroi**  
- `volontari` → **avventurieri**
- 🍕 **Flag pizza** su ogni sessione (crea + modifica)
- 🎲🐉 **Header Dergano & Dragons** con immagini dado e drago
- 🎨 **Tema fantasy dark** (gold, parchment, dungeon)

## 🖼 Immagini logo (da aggiungere)

Metti i tuoi file nella cartella `frontend/public/`:
- `dado.png` — immagine del dado (appare a sinistra del logo)
- `drago.png` — immagine del drago (appare a destra del logo)

**Per ottenere i link diretti da Google Drive:**
1. Apri il file su Drive → tasto destro → "Ottieni link"
2. Imposta "Chiunque abbia il link"
3. Copia l'ID del file dall'URL: `https://drive.google.com/file/d/**FILE_ID**/view`
4. Link diretto: `https://drive.google.com/uc?export=view&id=FILE_ID`

Oppure scarica i file e caricali direttamente in `frontend/public/`.

## 🛠 Tech Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Frontend**: React + Vite + Tailwind + CSS custom fantasy
- **Auth**: JWT + bcrypt

## 📦 Setup Backend

```bash
cd backend
npm install
```

Crea `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/dergano_dragons
JWT_SECRET=your_secret_key
NODE_ENV=development
PORT=5000
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

```bash
npm run dev
```

## 🎨 Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

## 🚀 Deploy su Vercel (gratuito, permanente)

1. Pusha su un **nuovo repo GitHub** (non modificare l'originale)
2. Vai su [vercel.com](https://vercel.com) → **Import Project**
3. Seleziona il repo → root directory: `frontend`
4. Add environment variable: `VITE_API_URL=https://tuo-backend.onrender.com`
5. Deploy 🎲

## 🗄 Database (Render — gratuito)

Il backend si deploya su [render.com](https://render.com):
- New **Web Service** → root: `backend`
- New **PostgreSQL** → copia `DATABASE_URL`
- La migrazione `has_pizza` viene applicata automaticamente all'avvio

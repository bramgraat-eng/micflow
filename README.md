# MicFlow – Supabase versie

## Stap-voor-stap (voor beginners)

### 1. Supabase account + project
1. Ga naar https://supabase.com en maak een gratis account.
2. Maak een nieuw project (kies een regio dichtbij, bijv. West EU).
3. Ga naar **SQL Editor** en plak de inhoud van `schema.sql` → Run.

### 2. API-sleutels kopiëren
1. In Supabase: **Settings → API**
2. Kopieer:
   - Project URL
   - `anon` public key

### 3. Lokaal draaien
1. Maak een bestand `.env.local` in de root van dit project:
   ```
   NEXT_PUBLIC_SUPABASE_URL=jouw-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=jouw-anon-key
   ```
2. Installeer en start:
   ```bash
   npm install
   npm run dev
   ```
3. Open http://localhost:3000

### 4. Online zetten (Vercel)
1. Maak een account op https://vercel.com
2. Push dit project naar GitHub (of gebruik Vercel CLI).
3. Importeer het project in Vercel.
4. Voeg dezelfde environment variables toe in Vercel.
5. Deploy → je krijgt een live link.

### Draaiboek importeren
- In de app komt een “Import” knop.
- Plak hier in de chat je draaiboek → ik maak er JSON van → je plakt die in de import.

Alles is realtime: als iemand een status of toewijzing wijzigt, zien anderen het direct.
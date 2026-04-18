# Backend Railway

Este directorio ya puede vivir como repositorio independiente para desplegar solo el backend en Railway.

## Variables minimas

Usa `DATABASE_URL` o las variables `DB_*`.

Ejemplo con tu conexion MySQL de Railway:

```env
NODE_ENV=production
PORT=${PORT}
DB_SYNC_ALTER=false
JWT_SECRET=cambia_esto_por_un_secreto_largo
INGEST_API_KEY=cambia_esto_por_una_clave_larga
FRONTEND_ORIGIN=https://tu-frontend.app
DATABASE_URL=mysql://root:eqglpsLmtWwLplFwxaDJAROxeToqOizu@roundhouse.proxy.rlwy.net:51802/railway
```

## Railway

1. Crea un repositorio nuevo solo con el contenido de `backend/`.
2. En Railway conecta ese repositorio.
3. Usa `npm install` como install command si Railway lo pide.
4. Usa `npm start` como start command.
5. Configura las variables del ejemplo anterior.

## Local

```bash
npm install
npm run dev
```

Health check: `GET /api/health`

# Pedidos — Reparto de ganancias de repartos en moto

Aplicación web para registrar pedidos de reparto y repartir cada ganancia
automáticamente:

- **20%** para el dueño o la dueña de la moto usada en ese pedido (Rosario o Luis)
- **10%** para gasolina y gastos de la moto
- **70%** para Daniel (repartidor)

Los porcentajes los puede cambiar Daniel desde la app (es el administrador).
Si un porcentaje cambia, los pedidos ya registrados conservan su reparto
original; el cambio aplica solo a los pedidos nuevos.

Debajo de la meta para el bebé, un apartado «Ganancias de hoy» muestra las
ganancias totales de cada usuario en el día (Daniel, Rosario y la moto).
La lista de pedidos separa los días con un pequeño banner con la fecha.

## Usuarios

| Usuario | Nombre | Rol |
| ------- | ------ | --- |
| `rosario` | Rosario | Dueña de moto |
| `luis` | Luis | Dueño de moto |
| `daniel` | Daniel | Repartidor y administrador |

Cada usuario entra con usuario y contraseña. En el primer inicio de sesión
la app obliga a cambiar la contraseña temporal.

## Estructura

```
pedidos/
├── docs/            # Frontend estático (GitHub Pages): index.html, styles.css, app.js, config.js
├── backend/         # API Node.js + Express + Mongoose
│   ├── server.js
│   ├── models/      # User, Order, Setting
│   ├── routes/      # auth, orders, summary, settings, admin
│   ├── middleware/  # auth (JWT) y adminOnly
│   └── utils/       # split.js (reparto exacto en centavos)
├── render.yaml      # Blueprint de Render (plan gratuito)
└── README.md
```

## Despliegue paso a paso

### 1. Base de datos (MongoDB Atlas, gratis)

1. Crea un clúster gratuito (M0) en https://www.mongodb.com/atlas
2. Crea un usuario de base de datos con contraseña y dale acceso de red
   (`Network Access -> Add IP Address -> Allow access from anywhere`, `0.0.0.0/0`),
   porque Render usa IPs dinámicas.
3. Copia la cadena de conexión (empieza con `mongodb+srv://...`) y anota
   la contraseña del usuario. Será la variable `MONGODB_URI`.

### 2. Repositorio en GitHub

1. Crea un repositorio **público** llamado `pedidos` en la cuenta `dvrdirect`.
2. Sube este proyecto:

```bash
git init
git add .
git commit -m "Pedidos: reparto de ganancias"
git branch -M main
git remote add origin https://github.com/dvrdirect/pedidos.git
git push -u origin main
```

> Nunca subas archivos `.env` ni contraseñas. El `.gitignore` ya excluye
> `node_modules/` y `.env`.

### 3. GitHub Pages (frontend)

1. En el repositorio: **Settings -> Pages**.
2. **Source:** Deploy from a branch. **Branch:** `main`, carpeta **`/docs`**.
3. Guarda. La página quedará en `https://dvrdirect.github.io/pedidos/`
   (puede tardar unos minutos la primera vez).

### 4. Render (API, plan gratuito)

1. En https://dashboard.render.com: **New -> Blueprint** y conecta el
   repositorio `pedidos`.
2. Render detecta `render.yaml` y crea el servicio `pedidos-api`.
3. En el servicio, abre **Environment** y pon estos valores
   (`JWT_SECRET` y `SETUP_KEY` ya los genera Render solos):
   - `MONGODB_URI`: la cadena de Atlas del paso 1.
   - `SEED_PASSWORD_ROSARIO`: contraseña temporal para Rosario (mín. 6 caracteres).
   - `SEED_PASSWORD_LUIS`: contraseña temporal para Luis.
   - `SEED_PASSWORD_DANIEL`: contraseña temporal para Daniel.
4. Espera a que el despliegue termine y anota la URL del servicio
   (por ejemplo `https://pedidos-api.onrender.com`). Si ese nombre ya estaba
   ocupado, Render le pone otro: usa la URL real que muestra el dashboard.

> El plan gratuito de Render "duerme" el servicio tras ~15 minutos sin uso:
> la primera carga puede tardar alrededor de un minuto. Es normal.

### 5. Sembrar usuarios y pedidos iniciales

Con la clave `SETUP_KEY` (visible en **Environment** del servicio en Render):

```bash
curl -X POST https://pedidos-api.onrender.com/api/admin/seed \
  -H "x-setup-key: TU_SETUP_KEY"
```

Respuesta esperada: `{"ok":true,"users":["rosario","luis","daniel"],"ordersSeeded":3,...}`.

Esto crea los 3 usuarios (con las contraseñas temporales del paso 4) y los
3 pedidos iniciales: **$28.50, $19.00 y $38.39** (dueño: Rosario,
nota "Pedido inicial"). El endpoint solo funciona una vez: si ya existen
usuarios, responde `409` y no hace nada.

### 6. Conectar el frontend con la API

1. Edita `docs/config.js` y pon la URL real del servicio de Render:

```js
window.PEDIDOS_API_URL = 'https://pedidos-api.onrender.com';
```

2. Haz commit y push. GitHub Pages se actualiza solo en unos minutos.

### 7. Probar los tres inicios de sesión

Entra a `https://dvrdirect.github.io/pedidos/` con cada usuario
(`rosario`, `luis`, `daniel`) y su contraseña temporal. La app pedirá
cambiar la contraseña en el primer inicio. Verifica:

- El resumen muestra **3 pedidos, $85.89 en total**: dueños $17.18
  (Rosario $17.18, Luis $0.00), gasolina $8.59 y **Daniel $60.12**.
- Agregar un pedido calcula el reparto en el momento.
- Editar un pedido permite cambiar monto, nota y moto (Rosario/Luis).
- Borrar un pedido pide confirmación.
- Solo Daniel ve la sección para cambiar los porcentajes del reparto.

## Desarrollo local (opcional)

```bash
cd backend
npm install
cp .env.example .env   # si existe; si no, crea .env con MONGODB_URI y JWT_SECRET
node server.js         # API en http://localhost:4000
```

Para probar el frontend en local, sirve la carpeta `docs/` con cualquier
servidor estático (por ejemplo `npx serve docs`) y apunta `config.js` a
`http://localhost:4000`.

## Seguridad

- Las contraseñas se guardan con hash (bcrypt). Nunca se guardan en texto
  plano ni se suben al repositorio.
- El `JWT_SECRET` y la `SETUP_KEY` viven solo en Render, no en el código.
- El endpoint `/api/admin/seed` exige la `SETUP_KEY` y solo corre una vez.
- Después de sembrar, se recomienda cambiar la `SETUP_KEY` en Render para
  que nadie más pueda reutilizarla.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { auth } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const ordersRoutes = require('./routes/orders');
const summaryRoutes = require('./routes/summary');
const settingsRoutes = require('./routes/settings');
const gasRoutes = require('./routes/gas');
const adminRoutes = require('./routes/admin');

const app = express();

// Origen permitido: la página de GitHub Pages.
// Se puede cambiar con la variable de entorno CORS_ORIGIN.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'https://dvrdirect.github.io',
  })
);
app.use(express.json({ limit: '100kb' }));

// Salud del servicio (la usa Render).
app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', auth, ordersRoutes);
app.use('/api/summary', auth, summaryRoutes);
app.use('/api/settings', auth, settingsRoutes);
app.use('/api/gas', auth, gasRoutes);

app.use((req, res) => res.status(404).json({ error: 'No encontrado' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error del servidor' });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Pedidos API escuchando en el puerto ${PORT}`);
});

async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Falta la variable de entorno MONGODB_URI');
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('MongoDB conectado');
  } catch (err) {
    console.error('No se pudo conectar a MongoDB:', err.message);
  }
}

if (!process.env.JWT_SECRET) {
  console.error('Falta la variable de entorno JWT_SECRET');
}
connectDb();

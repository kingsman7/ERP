import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.use('/api', express.json());

const backendUrl = (process.env['BACKEND_URL'] || 'http://localhost:3000').replace(/\/$/, '');

function isExpiredJwt(authorization: string | undefined): boolean {
  const token = authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return false;

  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp <= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

async function authBackendMiddleware(req: express.Request, res: express.Response): Promise<void> {
  const isAuthEndpoint = req.path === '/auth/login' || req.path === '/auth/refresh';
  const authorization = req.header('authorization');

  if (!isAuthEndpoint && !authorization) {
    res.status(401).json({ code: 'AUTH_REQUIRED', message: 'Authentication token is required' });
    return;
  }

  if (!isAuthEndpoint && isExpiredJwt(authorization)) {
    res.status(401).json({ code: 'SESSION_EXPIRED', message: 'The access token has expired' });
    return;
  }

  const headers: Record<string, string> = {
    accept: req.header('accept') || 'application/json',
  };
  if (authorization) headers['authorization'] = authorization;
  if (req.header('cookie')) headers['cookie'] = req.header('cookie')!;
  if (req.header('content-type')) headers['content-type'] = req.header('content-type')!;

  try {
    const response = await fetch(`${backendUrl}${req.originalUrl}`, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body ?? {}),
    });

    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('content-type', contentType);
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) res.setHeader('set-cookie', setCookie);
    res.status(response.status).send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('Backend proxy error:', error);
    res.status(502).json({ code: 'BACKEND_UNAVAILABLE', message: 'Backend unavailable' });
  }
}

app.use('/api', (req, res, next) => {
  void authBackendMiddleware(req, res).catch(next);
});

/* // In-Memory initial seed data for API routes
const MOCK_PRODUCTS = [
  {
    id: 'prod-01',
    sku: 'ELE-TAL-750',
    barcode: '775123400101',
    name: 'Taladro Percutor Industrial 750W 1/2"',
    category: 'Herramientas Eléctricas',
    unit: 'UND',
    costPrice: 42.50,
    salePrice: 78.90,
    prices: { price1: 78.90, price2: 67.00, price3: 59.00, price4: 55.00, price5: 51.00 },
    isTaxExempt: false,
    taxRate: 0.16,
    minStock: 8,
    totalStock: 34,
    status: 'ACTIVE'
  },
  {
    id: 'prod-02',
    sku: 'RED-CAT6-305',
    barcode: '775123400102',
    name: 'Bobina Cable Red UTP Cat6 100% Cobre 305m',
    category: 'Redes y Telecom',
    unit: 'UND',
    costPrice: 85.00,
    salePrice: 139.00,
    prices: { price1: 139.00, price2: 118.00, price3: 104.00, price4: 98.00, price5: 92.00 },
    isTaxExempt: false,
    taxRate: 0.16,
    minStock: 5,
    totalStock: 18,
    status: 'ACTIVE'
  },
  {
    id: 'prod-03',
    sku: 'PIN-LAT-04L',
    barcode: '775123400103',
    name: 'Pintura Látex Super Lavable Blanco Nieve 4L',
    category: 'Acabados y Pinturas',
    unit: 'LT',
    costPrice: 14.20,
    salePrice: 28.50,
    prices: { price1: 28.50, price2: 24.20, price3: 21.30, price4: 19.90, price5: 18.50 },
    isTaxExempt: false,
    taxRate: 0.16,
    minStock: 15,
    totalStock: 52,
    status: 'ACTIVE'
  },
  {
    id: 'prod-05',
    sku: 'ILU-LED-50W',
    barcode: '775123400105',
    name: 'Reflector LED Industrial Exterior IP65 50W 6500K',
    category: 'Iluminación',
    unit: 'UND',
    costPrice: 18.90,
    salePrice: 38.00,
    prices: { price1: 38.00, price2: 32.30, price3: 28.50, price4: 26.60, price5: 24.70 },
    isTaxExempt: false,
    taxRate: 0.16,
    minStock: 10,
    totalStock: 6,
    status: 'ACTIVE'
  }
]; */

/* const MOCK_CATEGORIES = [
  { id: 'cat-01', code: 'HERR', name: 'Herramientas Eléctricas', description: 'Taladros, esmeriles, sierras y equipos de poder', color: 'blue' },
  { id: 'cat-02', code: 'RED', name: 'Redes y Telecom', description: 'Cableado estructurado, conectores y fibra', color: 'purple' },
  { id: 'cat-03', code: 'PIN', name: 'Acabados y Pinturas', description: 'Pinturas látex, esmaltes y solventes', color: 'emerald' },
  { id: 'cat-04', code: 'ILU', name: 'Iluminación', description: 'Luminarias LED, reflectores y bombillería', color: 'amber' },
  { id: 'cat-05', code: 'ABR', name: 'Abrasivos y Corte', description: 'Discos diamantados, lijas y desbaste', color: 'rose' },
  { id: 'cat-06', code: 'FERR', name: 'Ferretería General', description: 'Tornillería, anclajes y fijaciones', color: 'sky' },
  { id: 'cat-07', code: 'SEG', name: 'Seguridad Industrial', description: 'EPP, cascos, guantes y protección visual', color: 'indigo' }
];

const MOCK_WAREHOUSES = [
  { id: 'wh-01', code: 'ALM-CENTRAL', name: 'Almacén Central (Bodega Principal)', location: 'Av. Industrial 4050, Nave B', isMain: true, status: 'ACTIVE', capacity: 15000, managerName: 'Carlos Morales', phone: '+58 212 555-1001' },
  { id: 'wh-02', code: 'ALM-NORTE', name: 'Almacén Sucursal Norte', location: 'Parque Comercial Norte Local 12', isMain: false, status: 'ACTIVE', capacity: 8000, managerName: 'Elena Rivas', phone: '+58 212 555-2002' },
  { id: 'wh-03', code: 'DEP-03', name: 'Depósito 3 (Logística Rápida)', location: 'Zona Portuaria Almacén 8', isMain: false, status: 'ACTIVE', capacity: 5000, managerName: 'Marcos Peña', phone: '+58 212 555-3003' }
];
*/
const MOCK_CUSTOMERS = [
  { id: 'cust-01', taxId: 'B-77492019-3', name: 'Constructora San Martín S.A.C.', email: 'compras@constructorasanmartin.com', customerType: 'EMPRESA' },
  { id: 'cust-02', taxId: 'B-88301922-1', name: 'Soluciones Eléctricas del Pacífico', email: 'finanzas@se-pacifico.net', customerType: 'EMPRESA' },
  { id: 'cust-03', taxId: 'RFC-XAXX010101000', name: 'Cliente Mostrador / Venta Rápida', email: 'ventasmostrador@Helameb.local', customerType: 'FINAL_CONSUMIDOR' }
];

const MOCK_SUPPLIERS = [
  { id: 'sup-01', taxId: 'J-30948572-1', name: 'Distribuidora Industrial del Norte S.A.', contactPerson: 'Ing. Roberto Méndez', email: 'ventas@distnorte.com' },
  { id: 'sup-02', taxId: 'J-40192833-4', name: 'ElectroGlobal S.A.C.', contactPerson: 'Lic. Mariana Vega', email: 'contacto@electroglobal.corp' }
];

// ERP REST API Routes
/* app.get('/api/products', (req, res) => {
  res.json(res);
});

app.post('/api/products', (req, res) => {
  const newProduct = req.body;
  newProduct.id = newProduct.id || `prod-${Date.now()}`;
  //MOCK_PRODUCTS.push(newProduct);
  res.status(201).json(newProduct);
});

app.get('/api/categories', (req, res) => {
  res.json(MOCK_CATEGORIES);
});

app.post('/api/categories', (req, res) => {
  const newCat = req.body;
  newCat.id = newCat.id || `cat-${Date.now()}`;
  MOCK_CATEGORIES.push(newCat);
  res.status(201).json(newCat);
});

app.get('/api/warehouses', (req, res) => {
  res.json(MOCK_WAREHOUSES);
});

app.post('/api/warehouses', (req, res) => {
  const newWh = req.body;
  newWh.id = newWh.id || `wh-${Date.now()}`;
  if (newWh.isMain) {
    MOCK_WAREHOUSES.forEach(w => w.isMain = false);
  }
  MOCK_WAREHOUSES.push(newWh);
  res.status(201).json(newWh);
});

app.put('/api/warehouses/:id', (req, res) => {
  const { id } = req.params;
  const idx = MOCK_WAREHOUSES.findIndex(w => w.id === id);
  if (idx !== -1) {
    if (req.body.isMain) {
      MOCK_WAREHOUSES.forEach(w => w.isMain = false);
    }
    MOCK_WAREHOUSES[idx] = { ...MOCK_WAREHOUSES[idx], ...req.body };
    res.json(MOCK_WAREHOUSES[idx]);
  } else {
    res.status(404).json({ error: 'Warehouse not found' });
  }
});

app.delete('/api/warehouses/:id', (req, res) => {
  const { id } = req.params;
  const idx = MOCK_WAREHOUSES.findIndex(w => w.id === id);
  if (idx !== -1) {
    MOCK_WAREHOUSES.splice(idx, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Warehouse not found' });
  }
});
*/
app.get('/api/customers', (req, res) => {
  res.json(MOCK_CUSTOMERS);
});

app.get('/api/suppliers', (req, res) => {
  res.json(MOCK_SUPPLIERS);
});

/* app.get('/api/invoices', (req, res) => {
  res.json([]);
});

app.post('/api/invoices', (req, res) => {
  const newInvoice = req.body;
  res.status(201).json(newInvoice);
}); */

app.get('/api/kardex', (req, res) => {
  res.json([]);
});

app.get('/api/mrp/boms', (req, res) => {
  res.json([]);
});

app.get('/api/mrp/orders', (req, res) => {
  res.json([]);
});

app.get('/api/crm/deals', (req, res) => {
  res.json([]);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================================================
// API requests must not fall through to SSR after their body has been parsed.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

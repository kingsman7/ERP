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
app.use(express.json());

// In-Memory initial seed data for API routes
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
];

const MOCK_WAREHOUSES = [
  { id: 'wh-01', code: 'ALM-CENTRAL', name: 'Almacén Central (Bodega Principal)', location: 'Av. Industrial 4050, Nave B', isMain: true },
  { id: 'wh-02', code: 'ALM-NORTE', name: 'Almacén Sucursal Norte', location: 'Parque Comercial Norte Local 12', isMain: false },
  { id: 'wh-03', code: 'DEP-03', name: 'Depósito 3 (Logística Rápida)', location: 'Zona Portuaria Almacén 8', isMain: false }
];

const MOCK_CUSTOMERS = [
  { id: 'cust-01', taxId: 'B-77492019-3', name: 'Constructora San Martín S.A.C.', email: 'compras@constructorasanmartin.com', customerType: 'EMPRESA' },
  { id: 'cust-02', taxId: 'B-88301922-1', name: 'Soluciones Eléctricas del Pacífico', email: 'finanzas@se-pacifico.net', customerType: 'EMPRESA' },
  { id: 'cust-03', taxId: 'RFC-XAXX010101000', name: 'Cliente Mostrador / Venta Rápida', email: 'ventasmostrador@4-inLine.local', customerType: 'FINAL_CONSUMIDOR' }
];

const MOCK_SUPPLIERS = [
  { id: 'sup-01', taxId: 'J-30948572-1', name: 'Distribuidora Industrial del Norte S.A.', contactPerson: 'Ing. Roberto Méndez', email: 'ventas@distnorte.com' },
  { id: 'sup-02', taxId: 'J-40192833-4', name: 'ElectroGlobal S.A.C.', contactPerson: 'Lic. Mariana Vega', email: 'contacto@electroglobal.corp' }
];

// ERP REST API Routes
app.get('/api/products', (req, res) => {
  res.json(MOCK_PRODUCTS);
});

app.post('/api/products', (req, res) => {
  const newProduct = req.body;
  newProduct.id = newProduct.id || `prod-${Date.now()}`;
  MOCK_PRODUCTS.push(newProduct);
  res.status(201).json(newProduct);
});

app.get('/api/warehouses', (req, res) => {
  res.json(MOCK_WAREHOUSES);
});

app.get('/api/customers', (req, res) => {
  res.json(MOCK_CUSTOMERS);
});

app.get('/api/suppliers', (req, res) => {
  res.json(MOCK_SUPPLIERS);
});

app.get('/api/invoices', (req, res) => {
  res.json([]);
});

app.post('/api/invoices', (req, res) => {
  const newInvoice = req.body;
  res.status(201).json(newInvoice);
});

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

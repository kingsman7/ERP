import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import { getAllowedHosts, getContext, getTrustProxyHeaders } from '@netlify/angular-runtime/app-engine.js';

const angularAppEngine = new AngularAppEngine({
  allowedHosts: getAllowedHosts(),
  trustProxyHeaders: getTrustProxyHeaders(),
});

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

/**
 * Handles the mock ERP REST API routes previously served via Express.
 * Returns `undefined` when the request isn't an API route so it falls through to Angular rendering.
 */
async function handleApiRequest(request: Request): Promise<Response | undefined> {
  const { pathname } = new URL(request.url);

  if (pathname === '/api/products') {
    if (request.method === 'GET') {
      return Response.json(MOCK_PRODUCTS);
    }
    if (request.method === 'POST') {
      const newProduct = await request.json();
      newProduct.id = newProduct.id || `prod-${Date.now()}`;
      MOCK_PRODUCTS.push(newProduct);
      return Response.json(newProduct, { status: 201 });
    }
  }

  if (pathname === '/api/warehouses' && request.method === 'GET') {
    return Response.json(MOCK_WAREHOUSES);
  }

  if (pathname === '/api/customers' && request.method === 'GET') {
    return Response.json(MOCK_CUSTOMERS);
  }

  if (pathname === '/api/suppliers' && request.method === 'GET') {
    return Response.json(MOCK_SUPPLIERS);
  }

  if (pathname === '/api/invoices') {
    if (request.method === 'GET') {
      return Response.json([]);
    }
    if (request.method === 'POST') {
      const newInvoice = await request.json();
      return Response.json(newInvoice, { status: 201 });
    }
  }

  if (pathname === '/api/kardex' && request.method === 'GET') {
    return Response.json([]);
  }

  if (pathname === '/api/mrp/boms' && request.method === 'GET') {
    return Response.json([]);
  }

  if (pathname === '/api/mrp/orders' && request.method === 'GET') {
    return Response.json([]);
  }

  if (pathname === '/api/crm/deals' && request.method === 'GET') {
    return Response.json([]);
  }

  if (pathname === '/api/health' && request.method === 'GET') {
    return Response.json({ status: 'OK', timestamp: new Date().toISOString() });
  }

  return undefined;
}

export async function netlifyAppEngineHandler(request: Request): Promise<Response> {
  const apiResponse = await handleApiRequest(request);
  if (apiResponse) {
    return apiResponse;
  }

  const context = getContext();
  const result = await angularAppEngine.handle(request, context);
  return result || new Response('Not found', { status: 404 });
}

/**
 * The request handler used by the Angular CLI (dev-server and during build).
 */
export const reqHandler = createRequestHandler(netlifyAppEngineHandler);

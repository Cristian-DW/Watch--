const { normalize, tokenize } = require('./matching');

const CATEGORIES = [
  // ── Áreas de empleabilidad (JOB) ──────────────────────
  {
    code: 'JOB_SAP_ERP',
    kind: 'JOB',
    label: 'SAP & Consultoría ERP',
    icon: 'sap-icon://business-objects-experience',
    subcategories: ['SAP BTP & Arquitectura', 'SAP ABAP / S/4HANA', 'SAP Fiori / UI5', 'SAP Integration Suite / CPI', 'SAP Funcional (MM/SD/FI)'],
    keywords: ['sap', 'btp', 'abap', 'hana', 's4hana', 'fiori', 'ui5', 'cap', 'cpi', 'erp', 'netweaver', 'successfactors', 'ariba']
  },
  {
    code: 'JOB_SOFTWARE_DEV',
    kind: 'JOB',
    label: 'Desarrollo de Software',
    icon: 'sap-icon://syntax',
    subcategories: ['Backend (Node.js / Java / Python)', 'Frontend (React / Angular / Vue)', 'Full Stack', 'Mobile (iOS / Android / Flutter)'],
    keywords: ['developer', 'desarrollador', 'software', 'frontend', 'backend', 'fullstack', 'node', 'nodejs', 'react', 'angular', 'java', 'python', 'typescript', 'golang', 'dotnet']
  },
  {
    code: 'JOB_CLOUD_DEVOPS',
    kind: 'JOB',
    label: 'Cloud, DevOps & SRE',
    icon: 'sap-icon://cloud',
    subcategories: ['AWS / Azure / GCP', 'DevOps & CI/CD', 'Kubernetes & Plataforma', 'Site Reliability Engineering (SRE)'],
    keywords: ['cloud', 'devops', 'sre', 'aws', 'azure', 'gcp', 'kubernetes', 'k8s', 'docker', 'terraform', 'infraestructura', 'platform']
  },
  {
    code: 'JOB_DATA_AI',
    kind: 'JOB',
    label: 'Datos, Analítica & IA',
    icon: 'sap-icon://artificial-intelligence',
    subcategories: ['Data Engineering', 'Machine Learning / GenAI', 'Data Science & BI', 'Datos en la Nube (Databricks / Snowflake)'],
    keywords: ['data', 'datos', 'ai', 'ia', 'machine', 'learning', 'ml', 'genai', 'llm', 'analytics', 'bi', 'powerbi', 'spark', 'databricks', 'snowflake', 'cientifico']
  },
  {
    code: 'JOB_CYBERSECURITY',
    kind: 'JOB',
    label: 'Ciberseguridad',
    icon: 'sap-icon://shield',
    subcategories: ['AppSec & DevSecOps', 'SOC / Blue Team', 'Pentesting / Red Team', 'GRC & Seguridad Cloud'],
    keywords: ['security', 'seguridad', 'ciberseguridad', 'cybersecurity', 'pentester', 'soc', 'devsecops', 'infosec', 'iso27001']
  },
  {
    code: 'JOB_PRODUCT_AGILE',
    kind: 'JOB',
    label: 'Producto, Diseño & Liderazgo',
    icon: 'sap-icon://manager-insight',
    subcategories: ['Product Management', 'Engineering Management', 'Scrum / Agile Delivery', 'UX / UI Design'],
    keywords: ['product', 'owner', 'manager', 'scrum', 'agile', 'ux', 'ui', 'designer', 'delivery', 'cto', 'tech lead']
  },

  // ── Tipos de producto (PRODUCT / PRICE / STOCK) ──────
  {
    code: 'PROD_FOOTWEAR',
    kind: 'PRODUCT',
    label: 'Calzado & Sneakers',
    icon: 'sap-icon://retail-store',
    subcategories: ['Sneakers & Lifestyle', 'Running & Deporte', 'Outdoor & Botas'],
    keywords: ['tenis', 'zapatillas', 'sneakers', 'new balance', 'nike', 'adidas', 'puma', 'asics', 'jordan', 'dunk', 'samba', '550', '574', '9060', 'calzado', 'zapatos']
  },
  {
    code: 'PROD_TECH',
    kind: 'PRODUCT',
    label: 'Tecnología & Computación',
    icon: 'sap-icon://laptop',
    subcategories: ['Smartphones', 'Portátiles & MacBooks', 'Audio & Audífonos', 'Monitores & Periféricos', 'Tablets & Wearables'],
    keywords: ['iphone', 'samsung', 'galaxy', 'xiaomi', 'macbook', 'laptop', 'portatil', 'ipad', 'airpods', 'sony', 'wh-1000xm5', 'monitor', 'garmin', 'apple watch', 'celular']
  },
  {
    code: 'PROD_GAMING',
    kind: 'PRODUCT',
    label: 'Gaming & Consolas',
    icon: 'sap-icon://competitor',
    subcategories: ['Consolas (PS5 / Xbox / Switch)', 'Tarjetas Gráficas & PC Gaming', 'Accesorios & Mandos'],
    keywords: ['ps5', 'playstation', 'xbox', 'nintendo', 'switch', 'rtx', 'geforce', 'radeon', 'steam deck', 'consola', 'DualSense', 'gamer']
  },
  {
    code: 'PROD_HOME',
    kind: 'PRODUCT',
    label: 'Hogar & Electrodomésticos',
    icon: 'sap-icon://home',
    subcategories: ['Cocina & Café', 'Aspiradoras & Robots', 'Televisores & Sonido', 'Climatización'],
    keywords: ['dyson', 'airfryer', 'freidora', 'nespresso', 'cafetera', 'roomba', 'robot', 'oled', 'lg', 'televisor', 'tv', 'nevera', 'lavadora']
  },
  {
    code: 'PROD_FASHION',
    kind: 'PRODUCT',
    label: 'Moda & Accesorios',
    icon: 'sap-icon://Scissors',
    subcategories: ['Chaquetas & Ropa', 'Relojes & Gafas', 'Mochilas & Maletas'],
    keywords: ['chaqueta', 'north face', 'patagonia', 'reloj', 'casio', 'seiko', 'tissot', 'ray-ban', 'gafas', 'mochila', 'samsonite']
  },
  {
    code: 'PROD_SPORTS',
    kind: 'PRODUCT',
    label: 'Deportes & Ciclismo',
    icon: 'sap-icon://physical-activity',
    subcategories: ['Ciclismo', 'Fitness & Gym', 'Camping & Aventura'],
    keywords: ['bicicleta', 'shimano', 'garmin edge', 'mancuernas', 'proteina', 'trotadora', 'camping', 'carpa']
  },
  {
    code: 'OTHER',
    kind: 'ALL',
    label: 'Otros / General',
    icon: 'sap-icon://tag',
    subcategories: ['General'],
    keywords: []
  }
];

const VALID_CATEGORIES = CATEGORIES.map((c) => c.code);

/**
 * Plantillas curadas de empleos y productos populares para autocompletar
 * al instante sin obligar al usuario a buscar o pegar una URL.
 */
const SUGGESTION_CATALOG = [
  // ── Empleos: SAP & ERP ────────────────────────────────
  {
    id: 'job-sap-btp-architect',
    title: 'SAP BTP Solution Architect',
    query: 'SAP Architect BTP',
    type: 'JOB',
    category: 'JOB_SAP_ERP',
    subcategory: 'SAP BTP & Arquitectura',
    location: 'Colombia',
    currency: 'COP',
    description: 'Arquitecto de soluciones SAP Business Technology Platform (CAP, Integration Suite, Cloud Foundry)'
  },
  {
    id: 'job-sap-cap-developer',
    title: 'SAP CAP & Fiori / UI5 Developer',
    query: 'SAP CAP UI5 Fiori Developer',
    type: 'JOB',
    category: 'JOB_SAP_ERP',
    subcategory: 'SAP Fiori / UI5',
    location: 'Remote',
    currency: 'COP',
    description: 'Desarrollador Full Stack SAP Cloud Application Programming Model (Node.js/Java) + SAPUI5'
  },
  {
    id: 'job-sap-cpi-integration',
    title: 'SAP Integration Suite / CPI Consultant',
    query: 'SAP CPI Integration Suite',
    type: 'JOB',
    category: 'JOB_SAP_ERP',
    subcategory: 'SAP Integration Suite / CPI',
    location: 'Colombia',
    currency: 'COP',
    description: 'Consultor de integración SAP Cloud Integration (CPI), API Management y Event Mesh'
  },
  {
    id: 'job-sap-abap-s4hana',
    title: 'SAP ABAP S/4HANA Senior Developer',
    query: 'SAP ABAP S/4HANA RAP',
    type: 'JOB',
    category: 'JOB_SAP_ERP',
    subcategory: 'SAP ABAP / S/4HANA',
    location: 'Colombia',
    currency: 'COP',
    description: 'Desarrollador ABAP on HANA, CDS Views, OData y ABAP RESTful Application Programming (RAP)'
  },
  // ── Empleos: Software, Cloud & Data ───────────────────
  {
    id: 'job-node-backend-sr',
    title: 'Senior Backend Engineer (Node.js / TypeScript)',
    query: 'Senior Node.js TypeScript Engineer -junior',
    type: 'JOB',
    category: 'JOB_SOFTWARE_DEV',
    subcategory: 'Backend (Node.js / Java / Python)',
    location: 'Remote',
    currency: 'COP',
    description: 'Ingeniero Backend Senior con Node.js, TypeScript, microservicios y arquitectura cloud'
  },
  {
    id: 'job-fullstack-react-node',
    title: 'Full Stack Developer (React + Node.js)',
    query: 'Full Stack React Node.js Developer',
    type: 'JOB',
    category: 'JOB_SOFTWARE_DEV',
    subcategory: 'Full Stack',
    location: 'Colombia',
    currency: 'COP',
    description: 'Desarrollador Full Stack con React, Next.js y Node.js'
  },
  {
    id: 'job-cloud-architect-aws',
    title: 'Cloud Solutions Architect (AWS / Kubernetes)',
    query: 'Cloud Architect AWS Kubernetes',
    type: 'JOB',
    category: 'JOB_CLOUD_DEVOPS',
    subcategory: 'AWS / Azure / GCP',
    location: 'Remote',
    currency: 'COP',
    description: 'Arquitecto Cloud especializado en AWS, Terraform, Kubernetes y alta disponibilidad'
  },
  {
    id: 'job-devops-sre',
    title: 'DevOps / Site Reliability Engineer (SRE)',
    query: 'DevOps SRE Kubernetes Terraform',
    type: 'JOB',
    category: 'JOB_CLOUD_DEVOPS',
    subcategory: 'Site Reliability Engineering (SRE)',
    location: 'Remote',
    currency: 'COP',
    description: 'Ingeniero DevOps/SRE con CI/CD, Docker, Kubernetes, observabilidad y automatización'
  },
  {
    id: 'job-data-engineer',
    title: 'Senior Data Engineer (Python / Spark / Databricks)',
    query: 'Data Engineer Python Spark Databricks',
    type: 'JOB',
    category: 'JOB_DATA_AI',
    subcategory: 'Data Engineering',
    location: 'Colombia',
    currency: 'COP',
    description: 'Ingeniero de Datos con pipelines ETL/ELT, Apache Spark, Databricks y SQL'
  },
  {
    id: 'job-ai-ml-engineer',
    title: 'AI / Machine Learning Engineer (LLMs & GenAI)',
    query: 'AI Machine Learning Engineer LLM',
    type: 'JOB',
    category: 'JOB_DATA_AI',
    subcategory: 'Machine Learning / GenAI',
    location: 'Remote',
    currency: 'COP',
    description: 'Ingeniero de IA / ML trabajando con modelos fundacionales, RAG y despliegue en producción'
  },
  {
    id: 'job-cybersecurity-appsec',
    title: 'Application Security / DevSecOps Engineer',
    query: 'AppSec DevSecOps Cloud Security',
    type: 'JOB',
    category: 'JOB_CYBERSECURITY',
    subcategory: 'AppSec & DevSecOps',
    location: 'Remote',
    currency: 'COP',
    description: 'Especialista en seguridad de aplicaciones, pipelines seguros y protección cloud'
  },
  {
    id: 'job-technical-product-manager',
    title: 'Technical Product Manager',
    query: 'Technical Product Manager SaaS',
    type: 'JOB',
    category: 'JOB_PRODUCT_AGILE',
    subcategory: 'Product Management',
    location: 'Remote',
    currency: 'COP',
    description: 'Líder de producto técnico para plataformas B2B / SaaS'
  },

  // ── Productos: Calzado & Sneakers ─────────────────────
  {
    id: 'prod-new-balance-550',
    title: 'Tenis New Balance 550',
    query: 'tenis New Balance 550 -niño -usado',
    type: 'PRODUCT',
    category: 'PROD_FOOTWEAR',
    subcategory: 'Sneakers & Lifestyle',
    targetPrice: 450000,
    currency: 'COP',
    description: 'Compara precios en MercadoLibre, Falabella, Dafiti, Éxito y tiendas oficiales'
  },
  {
    id: 'prod-new-balance-9060',
    title: 'Tenis New Balance 9060',
    query: 'tenis New Balance 9060 -replica',
    type: 'PRODUCT',
    category: 'PROD_FOOTWEAR',
    subcategory: 'Sneakers & Lifestyle',
    targetPrice: 620000,
    currency: 'COP',
    description: 'Monitoreo multi-tienda para New Balance 9060 originales'
  },
  {
    id: 'prod-adidas-samba-og',
    title: 'Tenis Adidas Samba OG',
    query: 'tenis Adidas Samba OG -niño',
    type: 'PRODUCT',
    category: 'PROD_FOOTWEAR',
    subcategory: 'Sneakers & Lifestyle',
    targetPrice: 420000,
    currency: 'COP',
    description: 'Alerta de super descuento para Adidas Samba OG en tiendas de Colombia'
  },
  {
    id: 'prod-nike-dunk-low',
    title: 'Tenis Nike Dunk Low Retro',
    query: 'tenis Nike Dunk Low -niño',
    type: 'PRODUCT',
    category: 'PROD_FOOTWEAR',
    subcategory: 'Sneakers & Lifestyle',
    targetPrice: 460000,
    currency: 'COP',
    description: 'Seguimiento de precio para Nike Dunk Low en retailers autorizados'
  },

  // ── Productos: Tecnología & Computación ───────────────
  {
    id: 'prod-iphone-16-pro',
    title: 'Apple iPhone 16 Pro 256GB',
    query: 'iPhone 16 Pro 256GB -funda -forro -reacondicionado',
    type: 'PRODUCT',
    category: 'PROD_TECH',
    subcategory: 'Smartphones',
    targetPrice: 4900000,
    currency: 'COP',
    description: 'Monitorea caídas de precio del iPhone 16 Pro 256GB libre en grandes superficies'
  },
  {
    id: 'prod-samsung-s24-ultra',
    title: 'Samsung Galaxy S24 Ultra 256GB',
    query: 'Samsung Galaxy S24 Ultra 256GB -estuche -funda',
    type: 'PRODUCT',
    category: 'PROD_TECH',
    subcategory: 'Smartphones',
    targetPrice: 4300000,
    currency: 'COP',
    description: 'Comparador de ofertas del Galaxy S24 Ultra 5G en Colombia'
  },
  {
    id: 'prod-macbook-air-m3',
    title: 'Apple MacBook Air M3 16GB / 512GB',
    query: 'MacBook Air M3 16GB 512GB -funda -cargador',
    type: 'PRODUCT',
    category: 'PROD_TECH',
    subcategory: 'Portátiles & MacBooks',
    targetPrice: 5600000,
    currency: 'COP',
    description: 'Seguimiento de descuentos en MacBook Air con chip M3'
  },
  {
    id: 'prod-sony-wh1000xm5',
    title: 'Audífonos Sony WH-1000XM5 Noise Cancelling',
    query: 'Sony WH-1000XM5 -almohadillas -estuche',
    type: 'PRODUCT',
    category: 'PROD_TECH',
    subcategory: 'Audio & Audífonos',
    targetPrice: 1250000,
    currency: 'COP',
    description: 'Audífonos inalámbricos Sony WH-1000XM5 con cancelación de ruido'
  },
  {
    id: 'prod-airpods-pro-2',
    title: 'Apple AirPods Pro (2ª generación) USB-C',
    query: 'AirPods Pro 2 USB-C -forro -estuche',
    type: 'PRODUCT',
    category: 'PROD_TECH',
    subcategory: 'Audio & Audífonos',
    targetPrice: 920000,
    currency: 'COP',
    description: 'Alerta de oferta imperdible para AirPods Pro 2 originales'
  },

  // ── Productos: Gaming & Hogar ─────────────────────────
  {
    id: 'prod-ps5-slim-disc',
    title: 'Consola PlayStation 5 Slim 1TB con lector',
    query: 'PlayStation 5 PS5 Slim 1TB -control -base -forro',
    type: 'PRODUCT',
    category: 'PROD_GAMING',
    subcategory: 'Consolas (PS5 / Xbox / Switch)',
    targetPrice: 2150000,
    currency: 'COP',
    description: 'Compara el precio de la consola PS5 Slim de 1TB en tiendas locales'
  },
  {
    id: 'prod-nintendo-switch-oled',
    title: 'Consola Nintendo Switch OLED 64GB',
    query: 'Nintendo Switch OLED 64GB -estuche -protector',
    type: 'PRODUCT',
    category: 'PROD_GAMING',
    subcategory: 'Consolas (PS5 / Xbox / Switch)',
    targetPrice: 1350000,
    currency: 'COP',
    description: 'Monitoreo de precio para Nintendo Switch modelo OLED'
  },
  {
    id: 'prod-nespresso-vertuo',
    title: 'Cafetera Nespresso Vertuo Next',
    query: 'Cafetera Nespresso Vertuo -capsulas',
    type: 'PRODUCT',
    category: 'PROD_HOME',
    subcategory: 'Cocina & Café',
    targetPrice: 590000,
    currency: 'COP',
    description: 'Seguimiento de ofertas en cafeteras Nespresso Vertuo'
  }
];

function listCategories(type) {
  const kind = type === 'JOB' ? 'JOB' : type ? 'PRODUCT' : null;
  return CATEGORIES
    .filter((c) => !kind || c.kind === kind || c.kind === 'ALL')
    .map(({ code, kind: k, label, icon, subcategories }) => ({
      code, kind: k, label, icon, subcategories
    }));
}

/**
 * Infiere la categoría más apropiada según el tipo y el texto de búsqueda/nombre.
 */
function inferCategory({ type, query, name, category }) {
  if (category && VALID_CATEGORIES.includes(category)) return category;
  const text = normalize(`${query || ''} ${name || ''}`);
  const tokens = new Set(tokenize(text));
  const targetKind = type === 'JOB' ? 'JOB' : 'PRODUCT';

  let bestCode = targetKind === 'JOB' ? 'JOB_SOFTWARE_DEV' : 'PROD_TECH';
  let bestScore = 0;

  for (const cat of CATEGORIES) {
    if (cat.kind !== targetKind) continue;
    let score = 0;
    for (const kw of cat.keywords) {
      const nkw = normalize(kw);
      if (tokens.has(nkw) || (nkw.length >= 4 && text.includes(nkw))) {
        score += nkw.includes(' ') ? 3 : 2;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCode = cat.code;
    }
  }
  return bestScore > 0 ? bestCode : (targetKind === 'JOB' ? 'JOB_SOFTWARE_DEV' : 'OTHER');
}

/**
 * Devuelve sugerencias de autocompletado ordenadas por relevancia.
 * Si el término del usuario no coincide con una plantilla exacta, también
 * construye una sugerencia dinámica categorizada automáticamente para que
 * pueda crear el Watch con un clic sin necesitar URL.
 */
function suggestWatches({ term = '', type = '', category = '' } = {}) {
  const cleanTerm = String(term || '').trim();
  const normTerm = normalize(cleanTerm);
  const termTokens = tokenize(normTerm);

  const pool = SUGGESTION_CATALOG.filter((item) => {
    if (type && item.type !== type) return false;
    if (category && category !== 'ALL' && item.category !== category) return false;
    return true;
  });

  const scored = [];
  for (const item of pool) {
    if (!normTerm) {
      scored.push({ item, score: 1 });
      continue;
    }
    const haystack = normalize(`${item.title} ${item.query} ${item.subcategory} ${item.description}`);
    let score = 0;
    if (normalize(item.title).startsWith(normTerm)) score += 10;
    else if (haystack.includes(normTerm)) score += 6;

    for (const tok of termTokens) {
      if (haystack.includes(tok)) score += 3;
    }
    if (score > 0) scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const results = scored.slice(0, 10).map((s) => ({ url: null, location: null, targetPrice: null, ...s.item }));

  // Si el usuario escribió algo propio, ofrecer también una sugerencia dinámica auto-categorizada
  if (cleanTerm.length >= 2) {
    const exactExists = results.some((r) => normalize(r.title) === normTerm || normalize(r.query) === normTerm);
    if (!exactExists) {
      const inferredJobCat = inferCategory({ type: 'JOB', query: cleanTerm });
      const inferredProdCat = inferCategory({ type: 'PRODUCT', query: cleanTerm });
      const looksLikeJob = CATEGORIES.find((c) => c.code === inferredJobCat)?.keywords
        .some((kw) => normTerm.includes(normalize(kw))) && !/\d{3}/.test(cleanTerm);

      const dynType = (type === 'JOB' || type === 'PRODUCT')
        ? type
        : (looksLikeJob ? 'JOB' : 'PRODUCT');
      const dynCat = category && VALID_CATEGORIES.includes(category)
        ? category
        : inferCategory({ type: dynType, query: cleanTerm });
      const catMeta = CATEGORIES.find((c) => c.code === dynCat);

      const dynSubcat = (results[0] && results[0].subcategory) || (catMeta && catMeta.subcategories[0]) || 'General';
      const dynTargetPrice = (results[0] && results[0].targetPrice) || null;

      results.push({
        id: `custom-${dynType.toLowerCase()}-${normTerm.replace(/\s+/g, '-')}`,
        title: cleanTerm,
        query: cleanTerm,
        type: dynType,
        category: dynCat,
        subcategory: dynSubcat,
        location: dynType === 'JOB' ? 'Colombia' : null,
        targetPrice: dynTargetPrice,
        currency: 'COP',
        url: null,
        description: dynType === 'JOB'
          ? `Monitorear nuevas vacantes de "${cleanTerm}" (${catMeta ? catMeta.label : 'Empleo'}) sin URL`
          : `Comparar precios en tiendas para "${cleanTerm}" (${catMeta ? catMeta.label : 'Producto'}) sin URL`
      });
    }
  }

  return results.slice(0, 10);
}

module.exports = {
  CATEGORIES,
  VALID_CATEGORIES,
  SUGGESTION_CATALOG,
  listCategories,
  inferCategory,
  suggestWatches
};

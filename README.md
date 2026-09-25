# WATCH

**WATCH** es una plataforma que permite monitorear información de Internet y notificar al usuario cuando algo cambia.

> *"Avísame cuando este producto baje de $3.500.000."*

## Estado actual

🏗️ **Foundation** — Estructura base del proyecto con modelo de dominio inicial.

---

## Arquitectura

```
┌─────────────────────────────────────────────────┐
│                  SAP UI5 (Frontend)             │
│              app/watches/webapp/                │
├─────────────────────────────────────────────────┤
│              SAP CAP (Backend)                  │
│         OData v4 — WatchService                 │
│               srv/                              │
├─────────────────────────────────────────────────┤
│            CDS Data Model                       │
│               db/schema.cds                     │
├─────────────────────────────────────────────────┤
│       SQLite (dev) │ SAP HANA Cloud (prod)      │
└─────────────────────────────────────────────────┘
```

**Patrón arquitectónico:** Modular Monolith  
**Protocolo:** OData v4  
**Enfoque:** Domain-Driven Design ligero  

---

## Estructura del proyecto

```
Watch/
├── app/                          # Frontend
│   └── watches/
│       └── webapp/
│           ├── controller/       # Controladores UI5
│           ├── i18n/             # Internacionalización
│           ├── view/             # Vistas XML
│           ├── Component.js      # Componente raíz
│           ├── index.html        # Entry point
│           └── manifest.json     # Configuración UI5
├── db/                           # Modelo de datos
│   └── schema.cds               # Entidades CDS
├── srv/                          # Servicios backend
│   ├── watch-service.cds         # Definición del servicio OData
│   └── watch-service.js          # Lógica de negocio
├── docs/                         # Documentación
│   └── architecture/
│       └── ADR-001-modular-monolith.md
├── test/                         # Pruebas
├── .cdsrc.json                   # Configuración CDS
├── .gitignore
├── package.json
└── README.md
```

---

## Tecnologías

| Capa       | Tecnología          | Propósito                    |
|------------|---------------------|------------------------------|
| Frontend   | SAP UI5             | Interfaz de usuario          |
| Backend    | SAP CAP (Node.js)   | Servicios y lógica           |
| API        | OData v4            | Protocolo de comunicación    |
| Modelo     | CDS                 | Definición de datos          |
| BD (dev)   | SQLite              | Base de datos en desarrollo  |
| BD (prod)  | SAP HANA Cloud      | Base de datos en producción  |

---

## Cómo ejecutar

### Prerrequisitos

- **Node.js** ≥ 18
- **@sap/cds-dk** instalado globalmente:
  ```bash
  npm install -g @sap/cds-dk
  ```

### Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd Watch

# Instalar dependencias
npm install
```

### Desarrollo

```bash
# Iniciar servidor de desarrollo con hot-reload
npm run dev
# o equivalente:
cds watch
```

Esto levantará:
- **Backend** en `http://localhost:4004`
- **API OData** en `http://localhost:4004/api`
- **UI5 App** en `http://localhost:4004/watches/webapp/index.html`
- **SQLite** como base de datos en memoria

### Explorar la API

Una vez ejecutando, puedes acceder a:

| Recurso                | URL                                    |
|------------------------|----------------------------------------|
| Service Index          | `http://localhost:4004`                |
| OData Metadata         | `http://localhost:4004/api/$metadata`  |
| Watches (GET)          | `http://localhost:4004/api/Watches`    |
| UI5 App                | `http://localhost:4004/watches/webapp/index.html` |

---

## Modelo de dominio

### Watch

| Campo       | Tipo          | Descripción                              |
|-------------|---------------|------------------------------------------|
| ID          | UUID          | Identificador único (auto-generado)      |
| name        | String(255)   | Nombre del Watch                         |
| url         | String(2048)  | URL a monitorear                         |
| type        | Enum          | PRICE, STOCK, CONTENT, CUSTOM            |
| condition   | String(1024)  | Condición de disparo                     |
| frequency   | Enum          | HOURLY, DAILY, WEEKLY                    |
| status      | Enum          | ACTIVE, PAUSED, TRIGGERED, ARCHIVED      |
| createdAt   | DateTime      | Fecha de creación (automático)           |
| modifiedAt  | DateTime      | Última modificación (automático)         |
| createdBy   | String        | Creador (automático)                     |
| modifiedBy  | String        | Último editor (automático)               |

---

## Pendiente para siguientes etapas

- [ ] CRUD completo en UI5 (formulario de creación/edición)
- [ ] Detalle de Watch (vista de navegación)
- [ ] Scraping engine
- [ ] Scheduler (ejecución periódica)
- [ ] Sistema de notificaciones
- [ ] Autenticación (SAP BTP XSUAA)
- [ ] Deploy a SAP BTP / HANA Cloud
- [ ] Tests unitarios y de integración

---

## License

UNLICENSED — Proyecto privado.

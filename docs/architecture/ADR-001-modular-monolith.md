# ADR-001: Modular Monolith con SAP CAP + UI5 + HANA Cloud

**Estado:** Aceptado  
**Fecha:** 2026-09-21  
**Decisores:** Cristian Castro  

---

## Contexto

WATCH es una plataforma de monitoreo de información en Internet. En su primera etapa, necesitamos una foundation técnica que permita:

1. Iterar rápidamente sobre el dominio.
2. Mantener simplicidad operacional.
3. Escalar hacia más módulos en el futuro sin reescribir.

## Decisión

Adoptamos una arquitectura **Modular Monolith** usando el stack SAP:

| Componente | Tecnología       | Justificación                                          |
|------------|------------------|--------------------------------------------------------|
| Frontend   | SAP UI5          | Framework empresarial maduro con soporte OData nativo  |
| Backend    | SAP CAP Node.js  | Abstracción CDS, OData automático, multi-DB            |
| API        | OData v4         | Protocolo estándar, integración directa con UI5        |
| BD         | SAP HANA Cloud   | Base de datos empresarial, in-memory, columnar         |
| BD (dev)   | SQLite           | Desarrollo local sin dependencias externas             |

### ¿Por qué Modular Monolith?

1. **Simplicidad inicial.** Un solo deployable es más fácil de operar, debuggear y desplegar que microservicios distribuidos.

2. **SAP CAP lo facilita.** CDS permite definir módulos con boundaries claros (namespaces, servicios separados) dentro de un solo proyecto. Cuando un módulo crezca lo suficiente, se puede extraer.

3. **Evita complejidad prematura.** No necesitamos message queues, service discovery, ni orquestación de contenedores en esta etapa.

4. **Path hacia microservicios.** Si en el futuro un módulo (e.g., el engine de scraping) necesita escalar independientemente, CAP permite extraerlo como un servicio separado sin cambiar el modelo CDS.

### ¿Por qué SAP CAP?

- **CDS (Core Data Services)** permite definir el modelo de datos una sola vez y derivar automáticamente: esquema de BD, API OData, validaciones.
- **Multi-database**: SQLite en dev, HANA en producción — sin cambiar código.
- **Opinado pero extensible**: convenciones sobre configuración, con escape hatches cuando se necesitan.

### ¿Por qué UI5?

- Integración nativa con OData v4.
- Componentes empresariales listos (tablas, formularios, diálogos).
- Soporte de SAP a largo plazo.
- Theming y accesibilidad incluidos (SAP Horizon).

### ¿Por qué HANA Cloud?

- Base de datos in-memory con rendimiento predecible.
- Capacidades analíticas integradas (útiles para dashboards futuros).
- Integración directa con CAP — un `cds deploy --to hana` y listo.

## Consecuencias

### Positivas

- Inicio rápido con un solo `cds watch`.
- Un solo repositorio, un solo CI/CD pipeline.
- Dominio bien definido desde el principio.
- Fácil de razonar y debuggear.

### Riesgos

- Si el monolito crece sin disciplina modular, puede volverse difícil de mantener → mitigation: namespaces CDS, servicios separados por dominio.
- HANA Cloud tiene costo → mitigation: SQLite para desarrollo, HANA solo en producción.

## Alternativas consideradas

| Alternativa            | Razón de rechazo                                           |
|------------------------|------------------------------------------------------------|
| Microservicios         | Complejidad operacional prematura para un MVP              |
| Express + PostgreSQL   | Pierde las ventajas de CDS (OData auto, multi-DB)          |
| React + REST           | Pierde integración nativa OData que UI5 ofrece             |
| Serverless (Functions) | Fragmenta la lógica, dificulta el desarrollo local         |

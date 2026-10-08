# Licencias del editor colaborativo propio

Este documento resume la ruta de licencias para mantener el editor colaborativo como producto vendible sin depender de motores AGPL.

## Decision de arquitectura

- Se mantiene un editor propio basado en componentes permisivos.
- No se integra ONLYOFFICE Docs Community ni otro motor AGPL dentro del producto.
- Si algun dia se requiere compatibilidad Word casi total mediante motor externo, debe evaluarse licencia comercial: ONLYOFFICE Developer/Enterprise, Collabora comercial u otra alternativa con contrato compatible.
- Este documento no reemplaza una revision legal formal antes de vender; sirve como control tecnico para no introducir dependencias incompatibles.

## Dependencias principales del editor

| Dependencia | Uso en el editor | Licencia observada localmente | Riesgo para producto vendible |
| --- | --- | --- | --- |
| Tiptap `@tiptap/*` | Motor de edicion, nodos, marcas, tablas, estilos | MIT | Bajo |
| `docx` | Exportacion `.docx` en navegador | MIT | Bajo |
| `mammoth` | Importacion `.docx` a HTML editable | BSD-2-Clause | Bajo |
| `@stomp/stompjs` | Cliente STOMP para colaboracion en vivo | Apache-2.0 | Bajo |
| `sockjs-client` | Transporte WebSocket/SockJS | MIT | Bajo |
| `lucide-react` | Iconos del ribbon | ISC | Bajo |
| Next.js, React, React DOM | UI web | MIT | Bajo |
| Spring Boot, Spring Security, Spring WebSocket | Backend/API/WebSocket | Apache-2.0 | Bajo |
| JJWT | JWT backend | Apache-2.0 | Bajo |
| PostgreSQL JDBC | Driver de base de datos | BSD-2-Clause | Bajo |

## Reglas para mantener la ruta vendible

- No agregar dependencias AGPL/GPL copyleft fuerte al runtime del editor sin aprobacion explicita.
- Ejecutar `npm run license:check` en `frontend` despues de instalar o actualizar dependencias del editor.
- Ejecutar `powershell -ExecutionPolicy Bypass -File scripts/check-licenses.ps1` en `backend` despues de agregar o actualizar dependencias Maven runtime.
- Si una dependencia declara licencia dual con alternativa permisiva, por ejemplo `MIT OR GPL`, se permite solo bajo la alternativa permisiva; si no existe alternativa permisiva se bloquea.
- Antes de agregar un motor de oficina completo, confirmar si su licencia permite producto cerrado o comercial.
- Mantener el editor colaborativo como codigo propio cuando se agreguen funciones tipo Word.
- Preferir licencias MIT, Apache-2.0, BSD o ISC.
- Documentar cualquier dependencia nueva relacionada con edicion, exportacion, importacion, colaboracion o conversion de documentos.

## Componentes a evitar sin licencia comercial

- ONLYOFFICE Docs Community si se integra como motor del producto.
- Collabora/CODE sin revision legal del modelo de distribucion y despliegue.
- Servicios/API de conversion de documentos con costo variable si el objetivo sigue siendo ruta gratuita.

## Verificacion tecnica actual

- El frontend usa dependencias declaradas en `frontend/package.json`.
- `frontend/scripts/check-licenses.mjs` revisa dependencias directas requeridas y paquetes instalados en `node_modules`, incluyendo transitivas, y falla si detecta licencias AGPL/GPL/LGPL sin alternativa permisiva explicita.
- El backend usa dependencias declaradas en `backend/pom.xml`.
- `backend/scripts/check-licenses.ps1` usa Maven para listar dependencias runtime, lee licencias desde POMs locales incluyendo parent POMs y falla si detecta AGPL/GPL/LGPL sin alternativa permisiva explicita.
- Las licencias principales del frontend fueron verificadas desde `frontend/node_modules/*/package.json` cuando estaban instaladas localmente.
- Ultima verificacion local: `npm run license:check` reviso 214 paquetes instalados sin AGPL/GPL/LGPL obligatorio.
- Ultima verificacion local backend: `powershell -ExecutionPolicy Bypass -File scripts/check-licenses.ps1` reviso 78 dependencias runtime Maven sin AGPL/GPL/LGPL obligatorio.
- El avance y las validaciones funcionales se registran en `docs/documento-colaborativo-avance.md`.

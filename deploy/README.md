# Despliegue FICCT en AWS

## Arquitectura

- EC2 `t3.small` (Amazon Linux 2023, disco gp3 cifrado de 40 GB) en `us-east-1`.
- Docker Compose: PostgreSQL 16, backend Spring Boot, frontend Next.js y Cloudflare Tunnel.
- `https://bshadow.xyz` sirve el frontend y `https://api.bshadow.xyz` sirve el backend. Los contenedores no publican puertos; solo SSH desde la IP administrativa está habilitado en el grupo de seguridad.
- PostgreSQL y archivos subidos persisten en `/srv/ficct/data` en EBS. Los secretos de producción están en `/srv/ficct/app.env` y `/srv/ficct/secrets`, fuera del código.
- `https://ai.bshadow.xyz` conecta el backend con Ollama en la PC local por otro túnel. La PC debe estar encendida y con sesión iniciada; la tarea programada `FicctLocalAI` inicia el modelo, el proxy con token y el túnel al iniciar sesión.

## Operación

La instancia usa la clave SSH `~/.ssh/ficct-aws-deploy.pem` de esta PC. En la EC2:

```bash
cd /srv/ficct/app/deploy
sudo docker compose --env-file /srv/ficct/app.env ps
sudo docker compose --env-file /srv/ficct/app.env logs --tail 100 backend
sudo docker compose --env-file /srv/ficct/app.env up -d
```

La cuenta inicial es `admin@bshadow.xyz`. La contraseña aleatoria se guardó solo en `/srv/ficct/app.env` como `BOOTSTRAP_ADMIN_PASSWORD`; consúltala desde una sesión SSH autorizada. No publiques ese archivo ni el token de IA.

Para activar notificaciones Firebase, rota la clave de servicio que estuvo versionada, copia la nueva como `/srv/ficct/secrets/firebase-service-account.json` con permisos de solo lectura para root y reinicia el backend. Mientras no exista una clave nueva, las notificaciones push quedan desactivadas.

La base de datos en AWS empezó vacía, salvo la cuenta administradora y los permisos iniciales. Antes de migrar datos de desarrollo, revisa las cuentas y contraseñas de prueba. El disco EBS persiste entre reinicios de la instancia; configura copias fuera de la instancia para recuperar datos ante pérdida del volumen.

## Desarrollo local de IA

Tras iniciar sesión en Windows, la tarea `FicctLocalAI` ejecuta `deploy/start-local-ai.ps1`. Se puede ejecutar manualmente desde PowerShell. Ollama escucha solo en `127.0.0.1:11434`; el proxy autenticado escucha solo en `127.0.0.1:11435`. El backend usa `LOCAL_AI_URL` y `LOCAL_AI_TOKEN` guardados en la EC2. El modelo instalado es `qwen2.5:3b` con una petición concurrente.

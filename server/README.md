## Instalación y Configuración

Sigue estos pasos para instalar y configurar el proyecto correctamente:

### 1. Descargar el código del proyecto

Clona el repositorio:

```bash
git clone https://github.com/AndresGutierrezHurtado/tu_repositorio.git
cd tu_repositorio
```

### 2. Instalar dependencias

Instala las dependencias del proyecto:

```bash
npm install
```

### 3. Configurar Google Drive

- Solicita y descarga las credenciales de tu cuenta de servicio de Google Cloud.
- Copia el correo de la cuenta de servicio y la clave privada al archivo `.env`:
  ```env
  GOOGLE_SERVICE_ACCOUNT_EMAIL=tu_email_de_servicio@project.iam.gserviceaccount.com
  GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\ntu_clave_privada\n-----END PRIVATE KEY-----\n"
  GOOGLE_DRIVE_FOLDER_ID=tu_id_de_carpeta
  ```
- Comparte la carpeta de Google Drive con el correo de la cuenta de servicio.

### 4. Configurar claves de entorno (LangChain, OpenAI, etc.)

Agrega tu clave de API de OpenAI y otros proveedores al archivo `.env`

### 5. Iniciar MongoDB

Asegúrate de tener corriendo MongoDB localmente o en la nube y actualiza la configuración en tu archivo `.env` si es necesario.

### 7. Iniciar ChromaDB

Si prefieres usar Docker para todos los servicios y usas chromadb de manera local, ejecuta:

```bash
docker-compose up -d
```

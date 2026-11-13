# Thanos AI

## Introducción

Thanos AI es un gestor de documentos con inteligencia artificial. Reúne los documentos de una empresa (manuales, procedimientos, políticas, formatos, etc.) y permite hacerles preguntas en lenguaje natural, por chat o por voz, como si se hablara con una persona que ya los leyó todos.

Por debajo funciona con **RAG** (Retrieval-Augmented Generation): cada documento se convierte en texto, se divide en fragmentos y cada fragmento se transforma en un **embedding** (un vector numérico que representa su significado). Esos vectores se guardan en una **base de datos vectorial** (ChromaDB). Cuando el usuario pregunta algo, un **agente** de IA decide cuándo buscar en los documentos, recupera los fragmentos más parecidos a la pregunta y responde con base en ellos, indicando de qué documentos sacó la información.

Stack principal: Node.js, TypeScript, Express, Socket.IO, Next.js, React, Tailwind CSS, LangChain, ChromaDB, MongoDB y Docker. El backend sigue una arquitectura hexagonal (dominio, aplicación, infraestructura y presentación).

## Features

- **Chat con tus documentos**: haces una pregunta y el asistente responde usando la información de los documentos de la empresa, con la respuesta mostrándose en tiempo real mientras se genera.
- **Agente con herramientas**: el modelo no recibe todos los documentos de golpe; tiene una herramienta de búsqueda y decide por sí mismo cuándo y qué buscar, pudiendo hacer varias búsquedas antes de responder.
- **Búsqueda semántica con embeddings**: la búsqueda encuentra fragmentos por significado y no solo por palabras exactas, gracias a los embeddings guardados en ChromaDB.
- **Fuentes en cada respuesta**: cada respuesta guarda los documentos que se consultaron, para que el usuario pueda abrirlos y verificar la información.
- **Llamada por voz**: se puede hablar con el asistente; el audio se convierte a texto, se responde con el mismo sistema RAG y la respuesta se devuelve en audio.
- **Sincronización con Google Drive**: los documentos de una carpeta de Drive se indexan automáticamente; solo se procesan los archivos nuevos o modificados y se eliminan del índice los que ya no existen.
- **Subida de documentos desde la app**: además de Drive, se pueden subir archivos directamente, ver su estado, descargarlos y eliminarlos.
- **Soporte para varios formatos**: PDF, Word, PowerPoint, Excel y texto plano.
- **Fragmentación por secciones**: los documentos se dividen respetando sus secciones y con solapamiento entre fragmentos, para no perder contexto en los cortes.
- **Metadatos automáticos**: a partir del nombre del archivo se detecta el área, el tipo de documento y su código, y se guardan junto a cada fragmento.
- **Adjuntos en el chat**: se puede adjuntar un archivo a un mensaje para que el asistente lo lea y responda sobre él.
- **Edición de mensajes**: al editar una pregunta anterior, la conversación se regenera desde ese punto.
- **Instrucciones personalizadas**: cada usuario puede agregar sus propias instrucciones para ajustar cómo responde el asistente.
- **Proveedores de IA intercambiables**: el modelo de chat y el de embeddings se eligen desde el archivo `.env` entre OpenAI, Azure OpenAI u Ollama (modelos locales), sin tocar código.
- **Cuentas de usuario**: registro, inicio de sesión con JWT, verificación de correo y recuperación de contraseña.
- **Historial de conversaciones**: los chats se guardan, se titulan automáticamente y se pueden retomar o borrar.

## Instalación

### Requisitos

- Node.js 24 o superior
- Docker y Docker Compose
- Una API key de OpenAI o Azure OpenAI, o una instancia de Ollama

### Configuración

Clona el repositorio y crea el archivo de entorno a partir del ejemplo:

```bash
git clone https://github.com/AndresGutierrezHurtado/thanos-ai.git
cd thanos-ai
cp .env.example .env
```

Edita `.env` y completa como mínimo:

- `JWT_SECRET`: una cadena larga y aleatoria.
- `MONGO_USERNAME` y `MONGO_PASSWORD`: credenciales de MongoDB (deben coincidir con las de `MONGODB_URI`).
- `AI_CHAT_PROVIDER`, `AI_EMBEDDING_PROVIDER` y la key del proveedor elegido (`OPENAI_API_KEY`, `AZURE_OPENAI_*` u `OLLAMA_BASE_URL`).

Opcionales:

- `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` y `GOOGLE_DRIVE_FOLDER_ID`: para sincronizar una carpeta de Google Drive. Hay que compartir la carpeta con el correo de la cuenta de servicio. Sin esto, los documentos se pueden subir desde la app.
- `SMTP_*`: para enviar correos de verificación y recuperación. Si no se configura, los correos se muestran en la consola.

### Local

En local, Docker solo levanta los almacenamientos (MongoDB y ChromaDB) y la app corre con Node en modo desarrollo.

```bash
npm install
docker compose up -d mongodb chroma
npm run dev
```

La app queda disponible en `http://localhost:3000`.

Para indexar los documentos de Google Drive desde la terminal:

```bash
npm run sync:documents
```

También se puede lanzar la sincronización o subir archivos desde la página de configuración, en la pestaña Documentos.

### Producción

En producción, Docker levanta todo: MongoDB, ChromaDB y la app ya compilada, lista para usar.

En `.env`, ajusta `APP_URL` y `API_URL` con el dominio o IP del servidor y usa contraseñas seguras. Luego:

```bash
docker compose up -d --build
```

La app queda disponible en el puerto definido en `PORT` (por defecto `3000`). MongoDB y ChromaDB solo se exponen en `127.0.0.1`, así que no son accesibles desde fuera del servidor. Los datos, los archivos subidos y los logs se guardan en volúmenes de Docker.

Para indexar los documentos de Drive dentro del contenedor:

```bash
docker compose exec app npm run sync:documents -w server
```

Para detener todo:

```bash
docker compose down
```

## Contacto

Andrés Gutiérrez Hurtado

- GitHub: [AndresGutierrezHurtado](https://github.com/AndresGutierrezHurtado)

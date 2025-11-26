# Backend del CRM - Guía de Desarrollo

## 📋 Descripción

Este documento te guía para crear tu propio servidor backend sin depender de Lovable Cloud. Puedes usar Node.js, Python o cualquier otro lenguaje que prefieras.

## 🚀 Opción 1: Node.js + Express (Recomendado)

### Instalación

```bash
npm init -y
npm install express cors dotenv @supabase/supabase-js
```

### Estructura del Servidor

```
proyecto/
├── server-example.js    # Archivo de ejemplo
├── .env                 # Variables de entorno
└── package.json
```

### Variables de Entorno

Copia tu `.env` actual al servidor (o crea uno nuevo):

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
PORT=3000
```

### Ejecutar el Servidor

```bash
node server-example.js
```

El servidor estará disponible en `http://localhost:3000`

### Endpoints Disponibles

#### Contactos
- `GET /api/contacts` - Obtener todos los contactos
- `GET /api/contacts/:id` - Obtener un contacto
- `POST /api/contacts` - Crear contacto
- `PUT /api/contacts/:id` - Actualizar contacto
- `DELETE /api/contacts/:id` - Eliminar contacto

#### Oportunidades
- `GET /api/deals` - Obtener todas las oportunidades
- `POST /api/deals` - Crear oportunidad
- `PUT /api/deals/:id/stage` - Cambiar etapa de oportunidad

#### Tareas
- `GET /api/tasks` - Obtener todas las tareas
- `POST /api/tasks` - Crear tarea
- `PUT /api/tasks/:id/toggle` - Marcar/desmarcar tarea como completada

#### Actividades
- `GET /api/activities` - Obtener todas las actividades

#### Sistema
- `GET /health` - Verificar estado del servidor

## 🐍 Opción 2: Python + Flask

### Instalación

```bash
pip install flask flask-cors python-dotenv supabase
```

### Código de Ejemplo

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

supabase = create_client(
    os.getenv('VITE_SUPABASE_URL'),
    os.getenv('VITE_SUPABASE_ANON_KEY')
)

@app.route('/api/contacts', methods=['GET'])
def get_contacts():
    response = supabase.table('contacts').select('*').execute()
    return jsonify(response.data)

@app.route('/api/contacts', methods=['POST'])
def create_contact():
    data = request.get_json()
    response = supabase.table('contacts').insert(data).execute()
    return jsonify(response.data[0]), 201

if __name__ == '__main__':
    app.run(port=3000, debug=True)
```

## 🔗 Usar APIs REST de Supabase Directamente

Supabase genera automáticamente APIs REST para tus tablas. Puedes acceder directamente sin necesidad de un servidor intermediario:

### Endpoint Base

```
https://tu-proyecto.supabase.co/rest/v1/
```

### Headers Requeridos

```headers
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Ejemplos

**Obtener todos los contactos:**
```bash
curl -X GET \
  https://rysizksbnxfsjwrffuhn.supabase.co/rest/v1/contacts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

**Crear un contacto:**
```bash
curl -X POST \
  https://rysizksbnxfsjwrffuhn.supabase.co/rest/v1/contacts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan García",
    "email": "juan@empresa.com",
    "company": "Empresa S.L."
  }'
```

## 📊 Estructura de Tablas en Supabase

Necesitas crear las siguientes tablas en Supabase:

### Tabla: contacts

```sql
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  position TEXT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### Tabla: deals

```sql
CREATE TABLE deals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  value NUMERIC,
  stage TEXT,
  contactId TEXT REFERENCES contacts(id),
  probability NUMERIC,
  expectedCloseDate TIMESTAMP,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### Tabla: tasks

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  dueDate TIMESTAMP,
  priority TEXT,
  completed BOOLEAN,
  contactId TEXT REFERENCES contacts(id),
  dealId TEXT REFERENCES deals(id),
  createdAt TIMESTAMP
);
```

### Tabla: activities

```sql
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  type TEXT,
  description TEXT,
  contactId TEXT REFERENCES contacts(id),
  dealId TEXT REFERENCES deals(id),
  createdAt TIMESTAMP
);
```

## 🔐 Row Level Security (RLS)

Para mayor seguridad, habilita RLS en Supabase:

1. Ve a Authentication > Policies
2. Crea políticas para cada tabla
3. Ejemplo básico (permitir lectura y escritura para todos):

```sql
CREATE POLICY "Allow all operations" ON contacts
FOR ALL USING (true)
WITH CHECK (true);
```

## 🧪 Testear el Servidor

### Con curl

```bash
# Obtener todos los contactos
curl http://localhost:3000/api/contacts

# Crear contacto
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com"
  }'
```

### Con Postman

1. Importa la colección (opcional)
2. Configura el URL base: `http://localhost:3000`
3. Prueba los endpoints

## 📝 Notas Importantes

- El cliente React ya está configurado para usar Supabase directamente
- Las operaciones se sincronizan automáticamente entre el frontend y Supabase
- El backend es opcional si usas directamente las APIs REST de Supabase
- Para producción, usa variables de entorno y habilita CORS correctamente
- Implementa autenticación y autorización según tus necesidades

## ✅ Próximos Pasos

1. Crea las tablas en Supabase
2. Configura el `.env` en el servidor
3. Ejecuta `node server-example.js`
4. Prueba los endpoints
5. Integra con tu frontend si es necesario

¡Listo para desarrollar! 🚀

FROM node:18-alpine

# Crear y establecer el directorio de trabajo
WORKDIR /usr/src/app

# Copiar el package.json y package-lock.json
COPY package*.json ./

# Instalar las dependencias
RUN npm install

# Copiar el resto del código de la aplicación
COPY . .

# Exponer el puerto en el que corre la aplicación (definido en el .env, por defecto 5000)
EXPOSE 5000

# Comando para iniciar la aplicación
CMD ["node", "server-crm-endpoints.js"]

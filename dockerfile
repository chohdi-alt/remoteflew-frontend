# ===== BUILD STAGE =====
FROM node:20.19.1 AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx ng build RemoteFlowApp --configuration production


# ===== RUNTIME STAGE =====
FROM nginx:alpine

# 🔥 CLEAN DEFAULT NGINX FILES
RUN rm -rf /usr/share/nginx/html/*

# Copy Angular build
COPY --from=build /app/dist/remote-flow-app/browser /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
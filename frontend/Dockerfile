FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
ARG VITE_API_BASE=/api/v1
ENV VITE_API_BASE=${VITE_API_BASE}
RUN npm ci --include=dev
COPY . .
RUN chmod +x node_modules/@esbuild/linux-x64/bin/esbuild || true
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

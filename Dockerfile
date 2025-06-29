FROM nginx:alpine

# Hapus isi default Nginx
RUN rm -rf /usr/share/nginx/html/*

# Salin semua file HTML/JS ke root web Nginx
COPY . /usr/share/nginx/html

EXPOSE 80

# 🚀 HachiDuckRace - Deployment Guide

## 📋 Yêu Cầu Hệ Thống

- **OS:** Ubuntu 18.04+ (hoặc tương đương)
- **Node.js:** 16.x+ (đã có sẵn)
- **PM2:** Đã cài đặt
- **Nginx:** (tùy chọn, để reverse proxy)
- **Port:** 3333 (hoặc port khác)

## 🔧 Bước 1: Chuẩn Bị Server

### 1.1 Cập nhật hệ thống
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Cài đặt các package cần thiết
```bash
sudo apt install -y git curl wget unzip
```

## 📦 Bước 2: Deploy Code

### 2.1 Clone hoặc upload code
```bash
# Nếu dùng Git
git clone <your-repo-url> hachiduckrace
cd hachiduckrace

# Hoặc upload code qua SCP/SFTP
# scp -r ./duck-race user@server:/home/user/hachiduckrace
```

### 2.2 Cài đặt dependencies
```bash
cd hachiduckrace
npm install
```

### 2.3 Kiểm tra cấu hình
```bash
# Kiểm tra file server.js
ls -la server.js

# Kiểm tra port (mặc định 3333)
grep -n "PORT\|port" server.js
```

## ⚙️ Bước 3: Cấu Hình PM2

### 3.1 Tạo file ecosystem.config.js
```bash
nano ecosystem.config.js
```

### 3.2 Nội dung file ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'hachiduckrace',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3333
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3333
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 3.3 Tạo thư mục logs
```bash
mkdir -p logs
```

## 🚀 Bước 4: Chạy Ứng Dụng

### 4.1 Start với PM2
```bash
pm2 start ecosystem.config.js --env production
```

### 4.2 Kiểm tra trạng thái
```bash
pm2 status
pm2 logs hachiduckrace
```

### 4.3 Cấu hình PM2 startup
```bash
pm2 startup
pm2 save
```

## 🔧 Bước 5: Cấu Hình Nginx (Tùy chọn)

### 5.1 Cài đặt Nginx
```bash
sudo apt install nginx -y
```

### 5.2 Tạo file cấu hình
```bash
sudo nano /etc/nginx/sites-available/hachiduckrace
```

### 5.3 Nội dung file cấu hình Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Thay đổi domain của bạn

    location / {
        proxy_pass http://localhost:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5.4 Kích hoạt site
```bash
sudo ln -s /etc/nginx/sites-available/hachiduckrace /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔒 Bước 6: Cấu Hình Firewall

### 6.1 Mở port cần thiết
```bash
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw allow 3333    # App port (nếu không dùng Nginx)
sudo ufw enable
```

## 📊 Bước 7: Monitoring & Logs

### 7.1 Xem logs
```bash
pm2 logs hachiduckrace
pm2 logs hachiduckrace --lines 100
```

### 7.2 Monitor performance
```bash
pm2 monit
```

### 7.3 Restart app
```bash
pm2 restart hachiduckrace
pm2 reload hachiduckrace  # Zero-downtime reload
```

## 🔄 Bước 8: Update Code

### 8.1 Script update tự động
```bash
nano update.sh
```

### 8.2 Nội dung file update.sh
```bash
#!/bin/bash
echo "🔄 Updating HachiDuckRace..."

# Backup current version
pm2 stop hachiduckrace

# Pull latest code (nếu dùng Git)
# git pull origin main

# Install new dependencies
npm install

# Start app
pm2 start ecosystem.config.js --env production

echo "✅ Update completed!"
pm2 status
```

### 8.3 Cấp quyền thực thi
```bash
chmod +x update.sh
```

## 🛠️ Bước 9: Troubleshooting

### 9.1 Kiểm tra port đang sử dụng
```bash
sudo netstat -tlnp | grep :3333
sudo lsof -i :3333
```

### 9.2 Kiểm tra PM2 processes
```bash
pm2 list
pm2 describe hachiduckrace
```

### 9.3 Restart toàn bộ PM2
```bash
pm2 kill
pm2 start ecosystem.config.js --env production
```

### 9.4 Kiểm tra logs chi tiết
```bash
tail -f logs/combined.log
tail -f logs/err.log
tail -f logs/out.log
```

## 📱 Bước 10: Test Ứng Dụng

### 10.1 Kiểm tra local
```bash
curl http://localhost:3333
```

### 10.2 Kiểm tra từ bên ngoài
```bash
curl http://your-server-ip:3333
```

### 10.3 Test admin panel
```bash
curl http://your-server-ip:3333/admin
```

## 🔐 Bước 11: Bảo Mật (Khuyến nghị)

### 11.1 Cài đặt SSL với Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

### 11.2 Cấu hình firewall nâng cao
```bash
sudo ufw deny 3333  # Chặn truy cập trực tiếp port 3333
sudo ufw allow from 127.0.0.1 to any port 3333  # Chỉ cho phép localhost
```

## 📋 Checklist Deploy

- [ ] ✅ Server Ubuntu đã sẵn sàng
- [ ] ✅ Node.js và PM2 đã cài đặt
- [ ] ✅ Code đã upload lên server
- [ ] ✅ Dependencies đã cài đặt (`npm install`)
- [ ] ✅ File `ecosystem.config.js` đã tạo
- [ ] ✅ PM2 đã start ứng dụng
- [ ] ✅ PM2 startup đã cấu hình
- [ ] ✅ Firewall đã mở port cần thiết
- [ ] ✅ Nginx đã cấu hình (nếu dùng)
- [ ] ✅ Ứng dụng đã test thành công
- [ ] ✅ SSL đã cài đặt (nếu cần)

## 🆘 Support

Nếu gặp vấn đề, kiểm tra:
1. **Logs:** `pm2 logs hachiduckrace`
2. **Status:** `pm2 status`
3. **Port:** `sudo netstat -tlnp | grep :3333`
4. **Nginx:** `sudo nginx -t`

---

**🎉 Chúc mừng! HachiDuckRace đã sẵn sàng chạy trên server Ubuntu!**

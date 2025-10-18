# 🦆 Duck Race - Website Trò Đua Vịt Trực Tuyến

Website cho phép người xem theo dõi **trò đua vịt realtime**, admin là người tạo và điều khiển cuộc đua. Người dùng (user) chỉ cần truy cập website là có thể xem trực tiếp diễn biến cuộc đua.

## 🚀 Tính Năng

### 👨‍💼 Admin Panel
- Đăng nhập với tài khoản admin
- Nhập danh sách vịt tham gia cuộc đua
- Khởi động và reset cuộc đua
- Theo dõi tiến trình cuộc đua realtime
- Xem kết quả cuộc đua

### 👥 User View
- Xem cuộc đua realtime không cần đăng nhập
- Hiển thị tiến trình di chuyển của các vịt
- Thông báo vịt thắng cuộc
- Giao diện responsive, thân thiện

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: HTML5, Tailwind CSS, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Realtime**: Socket.IO
- **Authentication**: JWT
- **Styling**: Custom CSS với animations

## 📦 Cài Đặt

1. **Clone repository**
```bash
git clone <repository-url>
cd duck-race
```

2. **Cài đặt dependencies**
```bash
npm install
```

3. **Chạy server**
```bash
npm start
```

4. **Truy cập website**
- User view: http://localhost:3000
- Admin panel: http://localhost:3000/admin

## 🔐 Tài Khoản Admin

- **Email**: admin@duckrace.com
- **Password**: admin123

## 📁 Cấu Trúc Dự Án

```
duck-race/
├── server.js                 # Backend chính
├── package.json             # Dependencies
├── data/
│   └── ducks.json           # Cấu hình vịt mặc định
└── public/
    ├── index.html           # Giao diện User
    ├── admin.html           # Giao diện Admin
    └── assets/
        ├── css/
        │   └── style.css    # Custom CSS
        ├── js/
        │   └── script.js    # Frontend JavaScript
        └── images/          # Hình ảnh
```

## 🎮 Cách Sử Dụng

### Cho Admin:
1. Truy cập `/admin`
2. Đăng nhập với tài khoản admin
3. Nhập danh sách vịt (mỗi vịt một dòng)
4. Nhấn "Bắt Đầu Cuộc Đua"
5. Theo dõi tiến trình realtime
6. Xem kết quả và có thể reset để tạo cuộc đua mới

### Cho User:
1. Truy cập trang chủ
2. Chờ admin khởi động cuộc đua
3. Xem cuộc đua realtime
4. Thưởng thức kết quả!

## 🔧 API Endpoints

- `POST /api/login` - Đăng nhập admin
- `POST /api/start-race` - Bắt đầu cuộc đua
- `POST /api/reset-race` - Reset cuộc đua
- `GET /api/race-status` - Lấy trạng thái cuộc đua

## 📡 Socket.IO Events

- `raceStart` - Cuộc đua bắt đầu
- `raceUpdate` - Cập nhật vị trí vịt
- `raceEnd` - Cuộc đua kết thúc
- `raceReset` - Reset cuộc đua

## 🎨 Tính Năng UI/UX

- **Responsive Design**: Tối ưu cho mobile và desktop
- **Realtime Updates**: Cập nhật trực tiếp qua Socket.IO
- **Animations**: Hiệu ứng mượt mà cho vịt và giao diện
- **Toast Notifications**: Thông báo trạng thái
- **Modern UI**: Thiết kế hiện đại với Tailwind CSS

## 🚀 Triển Khai

Website có thể triển khai trên:
- **Render.com**
- **Railway**
- **Vercel**
- **Heroku**
- **DigitalOcean**

## 🔮 Mở Rộng Tương Lai

- [ ] Hệ thống đặt cược vui
- [ ] Lưu lịch sử cuộc đua
- [ ] Bảng xếp hạng tổng
- [ ] Nhiều phòng đua song song
- [ ] Chat realtime trong cuộc đua
- [ ] Thống kê chi tiết

## 📄 License

MIT License - Xem file LICENSE để biết thêm chi tiết.

## 👥 Đóng Góp

Mọi đóng góp đều được chào đón! Hãy tạo issue hoặc pull request.

---

**Được phát triển với ❤️ và Socket.IO**


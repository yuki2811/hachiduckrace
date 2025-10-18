const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3333;
const JWT_SECRET = 'duck-race-secret-key-2024';

// Hàm weighted random selection
function getWeightedRandomIndex(probabilities) {
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i];
    if (random <= cumulative) {
      return i;
    }
  }
  
  return probabilities.length - 1; // Fallback
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Tạo thư mục data nếu chưa có
if (!fs.existsSync('data')) {
  fs.mkdirSync('data');
}

// Dữ liệu tài khoản admin (hardcode)
const adminAccount = {
  email: 'admin@duckrace.com',
  password: '$2a$10$UwmbVxKqxrLUolnYe7Xt7uZmnFbAjey0.PftEalPpYNAn11QppKS2', // password: "admin123"
  name: 'Admin Duck Race'
};

// Trạng thái cuộc đua
let raceState = {
  isRunning: false,
  isFinished: false,
  ducks: [],
  winner: null,
  startTime: null,
  endTime: null,
  raceDuration: 30000, // Thời gian đua mặc định (30 giây)
  maxDuration: null // Thời gian tối đa (nếu có)
};

// Hàm tạo vịt ngẫu nhiên
function generateRandomDuck() {
  const names = ['Vịt Vàng', 'Vịt Xanh', 'Vịt Đỏ', 'Vịt Tím', 'Vịt Cam', 'Vịt Hồng', 'Vịt Xanh Lá', 'Vịt Nâu'];
  const colors = ['#FFD700', '#4A90E2', '#E74C3C', '#9B59B6', '#FF8C00', '#FF69B4', '#2ECC71', '#8B4513'];
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    name: names[Math.floor(Math.random() * names.length)],
    color: colors[Math.floor(Math.random() * colors.length)],
    position: 0,
    speed: Math.random() * 0.02 + 0.01, // Tốc độ ngẫu nhiên
    finished: false,
    finishTime: null
  };
}

// Hàm reset cuộc đua
function resetRace() {
  raceState = {
    isRunning: false,
    isFinished: false,
    ducks: [],
    winner: null,
    startTime: null,
    endTime: null,
    raceDuration: 30000, // Giữ nguyên thời gian đua
    maxDuration: null
  };
}

// Hàm bắt đầu cuộc đua
function startRace(duckNames, raceDuration = 30000) {
  resetRace();
  
  // Cập nhật thời gian đua
  raceState.raceDuration = raceDuration;
  raceState.maxDuration = Date.now() + raceDuration;
  
  // Chọn vịt thắng trước (random)
  const winnerIndex = Math.floor(Math.random() * duckNames.length);
  
  // Tạo danh sách vịt từ tên được nhập
  raceState.ducks = duckNames.map((name, index) => {
    // Tính tốc độ cơ bản để về đích trong thời gian đã set
    const baseSpeed = 100 / (raceDuration / 100) * 1.5; // Tăng tốc độ cơ bản lên 1.5x
    
    // Đảm bảo baseSpeed không phải NaN
    if (isNaN(baseSpeed) || baseSpeed <= 0) {
      console.error('Invalid baseSpeed:', baseSpeed, 'raceDuration:', raceDuration);
      return;
    }
    
    let speedMultiplier;
    let isWinner = index === winnerIndex;
    
    if (isWinner) {
      // Vịt thắng - tốc độ để về đích đúng thời gian nhưng có biến động
      speedMultiplier = 0.8 + Math.random() * 0.4; // 0.8-1.2 (có thể chậm hơn hoặc nhanh hơn)
    } else {
      // Vịt khác - tốc độ biến động lớn để tạo kịch tính
      const randomFactor = 0.4 + Math.random() * 0.8; // 0.4-1.2 (biến động lớn)
      speedMultiplier = randomFactor;
    }
    
    const finalSpeed = baseSpeed * speedMultiplier;
    
    // Random màu sắc rõ ràng cho mỗi con vịt (hỗ trợ tối đa 200 vịt)
    const colors = [
        // Màu cơ bản
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
        '#FF8C94', '#87CEEB', '#FFB347', '#98FB98', '#F0E68C', '#FFA07A', '#20B2AA', '#FF69B4',
        
        // Màu đỏ và hồng
        '#FF0000', '#FF1493', '#FF6347', '#FF7F50', '#FF4500', '#DC143C', '#B22222', '#CD5C5C',
        '#F08080', '#FA8072', '#E9967A', '#FFA07A', '#FFB6C1', '#FFC0CB', '#FF69B4', '#FF1493',
        
        // Màu xanh
        '#00BFFF', '#1E90FF', '#4169E1', '#0000FF', '#0000CD', '#191970', '#483D8B', '#6A5ACD',
        '#9370DB', '#8A2BE2', '#9400D3', '#9932CC', '#8B008B', '#800080', '#4B0082', '#6B8E23',
        
        // Màu xanh lá
        '#00FF00', '#32CD32', '#00FF7F', '#00FA9A', '#90EE90', '#98FB98', '#8FBC8F', '#228B22',
        '#006400', '#008000', '#00FF00', '#7FFF00', '#ADFF2F', '#9ACD32', '#6B8E23', '#556B2F',
        
        // Màu vàng và cam
        '#FFFF00', '#FFD700', '#FFA500', '#FF8C00', '#FF7F50', '#FF6347', '#FF4500', '#FFD700',
        '#F0E68C', '#BDB76B', '#DAA520', '#B8860B', '#CD853F', '#DEB887', '#F5DEB3', '#FFEFD5',
        
        // Màu tím và hồng
        '#DA70D6', '#DDA0DD', '#EE82EE', '#FF00FF', '#FF1493', '#FF69B4', '#FFB6C1', '#FFC0CB',
        '#D8BFD8', '#E6E6FA', '#F0F8FF', '#F5F5DC', '#FFFAF0', '#FFF8DC', '#FFFFE0', '#FFFFF0',
        
        // Màu nâu và xám
        '#A52A2A', '#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F5DEB3', '#FFEFD5', '#FFF8DC',
        '#808080', '#A9A9A9', '#C0C0C0', '#D3D3D3', '#DCDCDC', '#F5F5F5', '#FFFAFA', '#F0F8FF',
        
        // Màu xanh dương và xanh ngọc
        '#00CED1', '#20B2AA', '#48D1CC', '#40E0D0', '#00FFFF', '#00FFFF', '#7FFFD4', '#AFEEEE',
        '#B0E0E6', '#ADD8E6', '#87CEEB', '#87CEFA', '#4682B4', '#5F9EA0', '#708090', '#778899',
        
        // Màu neon và sáng
        '#FF00FF', '#00FFFF', '#FFFF00', '#FF1493', '#00FF00', '#FF4500', '#0000FF', '#FF0000',
        '#32CD32', '#1E90FF', '#FFD700', '#FF69B4', '#00CED1', '#FF6347', '#9370DB', '#FF8C00',
        
        // Màu pastel
        '#FFB6C1', '#FFC0CB', '#DDA0DD', '#E6E6FA', '#F0F8FF', '#F5F5DC', '#FFFAF0', '#FFF8DC',
        '#FFFFE0', '#FFFFF0', '#F0FFF0', '#F5FFFA', '#F0FFFF', '#F0F8FF', '#F8F8FF', '#FFF5EE',
        
        // Màu đậm và tối
        '#800000', '#8B0000', '#A52A2A', '#B22222', '#DC143C', '#FF0000', '#FF1493', '#FF69B4',
        '#000080', '#0000CD', '#0000FF', '#1E90FF', '#00BFFF', '#00FFFF', '#00CED1', '#20B2AA',
        
        // Màu bổ sung
        '#FFD700', '#FFA500', '#FF8C00', '#FF7F50', '#FF6347', '#FF4500', '#FF1493', '#FF69B4',
        '#FFB6C1', '#FFC0CB', '#DDA0DD', '#EE82EE', '#DA70D6', '#FF00FF', '#8B008B', '#800080',
        
        // Màu gradient
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
        '#FF8C94', '#87CEEB', '#FFB347', '#98FB98', '#F0E68C', '#FFA07A', '#20B2AA', '#FF69B4',
        
        // Màu rainbow
        '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3', '#FF1493',
        '#FF69B4', '#FFB6C1', '#FFC0CB', '#DDA0DD', '#EE82EE', '#DA70D6', '#FF00FF', '#8B008B'
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    return {
      id: `duck_${index}`,
      name: name.trim(),
      color: randomColor,
      position: 0,
      baseSpeed: finalSpeed,
      speed: finalSpeed,
      finished: false,
      finishTime: null,
      isWinner: isWinner,
      personality: Math.random()
    };
  });
  
  raceState.isRunning = true;
  raceState.startTime = Date.now();
  
  // Gửi sự kiện bắt đầu cuộc đua
  io.emit('raceStart', {
    ducks: raceState.ducks,
    raceDuration: raceState.raceDuration,
    message: `Cuộc đua đã bắt đầu! Thời gian: ${Math.floor(raceDuration/1000)} giây`
  });
  
  // Bắt đầu mô phỏng cuộc đua
  simulateRace();
}

// Hàm mô phỏng cuộc đua
function simulateRace() {
  const raceInterval = setInterval(() => {
    if (!raceState.isRunning) {
      clearInterval(raceInterval);
      return;
    }
    
    // Kiểm tra thời gian đua đã hết chưa
    if (raceState.maxDuration && Date.now() >= raceState.maxDuration) {
      raceState.isRunning = false;
      raceState.isFinished = true;
      raceState.endTime = Date.now();
      
      // Đảm bảo tất cả vịt đều về đích khi hết thời gian
      raceState.ducks.forEach(duck => {
        if (!duck.finished) {
          duck.position = 100;
          duck.finished = true;
          duck.finishTime = Date.now();
        }
      });
      
      // Tìm vịt dẫn đầu (vị trí cao nhất)
      raceState.winner = raceState.ducks.reduce((prev, current) => 
        (prev.position > current.position) ? prev : current
      );
      
      // Gửi sự kiện kết thúc cuộc đua do hết thời gian
      io.emit('raceEnd', {
        winner: raceState.winner,
        results: raceState.ducks.sort((a, b) => b.position - a.position),
        message: `⏰ Hết thời gian! Vịt dẫn đầu: ${raceState.winner.name}!`,
        reason: 'timeout'
      });
      
      clearInterval(raceInterval);
      return;
    }
    
    // Cập nhật vị trí các vịt với thuật toán thông minh
    raceState.ducks.forEach(duck => {
      if (!duck.finished) {
        let currentSpeed = duck.baseSpeed;
        
        // Tính thời gian đã trôi
        const elapsed = Date.now() - raceState.startTime;
        const timeProgress = elapsed / raceState.raceDuration;
        
        // Thuật toán mới: Tạo sự thay đổi thứ hạng liên tục
        const currentRank = raceState.ducks
          .filter(d => !d.finished)
          .sort((a, b) => b.position - a.position)
          .findIndex(d => d.id === duck.id) + 1;
        
        // Weighted Random với Noise cho tất cả vịt
        const positionProgress = duck.position / 100; // 0-1
        // timeProgress đã được khai báo ở trên
        
        // Debug: Kiểm tra giá trị
        if (isNaN(duck.baseSpeed) || isNaN(duck.position)) {
          console.error('Duck data error:', {
            id: duck.id,
            name: duck.name,
            baseSpeed: duck.baseSpeed,
            position: duck.position,
            isWinner: duck.isWinner
          });
          return;
        }
        
        // Tạo noise pattern dựa trên thời gian và vị trí
        // Sử dụng index thay vì duck.id để tránh NaN
        const duckIndex = raceState.ducks.findIndex(d => d.id === duck.id);
        const noise1 = Math.sin(timeProgress * Math.PI * 2 + duckIndex * 0.5) * 0.3;
        const noise2 = Math.cos(positionProgress * Math.PI * 3 + duckIndex * 0.3) * 0.2;
        const noise3 = Math.sin(timeProgress * Math.PI * 4 + positionProgress * Math.PI * 2) * 0.1;
        const combinedNoise = noise1 + noise2 + noise3;
        
        // Weighted Random dựa trên vị trí và vai trò
        let baseWeight, variance, burstChance, slowChance;
        
        if (duck.isWinner) {
          // Vịt thắng cuộc - chiến thuật comeback
          if (positionProgress < 0.5) {
            // 50% đầu - chậm, ít biến động
            baseWeight = 0.4;
            variance = 0.3;
            burstChance = 0.05;
            slowChance = 0.2;
          } else if (positionProgress < 0.8) {
            // 30% giữa - tăng tốc dần
            baseWeight = 0.7;
            variance = 0.4;
            burstChance = 0.25;
            slowChance = 0.1;
          } else {
            // 20% cuối - bứt tốc mạnh
            baseWeight = 1.2;
            variance = 0.5;
            burstChance = 0.6;
            slowChance = 0.05;
          }
        } else {
          // Vịt khác - chiến thuật dẫn đầu rồi mệt
          if (positionProgress < 0.5) {
            // 50% đầu - nhanh, nhiều biến động
            baseWeight = 1.0;
            variance = 0.6;
            burstChance = 0.4;
            slowChance = 0.1;
          } else if (positionProgress < 0.8) {
            // 30% giữa - bắt đầu mệt
            baseWeight = 0.6;
            variance = 0.4;
            burstChance = 0.2;
            slowChance = 0.3;
          } else {
            // 20% cuối - rất mệt
            baseWeight = 0.3;
            variance = 0.3;
            burstChance = 0.05;
            slowChance = 0.5;
          }
        }
        
        // Tính toán tốc độ với weighted random
        let speedMultiplier = baseWeight + (Math.random() - 0.5) * variance;
        
        // Đảm bảo con vịt thắng cuộc về đích đúng thời gian
        if (duck.isWinner) {
          const targetPosition = timeProgress * 100; // Vị trí mục tiêu dựa trên thời gian
          const positionGap = targetPosition - duck.position;
          
          if (positionGap > 5) {
            // Nếu chậm quá, tăng tốc mạnh
            speedMultiplier = Math.max(speedMultiplier, 2.0);
          } else if (positionGap < -5) {
            // Nếu nhanh quá, giảm tốc
            speedMultiplier = Math.min(speedMultiplier, 0.5);
          }
        }
        
        // Debug: Kiểm tra giá trị trước khi áp dụng noise
        if (isNaN(speedMultiplier)) {
          console.error('NaN speedMultiplier before noise:', {
            duck: duck.name,
            baseWeight: baseWeight,
            variance: variance,
            positionProgress: positionProgress,
            timeProgress: timeProgress
          });
          speedMultiplier = 1.0; // Giá trị mặc định
        }
        
        // Áp dụng noise
        speedMultiplier += combinedNoise;
        
        // Debug: Kiểm tra giá trị sau khi áp dụng noise
        if (isNaN(speedMultiplier)) {
          console.error('NaN speedMultiplier after noise:', {
            duck: duck.name,
            combinedNoise: combinedNoise,
            noise1: noise1,
            noise2: noise2,
            noise3: noise3
          });
          speedMultiplier = 1.0; // Giá trị mặc định
        }
        
        // Weighted random cho burst/slow
        const randomValue = Math.random();
        
        if (randomValue < burstChance) {
          // Burst speed - weighted random
          const burstWeights = [1.2, 1.5, 1.8, 2.2, 2.8];
          const burstProbabilities = [0.4, 0.3, 0.2, 0.08, 0.02]; // Xác suất giảm dần
          const burstIndex = getWeightedRandomIndex(burstProbabilities);
          
          // Debug: Kiểm tra burstIndex
          if (isNaN(burstIndex) || burstIndex < 0 || burstIndex >= burstWeights.length) {
            console.error('Invalid burstIndex:', burstIndex, 'for duck:', duck.name);
            speedMultiplier *= 1.2; // Giá trị mặc định
          } else {
            speedMultiplier *= burstWeights[burstIndex];
          }
        } else if (randomValue < burstChance + slowChance) {
          // Slow speed - weighted random
          const slowWeights = [0.8, 0.6, 0.4, 0.2, 0.1];
          const slowProbabilities = [0.3, 0.3, 0.25, 0.1, 0.05]; // Xác suất giảm dần
          const slowIndex = getWeightedRandomIndex(slowProbabilities);
          
          // Debug: Kiểm tra slowIndex
          if (isNaN(slowIndex) || slowIndex < 0 || slowIndex >= slowWeights.length) {
            console.error('Invalid slowIndex:', slowIndex, 'for duck:', duck.name);
            speedMultiplier *= 0.8; // Giá trị mặc định
          } else {
            speedMultiplier *= slowWeights[slowIndex];
          }
        }
        
        // Đảm bảo tốc độ không âm và không quá cực đoan
        speedMultiplier = Math.max(0.05, Math.min(speedMultiplier, 3.0));
        
        currentSpeed = duck.baseSpeed * speedMultiplier;
        
        // Debug: Kiểm tra currentSpeed
        if (isNaN(currentSpeed)) {
          console.error('NaN currentSpeed detected:', {
            duck: duck.name,
            baseSpeed: duck.baseSpeed,
            speedMultiplier: speedMultiplier,
            positionProgress: positionProgress,
            timeProgress: timeProgress
          });
          currentSpeed = 0.01; // Giá trị mặc định
        }
        
        // Giới hạn tốc độ theo giai đoạn
        // positionProgress đã được khai báo ở trên
        let maxSpeedMultiplier;
        if (positionProgress < 0.4) {
          maxSpeedMultiplier = 1.5; // 40% đầu - ít biến động
        } else if (positionProgress < 0.9) {
          maxSpeedMultiplier = 4; // 50% giữa - cho phép vượt tốc
        } else {
          maxSpeedMultiplier = 2; // 10% cuối - vịt thắng cuộc bứt tốc
        }
        currentSpeed = Math.max(0.01, Math.min(currentSpeed, duck.baseSpeed * maxSpeedMultiplier));
        
        // Cập nhật tốc độ
        duck.speed = currentSpeed;
        
        // Tính vận tốc thực tế (m/s)
        // Đường đua 1000m = 100%
        // currentSpeed là %/100ms
        // 1% = 10m, currentSpeed%/100ms = currentSpeed * 10m/100ms = currentSpeed * 0.1m/ms = currentSpeed * 100m/s
        const speedMs = currentSpeed * 100; // m/s
        duck.speedMs = Math.round(speedMs * 100) / 100; // Làm tròn 2 chữ số
        
        // Di chuyển vịt
        if (isNaN(currentSpeed) || currentSpeed < 0) {
          console.error('Invalid currentSpeed:', currentSpeed, 'for duck:', duck.name);
          currentSpeed = 0.01; // Giá trị mặc định
        }
        
        // Đảm bảo position không phải NaN
        if (isNaN(duck.position)) {
          duck.position = 0;
        }
        
        duck.position += currentSpeed;
        
        // Kiểm tra vịt đã về đích chưa - CHỈ CHO PHÉP VỊT THẮNG CUỘC VỀ ĐÍCH
        if (duck.position >= 98 && !duck.finished) {
          // Chỉ cho phép vịt thắng cuộc về đích
          if (duck.isWinner) {
            duck.position = 100;
            duck.finished = true;
            duck.finishTime = Date.now();
            
            raceState.winner = duck;
            raceState.isFinished = true;
            raceState.isRunning = false;
            raceState.endTime = Date.now();
            
            // Gửi sự kiện kết thúc cuộc đua
            io.emit('raceEnd', {
              winner: raceState.winner,
              results: raceState.ducks.sort((a, b) => (a.finishTime || Infinity) - (b.finishTime || Infinity)),
              message: `🎉 Vịt thắng cuộc là: ${raceState.winner.name}!`,
              reason: 'finished'
            });
          } else {
            // Vịt khác không được về đích, giữ ở 99%
            duck.position = 99;
          }
        }
      }
    });
    
    // Debug: Log duck positions
    // console.log('Duck positions:', raceState.ducks.map(duck => ({
    //   name: duck.name,
    //   position: duck.position,
    //   speedMs: duck.speedMs,
    //   finished: duck.finished
    // })));
    
    // Gửi cập nhật vị trí
    io.emit('raceUpdate', {
      ducks: raceState.ducks,
      isRunning: raceState.isRunning,
      isFinished: raceState.isFinished,
      raceDuration: raceState.raceDuration,
      elapsedTime: Date.now() - raceState.startTime,
      remainingTime: raceState.maxDuration ? Math.max(0, raceState.maxDuration - Date.now()) : null
    });
    
    // Dừng nếu tất cả vịt đã về đích
    if (raceState.ducks.every(duck => duck.finished)) {
      raceState.isRunning = false;
      clearInterval(raceInterval);
    }
  }, 100); // Cập nhật mỗi 100ms
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API đăng nhập admin
app.post('/api/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt:', { email: req.body.email, password: req.body.password ? '***' : 'undefined' });
    
    const { email, password } = req.body;
    
    console.log('📧 Email check:', { 
      received: email, 
      expected: adminAccount.email, 
      match: email === adminAccount.email 
    });
    
    if (email === adminAccount.email) {
      console.log('🔑 Password validation starting...');
      const isValidPassword = await bcrypt.compare(password, adminAccount.password);
      console.log('🔑 Password validation result:', isValidPassword);
      
      if (isValidPassword) {
        console.log('✅ Login successful, generating token...');
        const token = jwt.sign(
          { email: adminAccount.email, name: adminAccount.name },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        console.log('🎫 Token generated, sending response...');
        res.json({
          success: true,
          token,
          user: { email: adminAccount.email, name: adminAccount.name }
        });
      } else {
        console.log('❌ Invalid password');
        res.status(401).json({ success: false, message: 'Mật khẩu không đúng' });
      }
    } else {
      console.log('❌ Email not found');
      res.status(401).json({ success: false, message: 'Email không tồn tại' });
    }
  } catch (error) {
    console.log('💥 Login error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// API bắt đầu cuộc đua
app.post('/api/start-race', (req, res) => {
  try {
    const { duckNames, raceDuration } = req.body;
    
    if (!duckNames || duckNames.length < 2) {
      return res.status(400).json({ success: false, message: 'Cần ít nhất 2 vịt để bắt đầu cuộc đua' });
    }
    
    if (raceState.isRunning) {
      return res.status(400).json({ success: false, message: 'Cuộc đua đang diễn ra' });
    }
    
    // Validate race duration (5-300 seconds)
    const duration = raceDuration ? Math.max(5000, Math.min(300000, raceDuration)) : 30000;
    
    startRace(duckNames, duration);
    res.json({ 
      success: true, 
      message: `Cuộc đua đã bắt đầu! Thời gian: ${Math.floor(duration/1000)} giây`,
      raceDuration: duration
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// API reset cuộc đua
app.post('/api/reset-race', (req, res) => {
  try {
    resetRace();
    io.emit('raceReset', { message: 'Cuộc đua đã được reset' });
    res.json({ success: true, message: 'Cuộc đua đã được reset' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// API lấy trạng thái cuộc đua
app.get('/api/race-status', (req, res) => {
  res.json({
    success: true,
    raceState
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Gửi trạng thái hiện tại cho client mới
  socket.emit('raceStatus', raceState);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Khởi động server
server.listen(PORT, () => {
  console.log(`🦆 Duck Race Server đang chạy tại http://localhost:${PORT}`);
  console.log(`👨‍💼 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`👥 User view: http://localhost:${PORT}`);
});

// Xử lý lỗi
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});


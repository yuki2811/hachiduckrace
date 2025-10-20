// Duck Race Frontend JavaScript
class DuckRaceApp {
    constructor() {
        this.socket = null;
        this.isAdmin = window.location.pathname.includes('admin');
        this.isLoggedIn = false;
        this.raceState = {
            isRunning: false,
            isFinished: false,
            ducks: [],
            winner: null
        };
        this.timerInterval = null;
        
        this.init();
    }

    init() {
        this.connectSocket();
        this.setupEventListeners();
        this.setupUI();
        
        // Initialize duck name toggle for admin panel
        if (this.isAdmin) {
            setTimeout(() => {
                this.initializeDuckNameToggle();
            }, 100);
        }
    }

    connectSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
        });

        this.socket.on('raceStatus', (data) => {
            this.raceState = data;
            this.updateRaceDisplay();
        });

        this.socket.on('raceStart', (data) => {
            this.raceState = { 
                ...this.raceState, 
                ...data, 
                isRunning: true, 
                isFinished: false,
                startTime: Date.now(),
                raceDuration: data.raceDuration || 30000
            };
            this.updateRaceDisplay();
            this.startTimer();
            this.showToast('Cuộc đua đã bắt đầu!', 'success');
        });

        this.socket.on('raceUpdate', (data) => {
            this.raceState = { ...this.raceState, ...data };
            this.updateRaceDisplay();
            
            // Update race timer if running
            if (this.raceState.isRunning) {
                this.updateRaceTimer();
                this.updateSpeedDisplay();
            }
        });

        this.socket.on('raceEnd', (data) => {
            this.raceState = { ...this.raceState, ...data, isRunning: false, isFinished: true };
            this.stopTimer();
            this.updateRaceDisplay();
            this.showWinnerAnnouncement(data.winner);
            this.showToast(`Vịt thắng cuộc: ${data.winner.name}!`, 'success');
        });

        this.socket.on('raceReset', (data) => {
            this.raceState = {
                isRunning: false,
                isFinished: false,
                ducks: [],
                winner: null
            };
            this.stopTimer();
            this.updateRaceDisplay();
            this.showToast('Cuộc đua đã được reset', 'info');
        });
    }

    setupEventListeners() {
        if (this.isAdmin) {
            this.setupAdminEventListeners();
        }
    }

    setupAdminEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Start race button
        const startRaceBtn = document.getElementById('startRaceBtn');
        if (startRaceBtn) {
            startRaceBtn.addEventListener('click', () => {
                this.startRace();
            });
        }

        // Reset race button
        const resetRaceBtn = document.getElementById('resetRaceBtn');
        if (resetRaceBtn) {
            resetRaceBtn.addEventListener('click', () => {
                this.resetRace();
            });
        }
    }

    setupUI() {
        if (this.isAdmin) {
            this.setupAdminUI();
        } else {
            this.setupUserUI();
        }
    }

    setupAdminUI() {
        // Check if already logged in
        const token = localStorage.getItem('adminToken');
        if (token) {
            this.isLoggedIn = true;
            this.showAdminPanel();
        } else {
            this.showLoginModal();
        }
    }

    setupUserUI() {
        // User interface is always visible
        this.updateRaceDisplay();
    }

    async handleLogin() {
        console.log('🔐 Frontend: handleLogin called');
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        console.log('📧 Frontend: Form data:', { email, password: password ? '***' : 'undefined' });

        try {
            console.log('🌐 Frontend: Sending request to /api/login...');
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            console.log('📡 Frontend: Response status:', response.status);
            const data = await response.json();
            console.log('📦 Frontend: Response data:', data);

            if (data.success) {
                console.log('✅ Frontend: Login successful, storing token...');
                localStorage.setItem('adminToken', data.token);
                this.isLoggedIn = true;
                this.showAdminPanel();
                this.showToast('Đăng nhập thành công!', 'success');
                this.initializeDuckNameToggle();
            } else {
                this.showToast(data.message || 'Đăng nhập thất bại', 'error');
            }
        } catch (error) {
            this.showToast('Lỗi kết nối server', 'error');
        }
    }

    handleLogout() {
        localStorage.removeItem('adminToken');
        this.isLoggedIn = false;
        this.showLoginModal();
        this.showToast('Đã đăng xuất', 'info');
    }

    // Initialize duck name toggle functionality
    initializeDuckNameToggle() {
        console.log('🔄 Initializing duck name toggle...');
        const customNamesBtn = document.getElementById('customNamesBtn');
        const autoNamesBtn = document.getElementById('autoNamesBtn');
        const customNamesSection = document.getElementById('customNamesSection');
        const autoNamesSection = document.getElementById('autoNamesSection');

        console.log('🔍 Elements found:', {
            customNamesBtn: !!customNamesBtn,
            autoNamesBtn: !!autoNamesBtn,
            customNamesSection: !!customNamesSection,
            autoNamesSection: !!autoNamesSection
        });

        if (customNamesBtn && autoNamesBtn && customNamesSection && autoNamesSection) {
            console.log('✅ All elements found, adding event listeners...');
            customNamesBtn.addEventListener('click', () => {
                console.log('🖱️ Custom names button clicked');
                // Switch to custom names mode
                customNamesBtn.className = 'flex-1 px-4 py-2 text-sm font-medium rounded-l-lg border border-gray-300 bg-blue-50 text-blue-700 border-blue-300';
                autoNamesBtn.className = 'flex-1 px-4 py-2 text-sm font-medium rounded-r-lg border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100';
                
                customNamesSection.classList.remove('hidden');
                autoNamesSection.classList.add('hidden');
                console.log('✅ Switched to custom names mode');
            });

            autoNamesBtn.addEventListener('click', () => {
                console.log('🖱️ Auto names button clicked');
                // Switch to auto names mode
                autoNamesBtn.className = 'flex-1 px-4 py-2 text-sm font-medium rounded-r-lg border border-gray-300 bg-blue-50 text-blue-700 border-blue-300';
                customNamesBtn.className = 'flex-1 px-4 py-2 text-sm font-medium rounded-l-lg border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100';
                
                autoNamesSection.classList.remove('hidden');
                customNamesSection.classList.add('hidden');
                console.log('✅ Switched to auto names mode');
            });
        }
    }

    showLoginModal() {
        document.getElementById('loginModal').classList.remove('hidden');
        document.getElementById('adminPanel').classList.add('hidden');
    }

    showAdminPanel() {
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
    }

    async startRace() {
        const raceDuration = parseInt(document.getElementById('raceDuration').value) * 1000; // Convert to milliseconds
        let duckNames = [];

        // Check which mode is active
        const customNamesSection = document.getElementById('customNamesSection');
        const autoNamesSection = document.getElementById('autoNamesSection');
        
        if (!customNamesSection.classList.contains('hidden')) {
            // Custom names mode
            const duckNamesText = document.getElementById('duckNames').value;
            duckNames = duckNamesText.split('\n').filter(name => name.trim());
        } else if (!autoNamesSection.classList.contains('hidden')) {
            // Auto names mode
            const duckCount = parseInt(document.getElementById('duckCount').value);
            if (duckCount < 2 || duckCount > 200) {
                this.showToast('Số lượng vịt phải từ 2-200', 'error');
                return;
            }
            // Generate names from 1 to N
            duckNames = Array.from({ length: duckCount }, (_, i) => (i + 1).toString());
        } else {
            this.showToast('Vui lòng chọn cách tạo danh sách vịt', 'error');
            return;
        }

        if (duckNames.length < 2) {
            this.showToast('Cần ít nhất 2 vịt để bắt đầu cuộc đua', 'error');
            return;
        }

        if (raceDuration < 5000 || raceDuration > 300000) {
            this.showToast('Thời gian đua phải từ 5-300 giây', 'error');
            return;
        }

        try {
            const response = await fetch('/api/start-race', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify({ duckNames, raceDuration })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast(data.message, 'success');
            } else {
                this.showToast(data.message || 'Lỗi khởi động cuộc đua', 'error');
            }
        } catch (error) {
            this.showToast('Lỗi kết nối server', 'error');
        }
    }

    async resetRace() {
        try {
            const response = await fetch('/api/reset-race', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Cuộc đua đã được reset', 'info');
            } else {
                this.showToast(data.message || 'Lỗi reset cuộc đua', 'error');
            }
        } catch (error) {
            this.showToast('Lỗi kết nối server', 'error');
        }
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus') || document.getElementById('adminConnectionStatus');
        if (statusElement) {
            if (connected) {
                statusElement.innerHTML = '<span class="w-2 h-2 bg-green-400 rounded-full mr-2"></span>Đã kết nối';
                statusElement.className = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800';
            } else {
                statusElement.innerHTML = '<span class="w-2 h-2 bg-red-400 rounded-full mr-2"></span>Mất kết nối';
                statusElement.className = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800';
            }
        }
    }

    updateRaceDisplay() {
        if (this.isAdmin) {
            this.updateAdminRaceDisplay();
        } else {
            this.updateUserRaceDisplay();
        }
    }

    updateAdminRaceDisplay() {
        // Update race status
        const statusElement = document.getElementById('currentStatus');
        if (statusElement) {
            if (this.raceState.isRunning) {
                statusElement.textContent = 'Đang chạy';
                statusElement.className = 'px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800';
            } else if (this.raceState.isFinished) {
                statusElement.textContent = 'Đã kết thúc';
                statusElement.className = 'px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800';
            } else {
                statusElement.textContent = 'Chưa bắt đầu';
                statusElement.className = 'px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800';
            }
        }

        // Update duck count
        const duckCountElement = document.getElementById('duckCount');
        if (duckCountElement) {
            duckCountElement.textContent = this.raceState.ducks.length;
        }

        // Update race time
        const raceTimeElement = document.getElementById('raceTime');
        const remainingTimeElement = document.getElementById('remainingTime');
        const totalRaceTimeElement = document.getElementById('totalRaceTime');
        
        // console.log('Admin timer update:', {
        //     raceDuration: this.raceState.raceDuration,
        //     startTime: this.raceState.startTime,
        //     isRunning: this.raceState.isRunning
        // });
        
        if (raceTimeElement && this.raceState.startTime) {
            const elapsed = Math.floor((Date.now() - this.raceState.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            raceTimeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (remainingTimeElement && this.raceState.raceDuration && this.raceState.startTime) {
            const elapsed = Date.now() - this.raceState.startTime;
            const remaining = Math.max(0, this.raceState.raceDuration - elapsed);
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            remainingTimeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (totalRaceTimeElement && this.raceState.raceDuration) {
            const totalSeconds = Math.floor(this.raceState.raceDuration / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            totalRaceTimeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        // Show/hide live race display
        const raceTrack = document.getElementById('raceTrack');
        if (raceTrack) {
            if (this.raceState.isRunning || this.raceState.isFinished) {
                raceTrack.classList.remove('hidden');
                console.log('🦆 Calling updateLiveDucksDisplay...');
                this.updateLiveDucksDisplay();
            } else {
                raceTrack.classList.add('hidden');
            }
        }

        // Show/hide race results
        const raceResults = document.getElementById('raceResults');
        if (raceResults) {
            if (this.raceState.isFinished) {
                raceResults.classList.remove('hidden');
                this.updateRaceResults();
            } else {
                raceResults.classList.add('hidden');
            }
        }
    }

    updateUserRaceDisplay() {
        // Update status title and message
        const statusTitle = document.getElementById('statusTitle');
        const statusMessage = document.getElementById('statusMessage');
        const raceTimer = document.getElementById('raceTimer');
        
        if (this.raceState.isRunning) {
            statusTitle.textContent = '🏃‍♂️ Cuộc đua đang diễn ra!';
            statusMessage.textContent = 'Các vịt đang cố gắng về đích...';
            
            // Show race timer
            if (raceTimer) {
                raceTimer.classList.remove('hidden');
                this.updateRaceTimer();
            }
        } else if (this.raceState.isFinished) {
            statusTitle.textContent = '🏆 Cuộc đua đã kết thúc!';
            statusMessage.textContent = `Vịt thắng cuộc: ${this.raceState.winner?.name || 'Chưa xác định'}`;
            
            // Hide race timer
            if (raceTimer) {
                raceTimer.classList.add('hidden');
            }
            
            // Show race results
            this.showRaceResults();
        } else {
            statusTitle.textContent = 'Chờ cuộc đua bắt đầu';
            statusMessage.textContent = 'Admin sẽ khởi động cuộc đua sớm...';
            
            // Hide race timer
            if (raceTimer) {
                raceTimer.classList.add('hidden');
            }
        }

        // Update ducks display
        this.updateDucksDisplay();
    }

    updateDucksDisplay() {
        const ducksContainer = document.getElementById('ducksContainer');
        const speedDisplay = document.getElementById('speedDisplay');
        const speedList = document.getElementById('speedList');
        
        if (!ducksContainer) return;

        ducksContainer.innerHTML = '';

        this.raceState.ducks.forEach((duck, index) => {
            const duckElement = this.createDuckElement(duck, index);
            ducksContainer.appendChild(duckElement);
        });
        
        // Hiển thị vận tốc nếu cuộc đua đang chạy
        if (this.raceState.isRunning && speedDisplay && speedList) {
            speedDisplay.classList.remove('hidden');
            this.updateSpeedDisplay();
        } else if (speedDisplay) {
            speedDisplay.classList.add('hidden');
        }
    }
    
    updateSpeedDisplay() {
        const speedList = document.getElementById('speedList');
        if (!speedList) return;
        
        speedList.innerHTML = '';
        
        // Sắp xếp vịt theo vị trí (dẫn đầu trước)
        const sortedDucks = [...this.raceState.ducks].sort((a, b) => b.position - a.position);
        
        sortedDucks.forEach((duck, index) => {
            const speedItem = document.createElement('div');
            speedItem.className = 'flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border';
            
            const position = index + 1;
            const positionIcon = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
            
            const speedValue = duck.speedMs || 0;
            const speedColor = speedValue > 5 ? 'text-green-600' : speedValue > 2 ? 'text-yellow-600' : 'text-red-600';
            const speedBar = Math.min(100, (speedValue / 10) * 100); // Giả sử tốc độ tối đa 10 m/s
            
            
            speedItem.innerHTML = `
                <div class="flex items-center space-x-3">
                    <span class="text-lg font-bold">${positionIcon}</span>
                    <span class="text-2xl">
                        <svg width="36" height="36" viewBox="0 0 209.322 209.322" style="transform: scaleX(-1); filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));" id="speed-duck-svg-${duck.id}">
                            <g>
                                <path d="M105.572,101.811c9.889-6.368,27.417-16.464,28.106-42.166c0.536-20.278-9.971-49.506-49.155-50.878
                                    C53.041,7.659,39.9,28.251,36.071,46.739l-0.928-0.126c-1.932,0-3.438,1.28-5.34,2.889c-2.084,1.784-4.683,3.979-7.792,4.308
                                    c-3.573,0.361-8.111-1.206-11.698-2.449c-4.193-1.431-6.624-2.047-8.265-0.759c-1.503,1.163-2.178,3.262-2.028,6.226
                                    c0.331,6.326,4.971,18.917,16.016,25.778c7.67,4.765,16.248,5.482,20.681,5.482c0.006,0,0.006,0,0.006,0
                                    c2.37,0,4.945-0.239,7.388-0.726c2.741,4.218,5.228,7.476,6.037,9.752c2.054,5.851-27.848,25.087-27.848,55.01
                                    c0,29.916,22.013,48.475,56.727,48.475h55.004c30.593,0,70.814-29.908,75.291-92.48C180.781,132.191,167.028,98.15,105.572,101.811
                                    z M18.941,77.945C8.775,71.617,4.992,58.922,5.294,55.525c0.897,0.24,2.194,0.689,3.228,1.042
                                    c4.105,1.415,9.416,3.228,14.068,2.707c4.799-0.499,8.253-3.437,10.778-5.574c0.607-0.509,1.393-1.176,1.872-1.491
                                    c0.87,0.315,0.962,0.693,1.176,3.14c0.196,2.26,0.473,5.37,2.362,9.006c1.437,2.761,3.581,5.705,5.646,8.542
                                    c1.701,2.336,4.278,5.871,4.535,6.404c-0.445,1.184-4.907,3.282-12.229,3.282C30.177,82.591,23.69,80.904,18.941,77.945z
                                    M56.86,49.368c0-4.938,4.001-8.943,8.931-8.943c4.941,0,8.942,4.005,8.942,8.943c0,4.931-4.001,8.942-8.942,8.942
                                    C60.854,58.311,56.86,54.299,56.86,49.368z M149.159,155.398l-20.63,11.169l13.408,9.293c0,0-49.854,15.813-72.198-6.885
                                    c-11.006-11.16-13.06-28.533,4.124-38.84c17.184-10.312,84.609,3.943,84.609,3.943L134.295,147.8L149.159,155.398z" 
                                    fill="hsl(${(parseInt(duck.id.replace('duck_', '')) * 51.4) % 360}, 70%, 50%)" 
                                    stroke="hsl(${(parseInt(duck.id.replace('duck_', '')) * 51.4) % 360}, 80%, 30%)" 
                                    stroke-width="2"/>
                            </g>
                        </svg>
                    </span>
                    <div>
                        <div class="font-semibold text-gray-800">${duck.name}</div>
                        <div class="text-sm text-gray-500">${(duck.position * 10).toFixed(1)}m / 1000m (${duck.position.toFixed(1)}%)</div>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="text-right">
                        <div class="text-2xl font-bold ${speedColor}">${speedValue.toFixed(2)}</div>
                        <div class="text-sm text-gray-500">m/s</div>
                    </div>
                    <div class="w-20 bg-gray-200 rounded-full h-2">
                        <div class="bg-blue-500 h-2 rounded-full transition-all duration-300" style="width: ${speedBar}%"></div>
                    </div>
                </div>
            `;
            
            // SVG vịt đã được tạo trực tiếp trong HTML
            
            speedList.appendChild(speedItem);
        });
    }


    updateLiveDucksDisplay() {
        console.log('🦆 updateLiveDucksDisplay called!');
        const ducksContainer = document.getElementById('ducksContainer');
        if (!ducksContainer) {
            console.error('❌ ducksContainer not found!');
            return;
        }

        ducksContainer.innerHTML = '';

        // Điều chỉnh kích thước hồ bơi theo số lượng vịt (x2 height)
        const duckCount = this.raceState.ducks.length;
        const maxHeight = 1400; // Tăng gấp đôi từ 700 lên 1400
        const minHeight = 400; // Tăng gấp đôi từ 200 lên 400
        const heightPerDuck = 100; // Tăng gấp đôi từ 50 lên 100px cho mỗi con vịt
        const calculatedHeight = Math.min(maxHeight, Math.max(minHeight, duckCount * heightPerDuck));
        
        console.log(`🏊‍♂️ Pool height calculation: ${duckCount} ducks, calculated height: ${calculatedHeight}px`);
        
        // Tìm pool container để điều chỉnh chiều cao
        const poolContainer = document.getElementById('poolContainer');
        if (poolContainer) {
            const oldHeight = poolContainer.style.height;
            poolContainer.style.height = `${calculatedHeight}px`;
            console.log(`🏊‍♂️ Pool container height changed from ${oldHeight} to ${calculatedHeight}px`);
            console.log(`🏊‍♂️ Pool container computed style:`, {
                height: poolContainer.style.height,
                offsetHeight: poolContainer.offsetHeight,
                clientHeight: poolContainer.clientHeight
            });
        } else {
            console.error('❌ poolContainer not found!');
        }
        
        ducksContainer.style.position = 'relative';
        ducksContainer.style.overflow = 'hidden'; // Cho phép vịt đè lên nhau

        this.raceState.ducks.forEach((duck, index) => {
            const duckElement = this.createDuckElement(duck, index);
            ducksContainer.appendChild(duckElement);
        });
    }

    createDuckElement(duck, index) {
        const duckDiv = document.createElement('div');
        duckDiv.className = 'absolute top-0 left-0 w-full h-full pointer-events-none';
        
        // Calculate position in the water pool
        const poolWidth = 100; // Percentage
        const leftPosition = Math.min(duck.position, 98);
        // Use duck ID as stable identifier for vertical position
        const duckId = parseInt(duck.id.replace('duck_', ''));
        
        // Điều chỉnh vị trí dọc dựa trên số lượng vịt: phân bố đều với khoảng đệm trên/dưới
        const duckCount = this.raceState.ducks.length;
        // Lấy chiều cao thực tế của pool container
        const poolContainer = document.getElementById('poolContainer');
        const poolHeight = poolContainer ? poolContainer.offsetHeight : Math.min(1400, Math.max(400, duckCount * 100));

        // Tính thứ tự ổn định theo ID để không nhảy vị trí khi cập nhật
        const ducksSortedById = [...this.raceState.ducks].sort((a, b) => {
            const aId = parseInt(a.id.replace('duck_', ''));
            const bId = parseInt(b.id.replace('duck_', ''));
            return aId - bId;
        });
        const orderIndex = ducksSortedById.findIndex(d => d.id === duck.id); // 0..duckCount-1

        const topPadding = 60; // lề trên/dưới để không chạm mép
        const availableHeight = Math.max(0, poolHeight - topPadding * 2);
        // spacing đều, để lại lề trên và dưới: chia cho (duckCount + 1)
        const spacing = duckCount > 0 ? (availableHeight / (duckCount + 1)) : 0;
        let topPosition = topPadding + (orderIndex + 1) * spacing;

        // Đảm bảo vị trí không vượt quá chiều cao hồ bơi
        topPosition = Math.min(topPosition, poolHeight - 60);
        
        // Debug log chỉ cho vịt đầu tiên để tránh spam
        if (duckId === 0) {
            console.log(`🦆 Duck ${duck.name}: duckId=${duckId}, duckCount=${duckCount}, poolHeight=${poolHeight}, topPosition=${topPosition}`);
        }
        
        // Duck swimming in water
        const duckSwimmer = document.createElement('div');
        duckSwimmer.className = 'absolute transition-all duration-100 ease-linear';
        duckSwimmer.style.left = `${leftPosition}%`;
        duckSwimmer.style.top = `${topPosition}px`;
        duckSwimmer.style.transform = 'translateX(-50%)';
        
        // Duck icon with swimming animation - sử dụng SVG đơn sắc
        const duckIcon = document.createElement('div');
        duckIcon.className = 'duck-swimmer text-2xl relative';
        // Đảm bảo vịt hướng về bên phải
        duckIcon.style.transform = 'scaleX(-1)';
        
        // Tạo màu sắc ổn định dựa trên ID của vịt
        const colorDuckId = parseInt(duck.id.replace('duck_', ''));
        const hue = (colorDuckId * 51.4) % 360; // Tạo màu sắc khác nhau cho mỗi vịt
        
        // SVG vịt đẹp với màu sắc tùy chỉnh
        const color = `hsl(${hue}, 70%, 50%)`;
        const darkColor = `hsl(${hue}, 80%, 30%)`;
        
        duckIcon.innerHTML = `
            <svg width="48" height="48" viewBox="0 0 209.322 209.322" style=filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
                <g>
                    <path d="M105.572,101.811c9.889-6.368,27.417-16.464,28.106-42.166c0.536-20.278-9.971-49.506-49.155-50.878
                        C53.041,7.659,39.9,28.251,36.071,46.739l-0.928-0.126c-1.932,0-3.438,1.28-5.34,2.889c-2.084,1.784-4.683,3.979-7.792,4.308
                        c-3.573,0.361-8.111-1.206-11.698-2.449c-4.193-1.431-6.624-2.047-8.265-0.759c-1.503,1.163-2.178,3.262-2.028,6.226
                        c0.331,6.326,4.971,18.917,16.016,25.778c7.67,4.765,16.248,5.482,20.681,5.482c0.006,0,0.006,0,0.006,0
                        c2.37,0,4.945-0.239,7.388-0.726c2.741,4.218,5.228,7.476,6.037,9.752c2.054,5.851-27.848,25.087-27.848,55.01
                        c0,29.916,22.013,48.475,56.727,48.475h55.004c30.593,0,70.814-29.908,75.291-92.48C180.781,132.191,167.028,98.15,105.572,101.811
                        z M18.941,77.945C8.775,71.617,4.992,58.922,5.294,55.525c0.897,0.24,2.194,0.689,3.228,1.042
                        c4.105,1.415,9.416,3.228,14.068,2.707c4.799-0.499,8.253-3.437,10.778-5.574c0.607-0.509,1.393-1.176,1.872-1.491
                        c0.87,0.315,0.962,0.693,1.176,3.14c0.196,2.26,0.473,5.37,2.362,9.006c1.437,2.761,3.581,5.705,5.646,8.542
                        c1.701,2.336,4.278,5.871,4.535,6.404c-0.445,1.184-4.907,3.282-12.229,3.282C30.177,82.591,23.69,80.904,18.941,77.945z
                        M56.86,49.368c0-4.938,4.001-8.943,8.931-8.943c4.941,0,8.942,4.005,8.942,8.943c0,4.931-4.001,8.942-8.942,8.942
                        C60.854,58.311,56.86,54.299,56.86,49.368z M149.159,155.398l-20.63,11.169l13.408,9.293c0,0-49.854,15.813-72.198-6.885
                        c-11.006-11.16-13.06-28.533,4.124-38.84c17.184-10.312,84.609,3.943,84.609,3.943L134.295,147.8L149.159,155.398z" 
                        fill="${color}" 
                        stroke="${darkColor}" 
                        stroke-width="2"/>
                </g>
            </svg>
        `;
        
        // Swimming animation
        if (this.raceState.isRunning && !duck.finished) {
            duckIcon.classList.add('swimming');
        }
        
        // Đảm bảo vịt hướng về phía bên phải (không cần vì SVG đã có scaleX(-1))
        // duckIcon.style.transform = 'scaleX(-1)';
        
        if (duck.finished) {
            duckIcon.style.animation = 'none';
            duckIcon.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3)) brightness(1.2)';
        }
        
        duckSwimmer.appendChild(duckIcon);
        
        // Duck name floating above the duck
        const duckName = document.createElement('div');
        duckName.className = 'duck-name-floating absolute -top-6 left-1/2 transform -translate-x-1/2';
        duckName.style.cssText = `
            background: rgba(255,255,255,0.95);
            color: black;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            white-space: nowrap;
            pointer-events: none;
            z-index: 10;
            border: 1px solid rgba(0,0,0,0.2);
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        `;
        duckName.textContent = duck.name;
        
        duckSwimmer.appendChild(duckName);
        duckDiv.appendChild(duckSwimmer);
        
        return duckDiv;
    }

    createLiveDuckElement(duck, index) {
        const duckDiv = document.createElement('div');
        duckDiv.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
        
        const duckInfo = document.createElement('div');
        duckInfo.className = 'flex items-center space-x-3';
        
        const duckIcon = document.createElement('span');
        duckIcon.className = 'duck-icon';
        duckIcon.textContent = '🦆';
        duckIcon.style.color = duck.color;
        
        const duckName = document.createElement('span');
        duckName.className = 'font-semibold';
        duckName.textContent = duck.name;
        
        duckInfo.appendChild(duckIcon);
        duckInfo.appendChild(duckName);
        
        const progressInfo = document.createElement('div');
        progressInfo.className = 'flex items-center space-x-2';
        
        const progressBar = document.createElement('div');
        progressBar.className = 'w-32 bg-gray-200 rounded-full h-2';
        
        const progressFill = document.createElement('div');
        progressFill.className = 'bg-blue-500 h-2 rounded-full transition-all duration-300';
        progressFill.style.width = `${Math.min(duck.position, 98)}%`;
        
        progressBar.appendChild(progressFill);
        
        const progressText = document.createElement('span');
        progressText.className = 'text-sm font-medium text-gray-600';
        progressText.textContent = `${(duck.position * 10).toFixed(1)}m`;
        
        progressInfo.appendChild(progressBar);
        progressInfo.appendChild(progressText);
        
        duckDiv.appendChild(duckInfo);
        duckDiv.appendChild(progressInfo);
        
        return duckDiv;
    }

    updateRaceResults() {
        const resultsList = document.getElementById('resultsList');
        if (!resultsList) return;

        resultsList.innerHTML = '';

        const sortedDucks = [...this.raceState.ducks].sort((a, b) => {
            if (a.finished && b.finished) {
                return (a.finishTime || 0) - (b.finishTime || 0);
            }
            return b.finished - a.finished;
        });

        sortedDucks.forEach((duck, index) => {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg';
            
            const position = document.createElement('div');
            position.className = 'flex items-center space-x-3';
            
            const positionNumber = document.createElement('span');
            positionNumber.className = 'w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold';
            positionNumber.textContent = index + 1;
            
            const duckInfo = document.createElement('div');
            duckInfo.className = 'flex items-center space-x-3';
            
            const duckIcon = document.createElement('span');
            duckIcon.className = 'duck-icon';
            duckIcon.textContent = '🦆';
            duckIcon.style.color = duck.color;
            
            const duckName = document.createElement('span');
            duckName.className = 'font-semibold';
            duckName.textContent = duck.name;
            
            duckInfo.appendChild(duckIcon);
            duckInfo.appendChild(duckName);
            
            position.appendChild(positionNumber);
            position.appendChild(duckInfo);
            
            const timeInfo = document.createElement('div');
            timeInfo.className = 'text-sm text-gray-600';
            
            if (duck.finished) {
                const finishTime = new Date(duck.finishTime);
                timeInfo.textContent = finishTime.toLocaleTimeString();
            } else {
                timeInfo.textContent = 'Chưa hoàn thành';
            }
            
            resultDiv.appendChild(position);
            resultDiv.appendChild(timeInfo);
            
            resultsList.appendChild(resultDiv);
        });
    }

    updateRaceTimer() {
        const remainingTimeElement = document.getElementById('remainingTime');
        const elapsedTimeElement = document.getElementById('elapsedTime');
        
        // console.log('Updating race timer:', {
        //     raceDuration: this.raceState.raceDuration,
        //     startTime: this.raceState.startTime,
        //     isRunning: this.raceState.isRunning
        // });
        
        if (remainingTimeElement && this.raceState.raceDuration && this.raceState.startTime) {
            const elapsed = Date.now() - this.raceState.startTime;
            const remaining = Math.max(0, this.raceState.raceDuration - elapsed);
            
            // Update remaining time
            const remainingMinutes = Math.floor(remaining / 60000);
            const remainingSeconds = Math.floor((remaining % 60000) / 1000);
            remainingTimeElement.textContent = `${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
            
            // Update elapsed time
            if (elapsedTimeElement) {
                const elapsedMinutes = Math.floor(elapsed / 60000);
                const elapsedSeconds = Math.floor((elapsed % 60000) / 1000);
                elapsedTimeElement.textContent = `${elapsedMinutes.toString().padStart(2, '0')}:${elapsedSeconds.toString().padStart(2, '0')}`;
            }
        } else {
            console.log('Timer elements not found or missing data:', {
                remainingTimeElement: !!remainingTimeElement,
                elapsedTimeElement: !!elapsedTimeElement,
                raceDuration: this.raceState.raceDuration,
                startTime: this.raceState.startTime
            });
        }
    }

    showRaceResults() {
        const raceResults = document.getElementById('raceResults');
        if (!raceResults) return;
        
        raceResults.classList.remove('hidden');
        
        // Update winner highlight
        const winnerName = document.getElementById('winnerName');
        const winnerMessage = document.getElementById('winnerMessage');
        
        if (winnerName && this.raceState.winner) {
            winnerName.textContent = this.raceState.winner.name;
        }
        
        if (winnerMessage) {
            winnerMessage.textContent = this.raceState.winner ? 
                `Chúc mừng ${this.raceState.winner.name} đã thắng cuộc!` : 
                'Cuộc đua đã kết thúc!';
        }
        
        // Update results table
        this.updateResultsTable();
        
        // Update race summary
        this.updateRaceSummary();
    }

    updateResultsTable() {
        const tableBody = document.getElementById('resultsTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        // Sort ducks by finish time or position
        const sortedDucks = [...this.raceState.ducks].sort((a, b) => {
            if (a.finished && b.finished) {
                return (a.finishTime || 0) - (b.finishTime || 0);
            }
            return b.position - a.position;
        });
        
        sortedDucks.forEach((duck, index) => {
            const row = document.createElement('tr');
            row.className = index === 0 ? 'bg-yellow-50' : 'hover:bg-gray-50';
            
            const position = index + 1;
            const positionIcon = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
            
            const finishTime = duck.finished && duck.finishTime ? 
                new Date(duck.finishTime).toLocaleTimeString() : 
                'Chưa hoàn thành';
            
            const status = duck.finished ? 
                '<span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Về đích</span>' :
                '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Đang đua</span>';
            
            row.innerHTML = `
                <td class="px-4 py-3 font-bold text-lg">${positionIcon}</td>
                <td class="px-4 py-3">
                    <div class="flex items-center space-x-2">
                        <span class="text-2xl">
                            <svg width="36" height="36" viewBox="0 0 209.322 209.322" style="transform: scaleX(-1); filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));" id="result-duck-svg-${duck.id}">
                                <g>
                                    <path d="M105.572,101.811c9.889-6.368,27.417-16.464,28.106-42.166c0.536-20.278-9.971-49.506-49.155-50.878
                                        C53.041,7.659,39.9,28.251,36.071,46.739l-0.928-0.126c-1.932,0-3.438,1.28-5.34,2.889c-2.084,1.784-4.683,3.979-7.792,4.308
                                        c-3.573,0.361-8.111-1.206-11.698-2.449c-4.193-1.431-6.624-2.047-8.265-0.759c-1.503,1.163-2.178,3.262-2.028,6.226
                                        c0.331,6.326,4.971,18.917,16.016,25.778c7.67,4.765,16.248,5.482,20.681,5.482c0.006,0,0.006,0,0.006,0
                                        c2.37,0,4.945-0.239,7.388-0.726c2.741,4.218,5.228,7.476,6.037,9.752c2.054,5.851-27.848,25.087-27.848,55.01
                                        c0,29.916,22.013,48.475,56.727,48.475h55.004c30.593,0,70.814-29.908,75.291-92.48C180.781,132.191,167.028,98.15,105.572,101.811
                                        z M18.941,77.945C8.775,71.617,4.992,58.922,5.294,55.525c0.897,0.24,2.194,0.689,3.228,1.042
                                        c4.105,1.415,9.416,3.228,14.068,2.707c4.799-0.499,8.253-3.437,10.778-5.574c0.607-0.509,1.393-1.176,1.872-1.491
                                        c0.87,0.315,0.962,0.693,1.176,3.14c0.196,2.26,0.473,5.37,2.362,9.006c1.437,2.761,3.581,5.705,5.646,8.542
                                        c1.701,2.336,4.278,5.871,4.535,6.404c-0.445,1.184-4.907,3.282-12.229,3.282C30.177,82.591,23.69,80.904,18.941,77.945z
                                        M56.86,49.368c0-4.938,4.001-8.943,8.931-8.943c4.941,0,8.942,4.005,8.942,8.943c0,4.931-4.001,8.942-8.942,8.942
                                        C60.854,58.311,56.86,54.299,56.86,49.368z M149.159,155.398l-20.63,11.169l13.408,9.293c0,0-49.854,15.813-72.198-6.885
                                        c-11.006-11.16-13.06-28.533,4.124-38.84c17.184-10.312,84.609,3.943,84.609,3.943L134.295,147.8L149.159,155.398z" 
                                        fill="hsl(${(parseInt(duck.id.replace('duck_', '')) * 51.4) % 360}, 70%, 50%)" 
                                        stroke="hsl(${(parseInt(duck.id.replace('duck_', '')) * 51.4) % 360}, 80%, 30%)" 
                                        stroke-width="2"/>
                                </g>
                            </svg>
                        </span>
                        <span class="font-semibold">${duck.name}</span>
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div class="flex items-center space-x-2">
                        <div class="w-16 bg-gray-200 rounded-full h-2">
                            <div class="bg-blue-500 h-2 rounded-full" style="width: ${Math.min(duck.position, 98)}%"></div>
                        </div>
                        <span class="text-sm font-medium">${(duck.position * 10).toFixed(1)}m (${duck.position.toFixed(1)}%)</span>
                    </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">${finishTime}</td>
                <td class="px-4 py-3">${status}</td>
            `;
            
            tableBody.appendChild(row);
            
            // SVG vịt đã được tạo trực tiếp trong HTML
        });
    }

    updateRaceSummary() {
        const totalDucks = document.getElementById('totalDucks');
        const finishedDucks = document.getElementById('finishedDucks');
        const raceDuration = document.getElementById('raceDuration');
        
        if (totalDucks) {
            totalDucks.textContent = this.raceState.ducks.length;
        }
        
        if (finishedDucks) {
            const finishedCount = this.raceState.ducks.filter(duck => duck.finished).length;
            finishedDucks.textContent = finishedCount;
        }
        
        if (raceDuration && this.raceState.raceDuration) {
            const durationSeconds = Math.floor(this.raceState.raceDuration / 1000);
            raceDuration.textContent = `${durationSeconds}s`;
        }
    }

    showWinnerAnnouncement(winner) {
        const winnerModal = document.getElementById('winnerAnnouncement');
        const winnerName = document.getElementById('winnerName');
        
        if (winnerModal && winnerName) {
            winnerName.textContent = winner.name;
            winnerModal.classList.remove('hidden');
        }
    }

    closeWinnerModal() {
        const winnerModal = document.getElementById('winnerAnnouncement');
        if (winnerModal) {
            winnerModal.classList.add('hidden');
        }
    }

    startTimer() {
        this.stopTimer(); // Clear any existing timer
        this.timerInterval = setInterval(() => {
            if (this.raceState.isRunning) {
                this.updateRaceDisplay();
            }
        }, 1000); // Update every second
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type} px-6 py-3 rounded-lg shadow-lg max-w-sm`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Global functions for HTML onclick events
function closeWinnerModal() {
    if (window.duckRaceApp) {
        window.duckRaceApp.closeWinnerModal();
    }
}

function setRaceDuration(seconds) {
    const durationInput = document.getElementById('raceDuration');
    if (durationInput) {
        durationInput.value = seconds;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.duckRaceApp = new DuckRaceApp();
});

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.duckRaceApp) {
        // Refresh race status when page becomes visible
        window.duckRaceApp.updateRaceDisplay();
    }
});


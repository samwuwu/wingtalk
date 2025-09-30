class BroadcastSystem {
    constructor() {
        this.audioPlayer = document.getElementById('audioPlayer');
        this.nowPlayingEl = document.getElementById('nowPlaying');
        this.miniToggleBtn = document.getElementById('miniToggleBtn');
        this.expandToggleBtn = document.getElementById('expandToggleBtn');
        this.miniPlayPauseBtn = document.getElementById('miniPlayPauseBtn');
        this.playButtons = document.querySelectorAll('.play-btn');
        this.stopBtn = document.getElementById('stopBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeValue = document.getElementById('volumeValue');
        this.currentTrack = document.getElementById('currentTrack');
        this.currentTime = document.getElementById('currentTime');
        this.duration = document.getElementById('duration');
        this.progressFill = document.getElementById('progressFill');
        this.playingStatus = document.getElementById('playingStatus');
        this.playingIcon = document.querySelector('.playing-icon i');
        this.currentButton = null;
        this.isPlaying = false;
        this.isPaused = false;
        
        this.init();
    }
    
    init() {
        // 流式播放友好：仅加载元数据
        if (this.audioPlayer) {
            this.audioPlayer.preload = 'metadata';
        }
        // 绑定播放按钮事件
        this.playButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handlePlayClick(e));
        });
        
        // 移除拖拽初始化（移动端不适用）
        
        // 移除自定义上传与URL输入功能
        
        // 绑定情景标签页事件
        this.sceneTabs = document.querySelectorAll('.scene-tab');
        this.sceneTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.handleSceneTabClick(e));
        });
        
        // 绑定停止按钮事件
        this.stopBtn.addEventListener('click', () => this.stopPlayback());
        
        // 绑定音量控制事件
        this.volumeSlider.addEventListener('input', (e) => this.updateVolume(e));
        
        // 绑定音频播放器事件
        this.audioPlayer.addEventListener('timeupdate', () => this.updateProgress());
        this.audioPlayer.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audioPlayer.addEventListener('ended', () => this.handleTrackEnd());
        this.audioPlayer.addEventListener('error', (e) => this.handleError(e));
        
        // 自定义上传已移除，不绑定文件选择事件
        
        // 设置初始音量
        this.audioPlayer.volume = 0.5;
        
        // 添加页面加载动画
        this.addLoadingAnimations();
        
        // 添加键盘快捷键支持
        this.addKeyboardSupport();
        
        // 不启用拖拽上传（移动端不适用）
        
        // 初始化情景选择
        this.initSceneSelector();

        // 初始化迷你模式（吸顶迷你条）
        this.initMiniMode();

        // 本地文件协议提示
        try {
            if (window.location && window.location.protocol === 'file:') {
                this.showNotification('使用 file:// 打开会被浏览器拦截，请用本地服务器访问（如 python3 -m http.server）', 'warning');
                console.warn('Detected file:// protocol. Please serve via http://localhost to avoid CORS/file policy issues.');
            }
        } catch (_) {}
    }

    // 初始化播放条迷你模式（随滚动收缩为更紧凑样式）
    initMiniMode() {
        // 若元素不存在则跳过
        if (!this.nowPlayingEl) return;

        // 读取持久化设置
        try {
            const persisted = localStorage.getItem('nowPlayingMiniForced');
            this.miniForced = persisted === '1';
        } catch (_) { this.miniForced = false; }

        // 展开态（仅在强制迷你时可用，不持久化）
        this.miniExpanded = false;

        // 绑定按钮
        if (this.miniToggleBtn) {
            this.miniToggleBtn.addEventListener('click', () => this.toggleMiniForced());
            this.updateMiniToggleBtn();
        }

        if (this.expandToggleBtn) {
            this.expandToggleBtn.addEventListener('click', () => this.toggleMiniExpanded());
            this.updateExpandToggleBtn();
        }

        if (this.miniPlayPauseBtn) {
            this.miniPlayPauseBtn.addEventListener('click', () => this.handleMiniPlayPause());
            this.updateMiniPlayPauseBtn();
        }

        // 绑定滚动与尺寸变化时的更新
        this._onScrollResize = () => this.updateNowPlayingMiniMode();
        window.addEventListener('scroll', this._onScrollResize, { passive: true });
        window.addEventListener('resize', this._onScrollResize);

        // 初始执行一次
        this.updateNowPlayingMiniMode();
    }

    // 根据滚动位置与视口切换迷你样式
    updateNowPlayingMiniMode() {
        if (!this.nowPlayingEl) return;

        const isMobile = window.innerWidth <= 768;
        // 阈值：移动端更敏感，桌面端略大
        const threshold = isMobile ? 60 : 120;
        const shouldMiniRaw = this.miniForced || window.scrollY > threshold;
        const shouldMini = shouldMiniRaw && !this.miniExpanded;

        if (shouldMini) {
            this.nowPlayingEl.classList.add('now-playing--mini');
            if (this.miniExpanded) this.nowPlayingEl.classList.add('now-playing--expanded');
            else this.nowPlayingEl.classList.remove('now-playing--expanded');
        } else {
            this.nowPlayingEl.classList.remove('now-playing--mini');
            this.nowPlayingEl.classList.remove('now-playing--expanded');
        }
    }

    // 切换强制迷你
    toggleMiniForced() {
        this.miniForced = !this.miniForced;
        try { localStorage.setItem('nowPlayingMiniForced', this.miniForced ? '1' : '0'); } catch (_) {}
        if (!this.miniForced) {
            // 取消强制后一并收起展开态
            this.miniExpanded = false;
            this.updateExpandToggleBtn();
        }
        this.updateMiniToggleBtn();
        this.updateNowPlayingMiniMode();
    }

    // 切换迷你展开（仅在迷你强制或滚动触发时有效显示）
    toggleMiniExpanded() {
        this.miniExpanded = !this.miniExpanded;
        this.updateExpandToggleBtn();
        this.updateNowPlayingMiniMode();
    }

    // 更新按钮UI
    updateMiniToggleBtn() {
        if (!this.miniToggleBtn) return;
        this.miniToggleBtn.setAttribute('aria-pressed', this.miniForced ? 'true' : 'false');
        const icon = this.miniToggleBtn.querySelector('i');
        if (icon) icon.className = this.miniForced ? 'fas fa-compress' : 'fas fa-compress-alt';
    }

    // 更新展开按钮UI
    updateExpandToggleBtn() {
        if (!this.expandToggleBtn) return;
        this.expandToggleBtn.setAttribute('aria-expanded', this.miniExpanded ? 'true' : 'false');
        const icon = this.expandToggleBtn.querySelector('i');
        if (icon) icon.className = this.miniExpanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        const text = this.expandToggleBtn.querySelector('.btn-text');
        if (text) text.textContent = this.miniExpanded ? '收起' : '展开';
    }

    // 迷你播放/暂停按钮
    handleMiniPlayPause() {
        // 如果当前无音频源
        const hasSrc = !!(this.audioPlayer && this.audioPlayer.currentSrc);
        if (!hasSrc && !this.currentButton) {
            this.showNotification('请选择要播放的音频', 'warning');
            return;
        }
        if (this.isPlaying) {
            this.pausePlayback();
        } else if (this.isPaused) {
            this.resumePlayback();
        } else if (hasSrc) {
            // 有音源但未播放
            this.resumePlayback();
        } else if (this.currentButton) {
            // 回到当前按钮对应的音源
            const audioSrc = this.currentButton?.dataset?.audio;
            const trackTitle = this.currentButton?.dataset?.title;
            this.startPlayback(this.currentButton, audioSrc, trackTitle);
        }
    }

    updateMiniPlayPauseBtn() {
        if (!this.miniPlayPauseBtn) return;
        const icon = this.miniPlayPauseBtn.querySelector('i');
        if (!icon) return;
        icon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
    }
    
    handlePlayClick(e) {
        const button = e.currentTarget;
        const audioSrc = button.dataset.audio;
        const trackTitle = button.dataset.title;
        
        // 如果点击的是当前正在播放的按钮
        if (this.currentButton === button) {
            if (this.isPlaying) {
                this.pausePlayback();
            } else {
                this.resumePlayback();
            }
            return;
        }
        
        // 停止当前播放
        if (this.isPlaying) {
            this.stopPlayback();
        }
        
        // 开始新的播放
        this.startPlayback(button, audioSrc, trackTitle);
    }
    
    async startPlayback(button, audioSrc, trackTitle) {
        try {
            // 如果有其他音频在播放，先停止
            if (this.isPlaying && this.currentButton !== button) {
                this.stopPlayback();
            }
            
            // 设置音频源和标题
            if (audioSrc) {
                await this.setAudioSource(audioSrc);
            }
            if (trackTitle) {
                this.currentTrack.textContent = trackTitle;
            }
            
            // 播放音频
            this.audioPlayer.play().then(() => {
                this.isPlaying = true;
                this.isPaused = false;
                const targetButton = button || this.currentButton;
                if (targetButton) {
                    this.currentButton = targetButton;
                    this.updateButtonState(targetButton, true);
                }
                this.playingStatus.textContent = '正在播放';
                this.playingIcon.className = 'fas fa-music';
                
                // 添加脉冲效果
                if (targetButton) {
                    this.addPulseEffect(targetButton);
                }
                this.updateMiniPlayPauseBtn();
            }).catch(error => {
                console.error('播放失败:', error);
                this.handleError(error);
            });
        } catch (error) {
            console.error('启动播放失败:', error);
            this.handleError(error);
        }
    }

    // 统一设置音频源，优先使用流式播放（.m3u8 使用 HLS）
    async setAudioSource(src) {
        // 清理旧的 Hls 实例
        if (this._hls) {
            try { this._hls.destroy(); } catch (_) {}
            this._hls = null;
        }

        const isHls = typeof src === 'string' && /\.m3u8(\?.*)?$/i.test(src);
        // 判断是否跨域资源
        let isCrossOrigin = false;
        try {
            const u = new URL(src, window.location.href);
            isCrossOrigin = u.origin !== window.location.origin;
        } catch (_) {
            // blob:/data: 等无需跨域处理
        }
        // 仅在需要时启用 crossOrigin
        this.audioPlayer.crossOrigin = (isHls || isCrossOrigin) ? 'anonymous' : '';
        if (isHls) {
            const canNative = this.audioPlayer.canPlayType('application/vnd.apple.mpegurl');
            if (canNative) {
                this.audioPlayer.src = src;
                return;
            }
            if (window.Hls) {
                const hls = new window.Hls({ enableWorker: true, lowLatencyMode: true });
                hls.attachMedia(this.audioPlayer);
                hls.on(window.Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(src));
                this._hls = hls;
                return;
            }
            // 动态加载 hls.js（浏览器在线时）
            try {
                await this.loadHlsJs();
                if (window.Hls) {
                    const hls = new window.Hls({ enableWorker: true, lowLatencyMode: true });
                    hls.attachMedia(this.audioPlayer);
                    hls.on(window.Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(src));
                    this._hls = hls;
                    return;
                }
            } catch (_) {
                // 忽略错误，回退到直接设置
            }
        }
        // 普通音频走浏览器渐进式下载（需服务器支持 Range）
        this.audioPlayer.src = src;
    }

    loadHlsJs() {
        return new Promise((resolve, reject) => {
            if (window.Hls) return resolve();
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('hls.js 加载失败'));
            document.head.appendChild(script);
        });
    }
    
    pausePlayback() {
        this.audioPlayer.pause();
        this.isPlaying = false;
        this.isPaused = true;
        this.playingStatus.textContent = '已暂停';
        
        // 更新按钮状态
        if (this.currentButton) {
            const icon = this.currentButton.querySelector('i');
            if (icon) icon.className = 'fas fa-play';
            const textEl = this.currentButton.querySelector('.btn-text');
            if (textEl) textEl.textContent = '播放';
        }
        
        // 移除播放动画
        this.playingIcon.classList.remove('playing-animation');
        this.updateMiniPlayPauseBtn();
    }
    
    resumePlayback() {
        this.audioPlayer.play()
            .then(() => {
                this.isPlaying = true;
                this.isPaused = false;
                this.playingStatus.textContent = '正在播放...';
                
                // 更新按钮状态
                if (this.currentButton) {
                    const icon = this.currentButton.querySelector('i');
                    if (icon) icon.className = 'fas fa-pause';
                    const textEl = this.currentButton.querySelector('.btn-text');
                    if (textEl) textEl.textContent = '暂停';
                }
                
                // 添加播放动画
                this.playingIcon.classList.add('playing-animation');
                this.updateMiniPlayPauseBtn();
            })
            .catch(error => {
                console.error('恢复播放失败:', error);
                this.playingStatus.textContent = '播放失败';
            });
    }
    
    stopPlayback() {
        // 停止音频
        this.audioPlayer.pause();
        this.audioPlayer.currentTime = 0;
        
        // 重置状态
        this.isPlaying = false;
        this.isPaused = false;
        this.currentTrack.textContent = '准备播放...';
        this.playingStatus.textContent = '等待中';
        
        // 重置进度条
        this.progressFill.style.width = '0%';
        this.currentTime.textContent = '0:00';
        
        // 重置按钮状态
        if (this.currentButton) {
            this.updateButtonState(this.currentButton, false);
        }
        
        // 移除播放动画
        this.playingIcon.classList.remove('playing-animation');
        
        this.currentButton = null;
        this.updateMiniPlayPauseBtn();
    }
    
    updateButtonState(button, isPlaying) {
        const icon = button.querySelector('i');
        const btnText = button.querySelector('.btn-text');
        
        if (isPlaying) {
            button.classList.add('playing');
            if (icon) icon.className = 'fas fa-pause';
            if (btnText) btnText.textContent = '暂停';
            
            // 添加脉冲动画
            this.addPulseEffect(button);
        } else {
            button.classList.remove('playing');
            if (icon) icon.className = 'fas fa-play';
            if (btnText) btnText.textContent = '播放';
        }
    }
    
    updateVolume(e) {
        const volume = e.target.value / 100;
        this.audioPlayer.volume = volume;
        this.volumeValue.textContent = e.target.value + '%';
        
        // 更新音量滑块的视觉效果
        const percentage = e.target.value;
        e.target.style.background = `linear-gradient(90deg, #40e0d0 0%, #40e0d0 ${percentage}%, rgba(255, 255, 255, 0.1) ${percentage}%, rgba(255, 255, 255, 0.1) 100%)`;
    }
    
    updateProgress() {
        if (this.audioPlayer.duration) {
            const progress = (this.audioPlayer.currentTime / this.audioPlayer.duration) * 100;
            this.progressFill.style.width = progress + '%';
            this.currentTime.textContent = this.formatTime(this.audioPlayer.currentTime);
        }
    }
    
    updateDuration() {
        this.duration.textContent = this.formatTime(this.audioPlayer.duration);
    }
    
    handleTrackEnd() {
        this.playingStatus.textContent = '播放完成';
        this.isPlaying = false;
        
        // 重置按钮状态
        if (this.currentButton) {
            this.updateButtonState(this.currentButton, false);
        }
        
        // 移除播放动画
        this.playingIcon.classList.remove('playing-animation');
        
        // 重置进度条
        setTimeout(() => {
            this.progressFill.style.width = '0%';
            this.currentTime.textContent = '0:00';
            this.currentTrack.textContent = '准备播放...';
            this.playingStatus.textContent = '等待中';
        }, 1000);
    }
    
    handleError(e) {
        console.error('音频播放错误:', e);
        this.playingStatus.textContent = '加载失败';
        
        if (this.currentButton) {
            this.updateButtonState(this.currentButton, false);
        }
    }
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    addPulseEffect(button) {
        // 创建脉冲动画元素
        const pulse = document.createElement('div');
        pulse.style.position = 'absolute';
        pulse.style.top = '50%';
        pulse.style.left = '50%';
        pulse.style.width = '0';
        pulse.style.height = '0';
        pulse.style.background = 'rgba(64, 224, 208, 0.6)';
        pulse.style.borderRadius = '50%';
        pulse.style.transform = 'translate(-50%, -50%)';
        pulse.style.animation = 'pulseEffect 2s ease-out';
        pulse.style.pointerEvents = 'none';
        pulse.style.zIndex = '0';
        
        button.appendChild(pulse);
        
        // 动画结束后移除元素
        setTimeout(() => {
            if (pulse.parentNode) {
                pulse.parentNode.removeChild(pulse);
            }
        }, 2000);
    }
    
    addLoadingAnimations() {
        // 为广播卡片添加渐入动画
        const cards = document.querySelectorAll('.broadcast-card');
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in');
        });
        
        // 为播放器区域添加延迟动画
        const nowPlaying = document.querySelector('.now-playing');
        nowPlaying.style.animationDelay = `${cards.length * 0.1 + 0.2}s`;
        nowPlaying.classList.add('fade-in');
    }
    
    addKeyboardSupport() {
        // 空格键暂停/播放
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target !== this.volumeSlider) {
                e.preventDefault();
                
                if (this.isPlaying) {
                    this.pausePlayback();
                } else if (this.isPaused) {
                    this.resumePlayback();
                } else if (this.currentButton) {
                    this.resumePlayback();
                }
            }
            
            // S键停止播放
            if (e.code === 'KeyS') {
                this.stopPlayback();
            }
            
            // 上下箭头调节音量
            if (e.code === 'ArrowUp') {
                e.preventDefault();
                const currentVolume = parseInt(this.volumeSlider.value);
                const newVolume = Math.min(100, currentVolume + 5);
                this.volumeSlider.value = newVolume;
                this.updateVolume({ target: this.volumeSlider });
            }
            
            if (e.code === 'ArrowDown') {
                e.preventDefault();
                const currentVolume = parseInt(this.volumeSlider.value);
                const newVolume = Math.max(0, currentVolume - 5);
                this.volumeSlider.value = newVolume;
                this.updateVolume({ target: this.volumeSlider });
            }
        });    }
    
    // 处理文件选择
    handleFileSelect(event) {
        event.preventDefault();
        const files = Array.from(event.target.files);
        if (files.length === 0) {
            this.showNotification('请选择音频文件', 'warning');
            return;
        }
        console.log('选择的文件:', files);
        this.addFiles(files);
        // 清空文件输入，允许重复选择同一文件
        event.target.value = '';
    }
    
    // Web Audio API 音频解码和分析
    async processAudioWithWebAudio(file) {
        try {
            // 创建音频上下文
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 创建音频缓冲区
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // 获取音频信息
            const duration = audioBuffer.duration;
            const sampleRate = audioBuffer.sampleRate;
            const channels = audioBuffer.numberOfChannels;
            
            console.log('音频信息:', {
                duration: duration.toFixed(2) + '秒',
                sampleRate: sampleRate + 'Hz',
                channels: channels + '声道',
                length: audioBuffer.length
            });
            
            // 创建音频元素进行播放
            const audioUrl = URL.createObjectURL(file);
            const audio = new Audio(audioUrl);
            
            return {
                audio: audio,
                context: audioContext,
                buffer: audioBuffer,
                metadata: {
                    duration,
                    sampleRate,
                    channels,
                    length: audioBuffer.length
                }
            };
        } catch (error) {
            console.error('Web Audio处理失败:', error);
            throw error;
        }
    }
    
    // 使用Web Audio API播放音频（用于iOS设备）
    async playAudioWithWebAudio(file, elementId = 'audioPlayer') {
        try {
            const audioData = await this.processAudioWithWebAudio(file);
            
            // 连接音频输出
            const source = audioData.context.createMediaElementSource(audioData.audio);
            const analyser = audioData.context.createAnalyser();
            const gainNode = audioData.context.createGain();
            
            source.connect(gainNode);
            gainNode.connect(analyser);
            analyser.connect(audioData.context.destination);
            
            // 设置音量
            gainNode.gain.value = this.audioPlayer.volume || 0.5;
            
            return audioData.audio;
        } catch (error) {
            console.error('Web Audio播放失败:', error);
            // 回退到常规播放方式
            return null;
        }
    }
    
    // 添加文件到列表
    addFiles(files) {
        let addedCount = 0;
        let rejectedCount = 0;
        let errorCount = 0;
        
        console.log('开始处理文件，总数:', files.length);
        
        files.forEach((file, index) => {
            console.log(`处理文件 ${index + 1}/${files.length}:`, file.name, file.type, file.size, file.lastModified);
            
            if (this.isAudioFile(file)) {
                try {
                    // 处理中文文件名编码
                    const fileName = this.decodeFileName(file.name);
                    const fileUrl = URL.createObjectURL(file);
                    
                    const fileData = {
                        id: Date.now() + Math.random(),
                        file: file,
                        name: fileName,
                        originalName: file.name,
                        size: this.formatFileSize(file.size),
                        url: fileUrl,
                        isLocalFile: true,
                        mimeType: file.type || '未知MIME类型'
                    };
                    
                    this.uploadedFiles.push(fileData);
                    this.renderFileItem(fileData);
                    addedCount++;
                    
                    console.log(`文件 ${index + 1} 添加成功:`, fileName);
                    this.showNotification(`文件 "${fileName}" 已加载`, 'success');
                    
                } catch (error) {
                    console.error(`文件 ${file.name} 处理失败:`, error);
                    errorCount++;
                    this.showNotification(`文件 "${file.name}" 处理失败: ${error.message}`, 'error');
                }
            } else {
                rejectedCount++;
                console.log(`文件 ${file.name} 被拒绝，不是支持的音频格式`);
                this.showNotification(`文件 "${file.name}" 不是支持的音频格式`, 'warning');
            }
        });
        
        // 显示批量操作结果
        if (files.length > 1) {
            let resultMessage = '';
            if (addedCount > 0) {
                resultMessage += `成功添加 ${addedCount} 个文件`;
            }
            if (rejectedCount > 0) {
                resultMessage += (resultMessage ? ', ' : '') + `${rejectedCount} 个文件格式不支持`;
            }
            if (errorCount > 0) {
                resultMessage += (resultMessage ? ', ' : '') + `${errorCount} 个文件处理失败`;
            }
            
            if (resultMessage) {
                const type = addedCount > 0 ? (rejectedCount + errorCount > 0 ? 'warning' : 'success') : 'error';
                this.showNotification(resultMessage, type);
            }
        }
        
        console.log('文件处理完成，总计:', { addedCount, rejectedCount, errorCount });
    }
    
    // 解码文件名（处理中文编码问题）
    decodeFileName(fileName) {
        try {
            // 尝试解码URL编码的文件名
            if (fileName.includes('%')) {
                return decodeURIComponent(fileName);
            }
            // 尝试处理UTF-8编码
            const decoder = new TextDecoder('utf-8');
            const encoder = new TextEncoder();
            const encoded = encoder.encode(fileName);
            const decoded = decoder.decode(encoded);
            return decoded;
        } catch (error) {
            console.warn('文件名解码失败，使用原始文件名:', error);
            return fileName;
        }
    }
    
    // 检查是否为音频文件
    isAudioFile(file) {
        const audioTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/x-wav', 'audio/x-m4a', 'audio/mp4', 'audio/flac', 'audio/x-flac', 'audio/wma'];
        const fileName = file.name.toLowerCase();
        
        // 检查MIME类型
        if (file.type && audioTypes.includes(file.type)) {
            console.log('文件通过MIME类型检查:', file.name, file.type);
            return true;
        }
        
        // 检查文件扩展名 - iOS设备主要依赖扩展名
        const audioExtensions = ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.flac', '.wma', '.mp4', '.m4b', '.oga', '.opus'];
        const hasValidExtension = audioExtensions.some(ext => fileName.endsWith(ext));
        
        // 检查文件大小（至少1字节，最多50MB）
        const isValidSize = file.size > 0 && file.size <= 50 * 1024 * 1024;
        
        if (hasValidExtension && isValidSize) {
            console.log('文件通过扩展名和大小检查:', file.name);
            return true;
        }
        
        // 针对iOS设备的特殊检查
        const isIOS = this.isIOSDevice();
        if (isIOS) {
            // iOS设备可能没有正确的MIME类型，主要依赖扩展名
            const iosAudioExtensions = ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.flac', '.wma'];
            const hasIOSExtension = iosAudioExtensions.some(ext => fileName.endsWith(ext));
            
            if (hasIOSExtension && file.size > 0) {
                console.log('iOS文件通过扩展名检查:', file.name);
                return true;
            }
        }
        
        console.log('文件不是有效的音频文件:', file.name, file.type);
        return false;
    }
    
    // 手动触发文件选择
    triggerFileSelect() {
        this.audioFileInput.click();
    }
    
    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // 渲染文件项
    renderFileItem(fileData) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item custom-file-item';
        fileItem.dataset.fileId = fileData.id;
        
        fileItem.innerHTML = `
            <div class="file-icon">
                <i class="fas fa-music"></i>
            </div>
            <div class="file-info">
                <div class="file-name">${fileData.name}</div>
                <div class="file-size">${fileData.size} • 本地文件</div>
            </div>
            <div class="file-actions">
                <button class="file-play-btn" onclick="broadcastSystem.playFile('${fileData.id}')">
                    <i class="fas fa-play"></i>
                </button>
                <button class="file-remove-btn" onclick="broadcastSystem.removeFile('${fileData.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        this.selectedFiles.appendChild(fileItem);
        
        // 添加文件加载完成提示
        this.showNotification(`文件 "${fileData.name}" 已加载，可直接播放`);
    }
    
    // 播放指定文件
    async playFile(fileId) {
        const fileData = this.uploadedFiles.find(f => f.id == fileId);
        if (!fileData) {
            this.showNotification('文件不存在或已被删除', 'error');
            return;
        }
        
        console.log('播放文件:', fileData);
        
        try {
            // 停止当前播放
            this.stopPlayback();
            
            // 验证文件URL是否有效
            if (!fileData.url || fileData.url === '') {
                throw new Error('文件URL无效');
            }
            
            // 设置新的音频源（支持流式/HLS）
            await this.setAudioSource(fileData.url);
            
            // 使用解码后的文件名显示
            const displayName = fileData.name || fileData.originalName;
            this.currentTrack.textContent = displayName;
            
            // 更新当前按钮
            const fileItem = document.querySelector(`[data-file-id="${fileId}"]`);
            if (!fileItem) {
                this.showNotification('找不到对应的文件项', 'error');
                return;
            }
            
            const playBtn = fileItem.querySelector('.file-play-btn');
            if (!playBtn) {
                this.showNotification('找不到播放按钮', 'error');
                return;
            }
            
            this.currentButton = playBtn;
            
            // 添加Safari特殊错误处理
            this.audioPlayer.onerror = (e) => {
                console.error('音频播放错误:', e);
                let errorMessage = '音频文件播放失败';
                
                // Safari特殊错误处理
                if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
                    errorMessage += '，Safari可能不支持此文件格式';
                }
                
                this.showNotification(errorMessage, 'error');
                this.updateButtonState(playBtn, false);
            };
            
            // 添加加载超时处理
            const loadTimeout = setTimeout(() => {
                if (this.audioPlayer.readyState === 0) {
                    this.showNotification('文件加载超时，请检查文件是否损坏', 'error');
                    this.updateButtonState(playBtn, false);
                }
            }, 10000);
            
            // 文件加载成功时清除超时
            this.audioPlayer.onloadeddata = () => {
                clearTimeout(loadTimeout);
            };
            
            // 开始播放（沿用当前 audio 源）
            this.startPlayback();
            
        } catch (error) {
            console.error('播放文件失败:', error);
            this.showNotification(`播放失败: ${error.message}`, 'error');
        }
    }
    
    // 移除文件
    removeFile(fileId) {
        const fileIndex = this.uploadedFiles.findIndex(f => f.id == fileId);
        if (fileIndex === -1) return;
        
        const fileData = this.uploadedFiles[fileIndex];
        
        // 如果正在播放这个文件，先停止
        if (this.audioPlayer.src === fileData.url) {
            this.stopPlayback();
        }
        
        // 释放URL对象
        if (fileData.url) {
            URL.revokeObjectURL(fileData.url);
        }
        
        // 从数组中移除
        this.uploadedFiles.splice(fileIndex, 1);
        
        // 从DOM中移除
        const fileItem = document.querySelector(`[data-file-id="${fileId}"]`);
        if (fileItem) {
            fileItem.remove();
        }
        
        this.showNotification(`文件 "${fileData.name}" 已移除`);
    }
    
    // 显示通知
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-info-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 自动移除通知
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // iOS文件选择专用错误处理
    handleIOSFileSelectionError(error, context = '文件选择') {
        console.error(`iOS${context}失败:`, error);
        
        // 检查错误类型
        const errorMessage = error.message || error.toString();
        const isPermissionError = errorMessage.includes('permission') || errorMessage.includes('Permission');
        const isNotFoundError = errorMessage.includes('not found') || errorMessage.includes('NotFound');
        const isCancelError = errorMessage.includes('cancel') || errorMessage.includes('Cancel');
        
        if (isCancelError) {
            // 用户取消选择，不显示错误
            console.log('用户取消了文件选择');
            return;
        }
        
        if (isPermissionError) {
            this.showNotification('文件访问权限被拒绝，请在设置中允许访问音频文件', 'error');
            this.showIOSAlternativeMethod();
        } else if (isNotFoundError) {
            this.showNotification('未找到音频文件，请检查文件位置', 'error');
            this.showIOSAlternativeMethod();
        } else {
            // 其他错误，显示通用错误信息
            this.showNotification(`${context}失败: ${errorMessage}`, 'error');
            this.showIOSAlternativeMethod();
        }
    }
    
    // 显示iOS文件选择状态指示器
    showIOSFileStatus(message, type = 'info') {
        // 移除已有的状态指示器
        const existingStatus = document.querySelector('.ios-file-status');
        if (existingStatus) {
            existingStatus.remove();
        }
        
        const status = document.createElement('div');
        status.className = `ios-file-status ${type}`;
        
        let icon = 'fas fa-info-circle';
        if (type === 'success') icon = 'fas fa-check-circle';
        if (type === 'error') icon = 'fas fa-exclamation-circle';
        if (type === 'loading') icon = 'fas fa-spinner';
        
        status.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(status);
        
        // 自动移除状态指示器
        const duration = type === 'loading' ? 5000 : 3000;
        setTimeout(() => {
            if (status.parentNode) {
                status.style.opacity = '0';
                setTimeout(() => {
                    if (status.parentNode) {
                        status.parentNode.removeChild(status);
                    }
                }, 300);
            }
        }, duration);
    }
    
    // 添加拖拽上传支持
    addDragDropSupport() {
        if (this._dragDropInitialized) return;
        this._dragDropInitialized = true;

        const uploadArea = document.querySelector('.file-upload-area');
        if (!uploadArea) return;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => uploadArea.classList.add('drag-over'), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('drag-over'), false);
        });
        
        uploadArea.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            this.addFiles(files);
        }, false);
        
        // 为iOS设备添加点击上传支持
        uploadArea.addEventListener('click', (e) => {
            // 防止重复触发：如果点击的是按钮或按钮内的元素，则不处理
            if (e.target.closest('.browse-btn') || e.target.closest('button')) return;
            // 防止事件冒泡
            e.stopPropagation();
            
            // iOS设备特殊处理
            if (this.isIOSDevice()) {
                console.log('iOS设备拖拽区域点击，显示iOS专用选择界面');
                this.showIOSAlternativeMethod();
            } else {
                this.triggerFileSelect();
            }
        });
    }
    
    // iOS Safari 强力文件选择
    forceIOSFileSelect() {
        console.log('开始 iOS Safari 强力文件选择');
        
        try {
            // 方案1: 使用动态创建的 input，增加更多音频格式支持
            this.createDynamicFileInput('audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.wma');
        } catch (error) {
            console.error('方案1失败:', error);
            
            try {
                // 方案2: 分阶段触发
                this.phasedTriggerFileSelect();
            } catch (error2) {
                console.error('方案2失败:', error2);
                
                // 方案3: 显示用户指导
                this.showiOSFileSelectionGuide();
            }
        }
    }
    
    // 创建动态文件输入元素
    createDynamicFileInput(accept) {
        console.log('创建动态文件输入:', accept);
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = accept;
        fileInput.multiple = true;
        fileInput.style.cssText = 'position: fixed; top: -9999px; left: -9999px; opacity: 0; width: 1px; height: 1px;';
        
        const changeHandler = (e) => {
            console.log('动态文件输入触发:', e.target.files);
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                setTimeout(() => {
                    this.addFiles(files);
                }, 50);
            }
            document.body.removeChild(fileInput);
        };
        
        fileInput.addEventListener('change', changeHandler);
        document.body.appendChild(fileInput);
        
        // 多次触发尝试
        setTimeout(() => fileInput.click(), 10);
        setTimeout(() => fileInput.click(), 100);
        setTimeout(() => fileInput.click(), 300);
        
        // 设置超时清理
        setTimeout(() => {
            if (document.body.contains(fileInput)) {
                document.body.removeChild(fileInput);
            }
        }, 5000);
    }
    
    // 分阶段触发文件选择
    phasedTriggerFileSelect() {
        return new Promise((resolve, reject) => {
            console.log('开始分阶段文件选择');
            
            const phase1 = () => {
                try {
                    const input1 = this.createHiddenFileInput('audio/mp3,audio/mpeg');
                    if (input1) {
                        this.checkFileInputSuccess(input1, phase2, reject);
                    } else {
                        phase2();
                    }
                } catch (error) {
                    console.error('阶段1失败:', error);
                    phase2();
                }
            };
            
            const phase2 = () => {
                try {
                    const input2 = this.createHiddenFileInput('audio/*,.mp3,.wav,.ogg');
                    if (input2) {
                        this.checkFileInputSuccess(input2, phase3, reject);
                    } else {
                        phase3();
                    }
                } catch (error) {
                    console.error('阶段2失败:', error);
                    phase3();
                }
            };
            
            const phase3 = () => {
                try {
                    const input3 = this.createHiddenFileInput('*/*');
                    if (input3) {
                        this.checkFileInputSuccess(input3, resolve, reject);
                    } else {
                        reject(new Error('所有文件选择方案都失败'));
                    }
                } catch (error) {
                    console.error('阶段3失败:', error);
                    reject(error);
                }
            };
            
            phase1();
        });
    }
    
    // 创建隐藏的文件输入
    createHiddenFileInput(accept) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.style.cssText = 'position: fixed; top: -9999px; left: -9999px; opacity: 0; width: 1px; height: 1px;';
        
        const handler = () => {
            input.removeEventListener('change', handler);
            return input;
        };
        
        input.addEventListener('change', handler);
        document.body.appendChild(input);
        input.click();
        
        // 如果5秒内没有响应，返回null
        setTimeout(() => {
            if (document.body.contains(input) && !input.value) {
                document.body.removeChild(input);
                return null;
            }
        }, 5000);
        
        return handler;
    }
    
    // 检查文件输入是否成功
    checkFileInputSuccess(input, successCallback, rejectCallback) {
        const checkInterval = setInterval(() => {
            if (input.value) {
                clearInterval(checkInterval);
                successCallback(input);
            }
        }, 100);
        
        // 5秒后检查
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!input.value) {
                if (document.body.contains(input)) {
                    document.body.removeChild(input);
                }
                rejectCallback(new Error('文件选择超时'));
            }
        }, 5000);
    }
    
    // 显示iOS文件选择指导
    showiOSFileSelectionGuide() {
        console.log('显示iOS文件选择指导');
        
        const guide = document.createElement('div');
        guide.className = 'ios-file-guide';
        guide.innerHTML = `
            <div class="guide-container">
                <div class="guide-icon">
                    <i class="fab fa-apple"></i>
                </div>
                <h3>iOS Safari 文件选择指南</h3>
                <div class="guide-steps">
                    <div class="step">
                        <span class="step-number">1</span>
                        <div class="step-content">
                            <h4>点击"从音乐库选择"</h4>
                            <p>选择iOS音乐应用中的音频文件</p>
                        </div>
                    </div>
                    <div class="step">
                        <span class="step-number">2</span>
                        <div class="step-content">
                            <h4>点击"从文件选择"</h4>
                            <p>使用iOS文件管理器选择文件</p>
                        </div>
                    </div>
                    <div class="step">
                        <span class="step-number">3</span>
                        <div class="step-content">
                            <h4>拖拽文件</h4>
                            <p>将音频文件拖拽到下方区域</p>
                        </div>
                    </div>
                </div>
                <div class="guide-tips">
                    <h4>提示：</h4>
                    <ul>
                        <li>请确保允许Safari访问文件</li>
                        <li>支持的格式：MP3、WAV、OGG、M4A、AAC</li>
                        <li>如果仍然无法选择，请尝试重启Safari</li>
                    </ul>
                </div>
                <button class="guide-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                    关闭
                </button>
            </div>
        `;
        
        document.body.appendChild(guide);
        
        // 自动关闭
        const autoClose = setTimeout(() => {
            if (document.body.contains(guide)) {
                guide.style.opacity = '0';
                setTimeout(() => {
                    if (document.body.contains(guide)) {
                        document.body.removeChild(guide);
                    }
                }, 300);
            }
        }, 30000);
        
        // 点击关闭时清除自动关闭
        const closeBtn = guide.querySelector('.guide-close');
        closeBtn.onclick = () => {
            clearTimeout(autoClose);
            if (document.body.contains(guide)) {
                document.body.removeChild(guide);
            }
        };
    }
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // 处理情景标签页点击
    handleSceneTabClick(e) {
        const tab = e.currentTarget;
        const sceneName = tab.dataset.scene;
        
        // 更新标签页状态
        this.sceneTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // 更新情景面板显示
        const scenePanels = document.querySelectorAll('.scene-panel');
        scenePanels.forEach(panel => {
            if (panel.dataset.scene === sceneName) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });
        
        // 添加切换动画效果
        this.addSceneTransitionEffect(sceneName);
    }
    
    // 初始化情景选择器
    initSceneSelector() {
        // 默认显示第一个情景
        const firstTab = this.sceneTabs[0];
        if (firstTab) {
            firstTab.classList.add('active');
        }
        
        const firstPanel = document.querySelector('.scene-panel');
        if (firstPanel) {
            firstPanel.classList.add('active');
        }
        
        // 优化移动端文件选择体验
        this.optimizeMobileFileSelection();
        
        // 检测浏览器并给出建议
        this.checkBrowserCompatibility();
    }
    
    // 检测浏览器兼容性并提供建议
    checkBrowserCompatibility() {
        const browser = this.detectBrowser();
        
        if (browser.isIOS) {
            if (browser.isSafari) {
                console.log('检测到iOS Safari，兼容性良好');
            } else if (browser.isChrome) {
                console.log('检测到iOS Chrome，兼容性一般，建议使用Safari');
                this.showBrowserRecommendation('Chrome');
            } else {
                console.log('检测到其他iOS浏览器，兼容性未知');
            }
        }
    }
    
    // 显示浏览器使用建议
    showBrowserRecommendation(browserType) {
        // 不主动显示推荐，避免打扰用户
        // 但会在备用界面中提供相应指导
        console.log(`建议使用Safari浏览器以获得最佳体验，当前使用${browserType}`);
    }
    
    // 添加情景切换动画效果
    addSceneTransitionEffect(sceneName) {
        const activePanel = document.querySelector('.scene-panel.active');
        if (activePanel) {
            // 移除所有动画类
            activePanel.classList.remove('scene-transition-in');
            // 强制重绘
            activePanel.offsetHeight;
            // 添加动画类
            activePanel.classList.add('scene-transition-in');
        }
    }
    
    // 优化移动端文件选择体验
    optimizeMobileFileSelection() {
        // 检测设备类型
        const userAgent = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(userAgent);
        const isAndroid = /Android/.test(userAgent);
        const isMobile = isIOS || isAndroid;
        
        console.log('设备检测:', { isIOS, isAndroid, isMobile, userAgent });
        
        // 检测iOS版本
        const iOSVersion = isIOS ? this.getIOSVersion(userAgent) : null;
        console.log('iOS版本:', iOSVersion);
        
        // 显示对应的文件选择界面
        this.setupFileSelectionInterface(isIOS, isAndroid);
        
        const fileInput = document.getElementById('audioFileInput');
        if (!fileInput) {
            console.error('找不到文件输入元素');
            return;
        }
        
        // iOS特殊处理：移除旧监听器并重新绑定
        if (isIOS) {
            // 移除所有可能的旧监听器
            const newInput = fileInput.cloneNode(true);
            fileInput.parentNode.replaceChild(newInput, fileInput);
            
            // 重新绑定事件监听器
            this.handleFileSelectBound = this.handleFileSelect.bind(this);
            newInput.addEventListener('change', this.handleFileSelectBound);
            
            // 添加iOS专用的事件监听器
            this.addIOSFileInputListeners(newInput);
            
            console.log('iOS文件选择器重新绑定完成');
        } else {
            // 非iOS设备的正常处理
            this.handleFileSelectBound = this.handleFileSelect.bind(this);
            fileInput.addEventListener('change', this.handleFileSelectBound);
        }
        
        // 根据设备类型优化文件输入
        this.optimizeFileInputForDevice(fileInput, isIOS, isAndroid, iOSVersion);
        
        console.log('文件选择器初始化完成');
    }
    
    // 获取iOS版本
    getIOSVersion(userAgent) {
        const iosMatch = userAgent.match(/OS (\d+)_(\d+)(?:_(\d+))?/);
        if (iosMatch) {
            return parseInt(iosMatch[1]);
        }
        return null;
    }
    
    // iOS专用文件输入事件监听器
    addIOSFileInputListeners(fileInput) {
        // 不拦截默认行为，避免阻止系统文件选择
        fileInput.addEventListener('touchstart', () => {
            console.log('iOS文件输入触摸开始');
        }, { passive: true });
        fileInput.addEventListener('touchend', () => {
            console.log('iOS文件输入触摸结束');
        }, { passive: true });
        fileInput.addEventListener('touchcancel', () => {
            console.log('iOS文件输入触摸取消');
        }, { passive: true });
    }
    
    // 设置文件选择界面
    setupFileSelectionInterface(isIOS, isAndroid) {
        const iosArea = document.getElementById('iosFileUploadArea');
        const standardArea = document.getElementById('standardFileUploadArea');
        const dropZone = document.getElementById('dropZone');
        
        if (isIOS) {
            // iOS设备：显示iOS专用界面
            if (iosArea) iosArea.style.display = 'block';
            if (standardArea) standardArea.style.display = 'none';
            if (dropZone) dropZone.style.display = 'none';
            
            console.log('显示iOS专用文件选择界面');
        } else {
            // 非iOS设备：显示标准界面
            if (iosArea) iosArea.style.display = 'none';
            if (standardArea) standardArea.style.display = 'block';
            if (dropZone) dropZone.style.display = 'flex';
            
            console.log('显示标准文件选择界面');
        }
    }
    
    // 根据设备类型优化文件输入
    optimizeFileInputForDevice(fileInput, isIOS, isAndroid, iOSVersion) {
        // 基础音频文件类型
        const audioTypes = 'audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.wma';
        
        if (isIOS) {
            // iOS: 仅设置音频类型与多选，不启用目录选择，不拦截点击
            fileInput.setAttribute('accept', audioTypes);
            fileInput.removeAttribute('capture');
            fileInput.setAttribute('multiple', '');
        } else if (isAndroid) {
            // Android处理
            fileInput.setAttribute('accept', audioTypes);
            fileInput.removeAttribute('capture');
            
        } else {
            // 桌面浏览器
            fileInput.setAttribute('accept', audioTypes);
        }
        
        // 确保文件输入可交互
        fileInput.style.display = 'block';
        fileInput.style.opacity = '0';
        fileInput.style.position = 'absolute';
        fileInput.style.width = '100%';
        fileInput.style.height = '100%';
        fileInput.style.top = '0';
        fileInput.style.left = '0';
        fileInput.style.zIndex = '1000';
    }
    
    // 设置拖拽上传
    setupDragAndDrop() {
        const dropZone = document.getElementById('dropZone');
        if (!dropZone) return;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('dragover');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('dragover');
            }, false);
        });
        
        dropZone.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            console.log('拖拽文件:', files);
            this.addFiles(files);
        }, false);
    }
    
    // 触发文件选择（统一入口）
    triggerFileSelect(source = 'standard') {
        console.log('触发文件选择，来源:', source);
        
        const fileInput = document.getElementById('audioFileInput');
        if (!fileInput) {
            this.showNotification('文件选择器初始化失败', 'error');
            return;
        }
        
        // 检测浏览器类型
        const browser = this.detectBrowser();
        console.log('浏览器检测:', browser);
        
        // 针对不同浏览器使用不同策略
        try {
            if (browser.isIOS && browser.isSafari) {
                // iOS Safari: 使用特殊的处理方式解决音频文件灰色问题
                this.setupFileInputForSource(fileInput, source);
                this.handleiOSSafariFileSelection(fileInput, source);
            } else if (browser.isIOS && browser.isChrome) {
                // iOS Chrome: 使用特殊方式处理
                this.setupFileInputForSource(fileInput, source);
                this.handleIOSChromeFileSelection(fileInput, source);
            } else if (browser.isIOS) {
                // 其他iOS浏览器
                this.setupFileInputForSource(fileInput, source);
                this.handleIOSFileSelection(fileInput, source);
            } else if (browser.isSafari) {
                // 桌面Safari
                this.handleSafariFileSelection(fileInput);
            } else {
                // 其他浏览器的标准处理
                this.handleStandardFileSelection(fileInput);
            }
        } catch (error) {
            console.error('文件选择失败:', error);
            this.handleFileSelectionError(error, false, browser.isSafari);
        }
    }
    
    // iOS Safari文件选择处理 - 解决音频文件灰色不可选问题
    handleiOSSafariFileSelection(fileInput, source) {
        console.log('处理iOS Safari文件选择，来源:', source);
        
        // iOS Safari使用特殊的accept策略
        fileInput.setAttribute('accept', 'audio/*');
        fileInput.removeAttribute('capture');
        
        // 显示iOS Safari专用提示
        this.showNotification('正在打开iOS Safari文件管理器...', 'info');
        
        // 延迟触发，确保用户有足够时间看到提示
        setTimeout(() => {
            try {
                // 使用全新的文件输入元素，避免Safari的状态问题
                const newFileInput = document.createElement('input');
                newFileInput.type = 'file';
                newFileInput.id = 'audioFileInput';
                newFileInput.className = 'audio-file-input';
                
                // iOS Safari使用audio/*，但设置webkitdirectory以触发文件管理器
                newFileInput.setAttribute('accept', 'audio/*');
                newFileInput.setAttribute('multiple', '');
                newFileInput.style.display = 'none';
                
                // 不启用目录选择，保持文件选择模式
                
                // 绑定事件监听器
                newFileInput.addEventListener('change', (e) => {
                    console.log('iOS Safari文件输入变化事件 - 文件数量:', e.target.files.length);
                    console.log('选择的文件详情:', Array.from(e.target.files).map(f => ({
                        name: f.name,
                        type: f.type || '未知MIME类型',
                        size: f.size,
                        extension: f.name.split('.').pop()?.toLowerCase()
                    })));
                    
                    // 检查是否有选择的文件
                    if (e.target.files.length === 0) {
                        console.log('没有选择文件，可能是音频文件灰色状态');
                        this.showNotification('未检测到音频文件，请尝试从"文件"应用中选择', 'warning');
                        this.showIOSAlternativeMethod();
                        return;
                    }
                    
                    // 替换全局文件输入引用
                    this.audioFileInput = newFileInput;
                    this.handleFileSelect(e);
                });
                
                // 移除旧的文件输入
                const oldFileInput = document.getElementById('audioFileInput');
                if (oldFileInput && oldFileInput.parentNode) {
                    oldFileInput.parentNode.removeChild(oldFileInput);
                }
                
                // 添加新的文件输入到body
                document.body.appendChild(newFileInput);
                
                // 更新当前文件输入引用
                this.audioFileInput = newFileInput;
                
                // 触发文件选择
                setTimeout(() => {
                    newFileInput.click();
                    console.log('iOS Safari文件选择器已触发');
                }, 300);
                
            } catch (error) {
                console.error('iOS Safari文件选择处理失败:', error);
                this.handleIOSFileSelectionError(error, '文件选择');
            }
        }, 800);
    }
    
    // iOS Chrome文件选择处理 - 解决无法打开文件管理器的问题
    handleIOSChromeFileSelection(fileInput, source) {
        console.log('处理iOS Chrome文件选择，来源:', source);
        
        // iOS Chrome使用扩展名列表
        fileInput.setAttribute('accept', '.mp3,.m4a,.wav,.aac,.ogg,.flac');
        fileInput.removeAttribute('capture');
        
        // 显示iOS Chrome专用提示
        this.showNotification('正在打开Chrome文件选择器...', 'info');
        
        // 延迟触发，确保用户有足够时间看到提示
        setTimeout(() => {
            try {
                // 创建全新的文件输入元素
                const newFileInput = document.createElement('input');
                newFileInput.type = 'file';
                newFileInput.id = 'audioFileInput';
                newFileInput.className = 'audio-file-input';
                
                // iOS Chrome使用扩展名列表
                newFileInput.setAttribute('accept', '.mp3,.m4a,.wav,.aac,.ogg,.flac');
                newFileInput.setAttribute('multiple', '');
                newFileInput.style.display = 'none';
                
                // 绑定事件监听器
                newFileInput.addEventListener('change', (e) => {
                    console.log('iOS Chrome文件输入变化事件 - 文件数量:', e.target.files.length);
                    console.log('选择的文件详情:', Array.from(e.target.files).map(f => ({
                        name: f.name,
                        type: f.type || '未知MIME类型',
                        size: f.size,
                        extension: f.name.split('.').pop()?.toLowerCase()
                    })));
                    
                    // 替换全局文件输入引用
                    this.audioFileInput = newFileInput;
                    this.handleFileSelect(e);
                });
                
                // 移除旧的文件输入
                const oldFileInput = document.getElementById('audioFileInput');
                if (oldFileInput && oldFileInput.parentNode) {
                    oldFileInput.parentNode.removeChild(oldFileInput);
                }
                
                // 添加新的文件输入到body
                document.body.appendChild(newFileInput);
                
                // 更新当前文件输入引用
                this.audioFileInput = newFileInput;
                
                // 触发文件选择
                setTimeout(() => {
                    newFileInput.click();
                    console.log('iOS Chrome文件选择器已触发');
                }, 200);
                
            } catch (error) {
                console.error('iOS Chrome文件选择处理失败:', error);
                this.handleIOSFileSelectionError(error, '文件选择');
            }
        }, 500);
    }
    
    // Safari文件选择处理
    handleSafariFileSelection(fileInput) {
        console.log('处理Safari文件选择');
        
        this.showSafariFileSelectionGuide();
        
        setTimeout(() => {
            fileInput.click();
        }, 500);
    }
    
    // 标准文件选择处理
    handleStandardFileSelection(fileInput) {
        console.log('处理标准文件选择');
        
        fileInput.click();
    }
    
    // 文件选择错误处理
    handleFileSelectionError(error, isIOS, isSafari) {
        console.error('文件选择错误:', error);
        
        if (isIOS) {
            this.showIOSAlternativeMethod();
        } else if (isSafari) {
            this.showNotification('Safari文件选择需要用户直接点击，请使用下方按钮', 'warning');
        } else {
            this.showNotification('文件选择对话框打开失败', 'error');
        }
    }
    
    // 显示Safari文件选择指导
    showSafariFileSelectionGuide() {
        const guide = document.createElement('div');
        guide.className = 'safari-file-guide';
        guide.innerHTML = `
            <div class="guide-content">
                <i class="fab fa-safari"></i>
                <div>
                    <h4>Safari 文件选择提示</h4>
                    <p>Safari浏览器需要您直接点击文件选择按钮</p>
                    <p>请在弹出的对话框中选择音频文件</p>
                </div>
                <button class="guide-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        guide.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #007AFF, #0056CC);
            color: white;
            padding: 16px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 122, 255, 0.3);
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(guide);
        
        // 自动移除
        setTimeout(() => {
            if (guide.parentNode) {
                guide.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (guide.parentNode) {
                        guide.parentNode.removeChild(guide);
                    }
                }, 300);
            }
        }, 5000);
    }
    
    // 根据来源和浏览器类型设置文件输入
    setupFileInputForSource(fileInput, source) {
        // 检测浏览器类型
        const browser = this.detectBrowser();
        
        console.log('设置文件输入，来源:', source, '浏览器:', browser);
        
        // 根据浏览器类型选择不同的策略
        switch (source) {
            case 'music':
                // 音乐库选择 - 大部分浏览器不支持，主要使用文件管理器
                this.setupFileInputForBrowser(fileInput, browser);
                break;
            case 'files':
                // 文件选择 - 根据浏览器类型优化
                this.setupFileInputForBrowser(fileInput, browser);
                break;
            default:
                // 默认选择 - 根据浏览器类型
                this.setupFileInputForBrowser(fileInput, browser);
        }
        
        // 确保multiple属性
        fileInput.setAttribute('multiple', '');
        
        console.log('文件输入设置完成，accept属性:', fileInput.getAttribute('accept'));
    }
    
    // 根据浏览器类型设置文件输入
    setupFileInputForBrowser(fileInput, browser) {
        if (browser.isIOS && browser.isSafari) {
            // iOS Safari: 使用简单的audio/*，但需要特殊处理
            fileInput.setAttribute('accept', 'audio/*');
            fileInput.removeAttribute('capture');
            console.log('iOS Safari: 使用audio/* accept');
            
        } else if (browser.isIOS && browser.isChrome) {
            // iOS Chrome: 使用扩展名列表，避免文件管理器问题
            fileInput.setAttribute('accept', '.mp3,.m4a,.wav,.aac,.ogg,.flac');
            fileInput.removeAttribute('capture');
            console.log('iOS Chrome: 使用扩展名列表');
            
        } else if (browser.isIOS) {
            // 其他iOS浏览器: 使用扩展名列表
            fileInput.setAttribute('accept', '.mp3,.m4a,.wav,.aac,.ogg,.flac');
            fileInput.removeAttribute('capture');
            console.log('iOS 其他浏览器: 使用扩展名列表');
            
        } else if (browser.isChrome) {
            // Chrome浏览器: 使用MIME类型
            fileInput.setAttribute('accept', 'audio/*');
            fileInput.removeAttribute('capture');
            console.log('Chrome: 使用audio/* MIME类型');
            
        } else if (browser.isFirefox) {
            // Firefox: 使用MIME类型
            fileInput.setAttribute('accept', 'audio/*');
            fileInput.removeAttribute('capture');
            console.log('Firefox: 使用audio/* MIME类型');
            
        } else if (browser.isEdge) {
            // Edge: 使用MIME类型
            fileInput.setAttribute('accept', 'audio/*');
            fileInput.removeAttribute('capture');
            console.log('Edge: 使用audio/* MIME类型');
            
        } else {
            // 默认: 使用MIME类型
            fileInput.setAttribute('accept', 'audio/*');
            fileInput.removeAttribute('capture');
            console.log('默认: 使用audio/* MIME类型');
        }
    }
    
    // iOS 专用文件选择
    triggerIOSFileSelect(mode = 'files') {
        console.log('iOS文件选择，模式:', mode);
        
        try {
            // 使用现有的文件输入元素
            const fileInput = document.getElementById('audioFileInput');
            if (!fileInput) {
                this.showNotification('文件选择器未找到', 'error');
                return;
            }
            
            // 强制使用文件管理器，不再使用音乐库模式
            // iOS 部分文件提供方的UTI/MIME映射异常，放宽accept到*/*以避免灰色不可选
            fileInput.setAttribute('accept', '*/*');
            
            // 确保multiple属性
            fileInput.setAttribute('multiple', '');
            
            // 显示iOS提示
            this.showNotification('正在打开iOS文件管理器...', 'info');
            
            // 直接触发点击
            fileInput.click();
            
        } catch (error) {
            console.error('iOS文件选择失败:', error);
            this.showNotification('文件选择失败，请尝试拖拽文件到页面', 'error');
        }
    }
    
    // 检测浏览器类型
    detectBrowser() {
        const ua = navigator.userAgent;
        return {
            isIOS: /iPad|iPhone|iPod/i.test(ua),
            isSafari: /Safari/i.test(ua) && !/Chrome|CriOS|Edg/i.test(ua),
            isChrome: /Chrome|CriOS/i.test(ua),
            isFirefox: /Firefox/i.test(ua),
            isEdge: /Edg/i.test(ua),
            isWeChat: /MicroMessenger/i.test(ua),
            isQQ: /QQ/i.test(ua),
            version: this.getBrowserVersion(ua)
        };
    }
    
    // 获取浏览器版本
    getBrowserVersion(userAgent) {
        const matches = userAgent.match(/(Safari|Chrome|Firefox|Edg)\/(\d+)/i);
        return matches ? matches[2] : 'unknown';
    }
    
    // 初始化拖拽功能
    initDragAndDrop() {
        const dropZone = document.getElementById('dropZone');
        
        // 防止默认拖拽行为
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });
        
        // 高亮拖拽区域
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-active');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-active');
            }, false);
        });
        
        // 处理文件拖拽
        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            this.handleDroppedFiles(files);
        }, false);
    }
    
    // 初始化URL输入功能
    initUrlInput() {
        const urlInput = document.getElementById('audioUrlInput');
        if (urlInput) {
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addAudioFromUrl();
                }
            });
        }
    }
    
    // 添加网络音频
    addAudioFromUrl() {
        const urlInput = document.getElementById('audioUrlInput');
        const url = urlInput.value.trim();
        
        if (!url) {
            this.showNotification('请输入音频URL地址', 'warning');
            return;
        }
        
        // 验证URL格式
        try {
            new URL(url);
        } catch (e) {
            this.showNotification('请输入有效的URL地址', 'error');
            return;
        }
        
        // 检查音频格式
        const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma'];
        const hasAudioExtension = audioExtensions.some(ext => url.toLowerCase().endsWith(ext));
        
        if (!hasAudioExtension && !url.includes('audio/')) {
            this.showNotification('请输入音频文件URL', 'warning');
            return;
        }
        
        // 创建音频文件对象
        const audioData = {
            id: Date.now() + Math.random(),
            name: this.getFileNameFromUrl(url),
            url: url,
            size: '未知',
            isLocalFile: false,
            isNetworkUrl: true,
            mimeType: this.getMimeTypeFromUrl(url)
        };
        
        this.uploadedFiles.push(audioData);
        this.renderFileItem(audioData);
        urlInput.value = '';
        
        this.showNotification(`已添加网络音频: ${audioData.name}`, 'success');
    }
    
    // 获取URL中的文件名
    getFileNameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop();
            return filename || '网络音频';
        } catch (e) {
            return '网络音频';
        }
    }
    
    // 从URL推断MIME类型
    getMimeTypeFromUrl(url) {
        const extension = url.split('.').pop().toLowerCase();
        const mimeTypes = {
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'ogg': 'audio/ogg',
            'm4a': 'audio/m4a',
            'aac': 'audio/aac',
            'flac': 'audio/flac',
            'wma': 'audio/x-wma'
        };
        return mimeTypes[extension] || 'audio/*';
    }
    
    // 处理拖拽的文件
    handleDroppedFiles(files) {
        if (files.length === 0) {
            this.showNotification('请拖拽音频文件', 'warning');
            return;
        }
        
        const fileArray = Array.from(files);
        let validFiles = 0;
        
        fileArray.forEach(file => {
            if (this.isAudioFile(file)) {
                this.addFile(file);
                validFiles++;
            } else {
                this.showNotification(`文件 ${file.name} 不是有效的音频文件`, 'error');
            }
        });
        
        if (validFiles > 0) {
            this.showNotification(`成功添加 ${validFiles} 个音频文件`, 'success');
        }
    }
    
    // 添加单个文件
    addFile(file) {
        try {
            const fileName = this.decodeFileName(file.name);
            const fileUrl = URL.createObjectURL(file);
            
            const fileData = {
                id: Date.now() + Math.random(),
                file: file,
                name: fileName,
                originalName: file.name,
                size: this.formatFileSize(file.size),
                url: fileUrl,
                isLocalFile: true,
                mimeType: file.type || '未知MIME类型'
            };
            
            this.uploadedFiles.push(fileData);
            this.renderFileItem(fileData);
        } catch (error) {
            console.error('添加文件失败:', error);
            this.showNotification('添加文件失败', 'error');
        }
    }
    
    // 预防默认拖拽行为
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // 检测是否为iOS设备
    isIOSDevice() {
        return this.detectBrowser().isIOS;
    }
    
    // iOS备用方法处理 - 根据不同浏览器显示不同指导
    showIOSAlternativeMethod() {
        console.log('显示iOS备用文件选择方法');
        
        // 检测浏览器类型
        const browser = this.detectBrowser();
        let browserSpecificContent = '';
        
        if (browser.isSafari) {
            browserSpecificContent = `
                <div class="browser-specific-info">
                    <div class="browser-icon">
                        <i class="fab fa-safari"></i>
                    </div>
                    <h4>iOS Safari 浏览器</h4>
                    <p>如果您看到音频文件呈灰色不可选状态，请注意：</p>
                    <ul>
                        <li>请从“文件”应用选择（iCloud Drive/在此 iPhone 上/下载），不要从Apple Music选择</li>
                        <li>确保文件已保存为实际文件（非受保护或仅云端占位）</li>
                        <li>若仍为灰色，可使用“iOS兼容选择”按钮或将文件拷贝到“下载”文件夹后再试</li>
                    </ul>
                </div>
            `;
        } else if (browser.isChrome) {
            browserSpecificContent = `
                <div class="browser-specific-info">
                    <div class="browser-icon">
                        <i class="fab fa-chrome"></i>
                    </div>
                    <h4>Chrome 浏览器</h4>
                    <p>Chrome浏览器可能无法直接打开文件管理器，请尝试：</p>
                    <ul>
                        <li>点击下方的"Chrome文件选择"按钮</li>
                        <li>如果您有iCloud Drive应用，可以尝试从中选择</li>
                        <li>或者使用Safari浏览器以获得更好的兼容性</li>
                    </ul>
                </div>
            `;
        } else {
            browserSpecificContent = `
                <div class="browser-specific-info">
                    <div class="browser-icon">
                        <i class="fas fa-question-circle"></i>
                    </div>
                    <h4>其他浏览器</h4>
                    <p>请尝试以下通用方法：</p>
                    <ul>
                        <li>点击下方按钮选择音频文件</li>
                        <li>如果无法选择，请尝试从Safari浏览器访问</li>
                        <li>也可以尝试拖拽音频文件到页面</li>
                    </ul>
                </div>
            `;
        }
        
        const iosAlternative = document.createElement('div');
        iosAlternative.className = 'ios-alternative-upload';
        iosAlternative.innerHTML = `
            <div class="ios-alternative-content">
                <div class="ios-alternative-icon">
                    <i class="fas fa-folder-open"></i>
                </div>
                <h3>iOS 文件选择</h3>
                <p>点击下方按钮从文件管理器选择音频文件</p>
                ${browserSpecificContent}
                <div class="ios-alternative-buttons">
                    ${browser.isChrome ? 
                        `<button onclick="broadcastSystem.triggerIOSAlternative('chrome')" class="ios-alt-files-btn">
                            <i class="fab fa-chrome"></i>
                            <span>Chrome文件选择</span>
                        </button>` : 
                        `<button onclick="broadcastSystem.triggerIOSAlternative('files')" class="ios-alt-files-btn">
                            <i class="fas fa-music"></i>
                            <span>选择音频文件</span>
                        </button>`
                    }
                    <button onclick="broadcastSystem.triggerIOSAlternative('standard')" class="ios-alt-files-btn">
                        <i class="fas fa-folder"></i>
                        <span>标准文件选择</span>
                    </button>
                </div>
                <p class="ios-alternative-tips">
                    <i class="fas fa-info-circle"></i>
                    支持格式：MP3、WAV、OGG、M4A、AAC、FLAC
                </p>
                <div class="ios-alternative-hints">
                    <p><strong>通用提示：</strong></p>
                    <ul>
                        <li>请在iOS文件管理器中查找音频文件</li>
                        <li>支持从音乐应用、文件应用或其他应用中选择</li>
                        <li>如果无法选择，请尝试拖拽文件到页面</li>
                        <li>建议使用Safari浏览器以获得最佳兼容性</li>
                    </ul>
                </div>
            </div>
        `;
        
        // 添加样式
        iosAlternative.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, rgba(0, 122, 255, 0.95) 0%, rgba(0, 82, 204, 0.95) 100%);
            color: white;
            padding: 32px;
            border-radius: 24px;
            backdrop-filter: blur(20px);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            z-index: 10004;
            max-width: 460px;
            width: 90%;
            border: 1px solid rgba(255, 255, 255, 0.25);
            animation: slideIn 0.3s ease;
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        // 添加按钮样式
        const style = document.createElement('style');
        style.textContent = `
            .browser-specific-info {
                background: rgba(255, 255, 255, 0.1);
                padding: 16px;
                border-radius: 12px;
                margin-bottom: 24px;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .browser-icon {
                font-size: 2rem;
                margin-bottom: 12px;
                color: rgba(255, 255, 255, 0.95);
            }
            
            .browser-specific-info h4 {
                font-size: 1.1rem;
                margin-bottom: 12px;
                color: white;
            }
            
            .browser-specific-info p {
                font-size: 0.9rem;
                margin-bottom: 16px;
                color: rgba(255, 255, 255, 0.9);
            }
            
            .browser-specific-info ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .browser-specific-info li {
                font-size: 0.85rem;
                color: rgba(255, 255, 255, 0.85);
                margin-bottom: 8px;
                padding-left: 20px;
                position: relative;
                line-height: 1.4;
            }
            
            .browser-specific-info li::before {
                content: '→';
                position: absolute;
                left: 0;
                color: rgba(0, 122, 255, 0.8);
                font-size: 0.9rem;
            }
            
            .ios-alternative-buttons {
                display: flex;
                gap: 16px;
                margin: 24px 0;
                flex-direction: column;
            }
            
            .ios-alt-files-btn {
                background: rgba(255, 255, 255, 0.15);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 12px;
                padding: 16px 20px;
                color: white;
                font-size: 0.95rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                min-width: 140px;
                align-self: center;
            }
            
            .ios-alt-files-btn:hover {
                background: rgba(255, 255, 255, 0.25);
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            }
            
            .ios-alt-files-btn i {
                font-size: 1.8rem;
            }
            
            .ios-alt-files-btn span {
                font-size: 0.9rem;
            }
            
            .ios-alternative-tips {
                font-size: 0.85rem;
                color: rgba(255, 255, 255, 0.9);
                text-align: center;
                margin-top: 20px;
                margin-bottom: 24px;
                line-height: 1.4;
                padding: 12px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px;
            }
            
            .ios-alternative-tips i {
                margin-right: 8px;
            }
            
            .ios-alternative-hints {
                background: rgba(255, 255, 255, 0.1);
                padding: 16px;
                border-radius: 12px;
                margin-top: 20px;
            }
            
            .ios-alternative-hints p {
                font-size: 0.9rem;
                font-weight: 500;
                margin-bottom: 12px;
                color: rgba(255, 255, 255, 0.95);
            }
            
            .ios-alternative-hints ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .ios-alternative-hints li {
                font-size: 0.85rem;
                color: rgba(255, 255, 255, 0.85);
                margin-bottom: 8px;
                padding-left: 20px;
                position: relative;
                line-height: 1.4;
            }
            
            .ios-alternative-hints li::before {
                content: '•';
                position: absolute;
                left: 0;
                color: rgba(0, 122, 255, 0.8);
                font-size: 1rem;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(iosAlternative);
        
        // 自动关闭
        const autoClose = setTimeout(() => {
            if (iosAlternative.parentNode) {
                iosAlternative.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    if (iosAlternative.parentNode) {
                        iosAlternative.remove();
                    }
                }, 300);
            }
        }, 60000);
        
        // 点击关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'ios-alt-close';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.style.cssText = `
            position: absolute;
            top: 16px;
            right: 16px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        closeBtn.onclick = () => {
            clearTimeout(autoClose);
            if (iosAlternative.parentNode) {
                iosAlternative.remove();
            }
        };
        iosAlternative.appendChild(closeBtn);
    }
    
    // iOS替代文件选择方法
    triggerIOSAlternative(mode = 'music') {
        console.log('iOS替代文件选择，模式:', mode);
        
        try {
            const fileInput = document.getElementById('audioFileInput');
            if (!fileInput) {
                this.showNotification('文件选择器未找到', 'error');
                return;
            }
            
            // 根据模式设置不同的accept属性
            const browser = this.detectBrowser();
            
            if (mode === 'chrome') {
                // Chrome特殊模式
                fileInput.setAttribute('accept', '.mp3,.m4a,.wav,.aac,.ogg,.flac');
                this.showIOSFileStatus('正在打开Chrome文件选择器...', 'loading');
                console.log('Chrome模式: 使用扩展名列表');
            } else if (mode === 'standard') {
                // 标准模式
                if (browser.isSafari) {
                    fileInput.setAttribute('accept', 'audio/*');
                    this.showIOSFileStatus('正在打开标准文件选择器(Safari)...', 'loading');
                    console.log('标准模式(Safari): 使用audio/*');
                } else {
                    fileInput.setAttribute('accept', '.mp3,.m4a,.wav,.aac,.ogg,.flac');
                    this.showIOSFileStatus('正在打开标准文件选择器...', 'loading');
                    console.log('标准模式(其他): 使用扩展名列表');
                }
            } else {
                // 默认模式
                fileInput.setAttribute('accept', '.mp3,.m4a,.wav,.aac,.ogg,.flac');
                this.showIOSFileStatus('正在打开文件管理器...', 'loading');
                console.log('默认模式: 使用扩展名列表');
            }
            
            // 移除capture属性，避免触发相机
            fileInput.removeAttribute('capture');
            
            // 确保multiple属性
            fileInput.setAttribute('multiple', '');
            
            // 显示文件选择状态
            this.showIOSFileStatus('正在打开文件管理器...', 'loading');
            
            // 使用最可靠的方式触发文件选择
            setTimeout(() => {
                try {
                    // 创建新的文件输入以避免状态问题
                    const newFileInput = document.createElement('input');
                    newFileInput.type = 'file';
                    newFileInput.id = 'audioFileInput';
                    newFileInput.className = 'audio-file-input';
                    // 设置accept属性
                    if (mode === 'chrome') {
                        newFileInput.setAttribute('accept', '.mp3,.m4a,.wav,.aac,.ogg,.flac');
                    } else if (mode === 'standard') {
                        if (browser.isSafari) {
                            newFileInput.setAttribute('accept', 'audio/*');
                        } else {
                            newFileInput.setAttribute('accept', '.mp3,.m4a,.wav,.aac,.ogg,.flac');
                        }
                    } else {
                        newFileInput.setAttribute('accept', '.mp3,.m4a,.wav,.aac,.ogg,.flac');
                    }
                    newFileInput.setAttribute('multiple', '');
                    newFileInput.style.display = 'none';
                    
                    // 重新绑定事件监听器
                    newFileInput.addEventListener('change', (e) => {
                        console.log('iOS替代文件输入变化事件 - 文件数量:', e.target.files.length);
                        console.log('选择的文件:', Array.from(e.target.files).map(f => ({ name: f.name, type: f.type, size: f.size })));
                        
                        this.handleFileSelect(e);
                        
                        // 移除状态指示器
                        setTimeout(() => {
                            const status = document.querySelector('.ios-file-status');
                            if (status) {
                                status.remove();
                            }
                        }, 1000);
                    });
                    
                    // 移除旧的文件输入
                    const oldFileInput = document.getElementById('audioFileInput');
                    if (oldFileInput && oldFileInput.parentNode) {
                        oldFileInput.parentNode.removeChild(oldFileInput);
                    }
                    
                    // 添加新的文件输入
                    document.body.appendChild(newFileInput);
                    
                    // 触发文件选择
                    newFileInput.click();
                    
                    console.log('iOS文件选择已触发');
                    
                } catch (error) {
                    console.error('iOS替代文件选择触发失败:', error);
                    this.handleIOSFileSelectionError(error, '文件选择触发');
                }
            }, 300);
            
            // 移除替代界面
            setTimeout(() => {
                const iosAlternative = document.querySelector('.ios-alternative-upload');
                if (iosAlternative) {
                    iosAlternative.remove();
                }
            }, 500);
            
        } catch (error) {
            console.error('iOS替代文件选择失败:', error);
            this.handleIOSFileSelectionError(error, '文件选择');
        }
    }
    
    // 显示iOS文件选择帮助
    showIOSFileSelectionHelp() {
        const help = document.createElement('div');
        help.className = 'ios-file-help';
        help.innerHTML = `
            <div class="help-content">
                <i class="fab fa-apple"></i>
                <div>
                    <h4>iOS 文件选择指南</h4>
                    <p><strong>方法一：</strong>使用下方"从音乐库选择"按钮</p>
                    <p><strong>方法二：</strong>使用"从文件选择"按钮</p>
                    <p><strong>方法三：</strong>将音频文件拖拽到指定区域</p>
                    <p style="margin-top: 12px; font-size: 0.8rem; opacity: 0.8;">
                        提示：iOS 13+ 版本支持更好的文件选择体验
                    </p>
                </div>
                <button class="help-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(help);
        
        // 自动移除
        setTimeout(() => {
            if (help.parentNode) {
                help.style.opacity = '0';
                setTimeout(() => {
                    if (help.parentNode) {
                        help.parentNode.removeChild(help);
                    }
                }, 300);
            }
        }, 15000);
    }
    
    // 显示移动端文件选择提示
    showMobileFileSelectionHint() {
        const hint = document.createElement('div');
        hint.className = 'mobile-file-hint';
        hint.innerHTML = `
            <div class="hint-content">
                <i class="fas fa-info-circle"></i>
                <div>
                    <h4>文件选择提示</h4>
                    <p>请选择您手机中的音频文件进行播放</p>
                    <p>支持格式：MP3、WAV、OGG、M4A</p>
                </div>
                <button class="hint-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(hint);
        
        // 自动移除提示
        setTimeout(() => {
            if (hint.parentNode) {
                hint.style.opacity = '0';
                setTimeout(() => {
                    if (hint.parentNode) {
                        hint.parentNode.removeChild(hint);
                    }
                }, 300);
            }
        }, 8000);
    }
}

// 添加脉冲动画的CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes pulseEffect {
        0% {
            width: 0;
            height: 0;
            opacity: 1;
        }
        100% {
            width: 200px;
            height: 200px;
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 页面加载完成后初始化广播系统
document.addEventListener('DOMContentLoaded', () => {
    window.broadcastSystem = new BroadcastSystem();
    
    // 添加触摸设备支持
    if ('ontouchstart' in window) {
        document.querySelectorAll('button, .broadcast-card').forEach(element => {
            element.addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.98)';
            });
            
            element.addEventListener('touchend', function() {
                this.style.transform = '';
            });
        });
    }
    
    // 控制台欢迎信息
    console.log('🎵 广播系统已加载完成');
    console.log('📱 支持键盘快捷键：');
    console.log('   空格键: 暂停/播放');
    console.log('   S键: 停止播放');
    console.log('   ↑/↓箭头: 调节音量');
});

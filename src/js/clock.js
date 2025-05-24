let wakeLock = null;
let isAlarmEnabled = false;
let isWorkTimeEnabled = false;
let isUiVisible = true;
let lastHour = new Date().getHours();
let hasPlayedEndSound = false;
let hasPlayedLunchSound = false;
let isTopPosition = false;
let timeShift = 0;
let isWakeLockEnabled = false;

const DB_NAME = 'clock-settings';
const DB_VERSION = 1;
const STORE_NAME = 'settings';

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

async function saveSettings() {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const settings = {
            isAlarmEnabled,
            isWorkTimeEnabled,
            isTopPosition,
            isWakeLockEnabled
        };

        await store.put(settings, 'clock-settings');
    } catch (error) {
        console.error('設定の保存に失敗しました:', error);
    }
}

async function loadSettings() {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const settings = await store.get('clock-settings');

        if (settings) {
            // 設定値を更新
            isAlarmEnabled = settings.isAlarmEnabled ?? false;
            isWorkTimeEnabled = settings.isWorkTimeEnabled ?? false;
            isTopPosition = settings.isTopPosition ?? false;
            isWakeLockEnabled = settings.isWakeLockEnabled ?? false;

            // UIの状態を更新
            await updateUIFromSettings();
        }
    } catch (error) {
        console.error('設定の読み込みに失敗しました:', error);
    }
}

async function updateUIFromSettings() {
    // アラーム設定の更新
    alarmBtn.classList.toggle('active', isAlarmEnabled);
    const alarmIcon = alarmBtn.querySelector('.material-icons');
    alarmIcon.textContent = isAlarmEnabled ? 'notifications_active' : 'notifications_off';

    // 勤務時間設定の更新
    workTimeBtn.classList.toggle('active', isWorkTimeEnabled);
    const workIcon = workTimeBtn.querySelector('.material-icons');
    workIcon.textContent = isWorkTimeEnabled ? 'work' : 'work_off';
    
    // プログレスバーの表示状態を更新
    if (isWorkTimeEnabled) {
        workProgressContainer.style.display = 'block';
        const now = new Date();
        const { progress, text } = calculateProgress(now);
        workProgress.style.width = `${progress}%`;
        workProgressText.textContent = text;
    } else {
        workProgressContainer.style.display = 'none';
    }

    // 画面位置設定の更新
    document.body.classList.toggle('top-position', isTopPosition);
    positionToggleBtn.classList.toggle('active', isTopPosition);
    const positionIcon = positionToggleBtn.querySelector('.material-icons');
    positionIcon.textContent = isTopPosition ? 'vertical_align_bottom' : 'vertical_align_top';

    // WakeLock設定の更新
    wakeLockBtn.classList.toggle('active', isWakeLockEnabled);
    const wakeLockIcon = wakeLockBtn.querySelector('.material-icons');
    wakeLockIcon.textContent = isWakeLockEnabled ? 'power_off' : 'power_settings_new';

    // WakeLockの復元
    if (isWakeLockEnabled) {
        try {
            await requestWakeLock();
        } catch (error) {
            console.error('WakeLockの復元に失敗しました:', error);
            isWakeLockEnabled = false;
            wakeLockBtn.classList.remove('active');
            wakeLockBtn.querySelector('.material-icons').textContent = 'power_settings_new';
            await saveSettings();
        }
    }
}

const alarmSound = document.getElementById('alarmSound');
const endSound = document.getElementById('endSound');
const lunchSound = document.getElementById('lunchSound');

[alarmSound, endSound, lunchSound].forEach(sound => {
    sound.load();
    sound.preload = 'auto';
});

const previewButtons = document.querySelectorAll('.preview-btn');
previewButtons.forEach(button => {
    button.addEventListener('click', () => {
        const soundId = button.getAttribute('data-sound');
        const sound = document.getElementById(soundId);
        
        [alarmSound, endSound, lunchSound].forEach(s => {
            s.pause();
            s.currentTime = 0;
        });
        
        previewButtons.forEach(btn => {
            btn.querySelector('.material-icons').textContent = 'play_circle';
        });
        
        if (sound.paused) {
            sound.play();
            button.querySelector('.material-icons').textContent = 'stop_circle';
            
            sound.onended = () => {
                button.querySelector('.material-icons').textContent = 'play_circle';
            };
        } else {
            sound.pause();
            sound.currentTime = 0;
            button.querySelector('.material-icons').textContent = 'play_circle';
        }
    });
});

const WORK_START_HOUR = 7;
const WORK_END_HOUR = 17;
const LUNCH_HOUR = 12;

const workTimeBtn = document.getElementById('workTimeBtn');
const workProgressContainer = document.getElementById('workProgressContainer');
const workProgress = document.getElementById('workProgress');
const workProgressText = document.getElementById('workProgressText');

        
workTimeBtn.addEventListener('click', () => {
    isWorkTimeEnabled = !isWorkTimeEnabled;
    workTimeBtn.classList.toggle('active');
    const icon = workTimeBtn.querySelector('.material-icons');
    icon.textContent = isWorkTimeEnabled ? 'work' : 'work_off';
    workProgressContainer.style.display = isWorkTimeEnabled ? 'block' : 'none';
    hasPlayedEndSound = false;
    saveSettings();
});

function resetDailyFlags() {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        hasPlayedEndSound = false;
        hasPlayedLunchSound = false;
    }
}

const timeShiftButtons = document.querySelectorAll('.time-shift-btn');
timeShiftButtons.forEach(button => {
    button.addEventListener('click', () => {
        const shift = parseInt(button.getAttribute('data-shift'));
        timeShift += shift;
        if (timeShift < -60) timeShift = -60;
        if (timeShift > 60) timeShift = 60;
    });
});

function calculateProgress(now) {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();

    const totalMinutes = currentHour * 60 + currentMinute + timeShift;
    const adjustedHour = Math.floor(totalMinutes / 60);
    const adjustedMinute = totalMinutes % 60;
    
    const adjustedDate = new Date(now);
    adjustedDate.setHours(adjustedHour, adjustedMinute, currentSecond);

    if (adjustedHour < WORK_START_HOUR) {
        const totalSecondsUntilStart = (WORK_START_HOUR * 3600) - (adjustedHour * 3600 + adjustedMinute * 60 + currentSecond);
        const totalSecondsInPreWork = WORK_START_HOUR * 3600;
        const progress = Math.max(0, 100 - (totalSecondsUntilStart / totalSecondsInPreWork * 100));
        return {
            progress,
            text: `勤務開始まで ${Math.floor(totalSecondsUntilStart / 3600)}時間${Math.floor((totalSecondsUntilStart % 3600) / 60)}分 (${Math.round(progress)}%)`
        };
    }
    
    if (adjustedHour < WORK_END_HOUR) {
        const totalSecondsWorked = (adjustedHour - WORK_START_HOUR) * 3600 + adjustedMinute * 60 + currentSecond;
        const totalWorkSeconds = (WORK_END_HOUR - WORK_START_HOUR) * 3600;
        const progress = Math.min(100, (totalSecondsWorked / totalWorkSeconds) * 100);
        const remainingSeconds = totalWorkSeconds - totalSecondsWorked;
        return {
            progress,
            text: `残り ${Math.floor(remainingSeconds / 3600)}時間${Math.floor((remainingSeconds % 3600) / 60)}分 (${Math.round(progress)}%)`
        };
    }

    return {
        progress: 100,
        text: '勤務時間終了 (100%)'
    };
}

const alarmBtn = document.getElementById('alarmBtn');
alarmBtn.addEventListener('click', () => {
    isAlarmEnabled = !isAlarmEnabled;
    alarmBtn.classList.toggle('active');
    const icon = alarmBtn.querySelector('.material-icons');
    icon.textContent = isAlarmEnabled ? 'notifications_active' : 'notifications_off';
    saveSettings();
});

const wakeLockBtn = document.getElementById('wakeLockBtn');
wakeLockBtn.addEventListener('click', async () => {
    if (isWakeLockEnabled) {
        releaseWakeLock();
        isWakeLockEnabled = false;
        wakeLockBtn.classList.remove('active');
        wakeLockBtn.querySelector('.material-icons').textContent = 'power_settings_new';
    } else {
        try {
            await requestWakeLock();
            isWakeLockEnabled = true;
            wakeLockBtn.classList.add('active');
            wakeLockBtn.querySelector('.material-icons').textContent = 'power_off';
        } catch (error) {
            console.error('WakeLockの取得に失敗しました:', error);
        }
    }
    saveSettings();
});

async function requestWakeLock() {
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
            console.log('Wake Lock was released');
            isWakeLockEnabled = false;
            wakeLockBtn.classList.remove('active');
            wakeLockBtn.querySelector('.material-icons').textContent = 'power_settings_new';
            saveSettings();
        });
        console.log('Wake Lock is active');
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
        throw err;
    }
}

function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
    }
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        requestWakeLock();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            releaseWakeLock();
        }
    }
}

document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);

document.addEventListener('fullscreenchange', () => {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const icon = fullscreenBtn.querySelector('.material-icons');
    if (document.fullscreenElement) {
        icon.textContent = 'fullscreen_exit';
    } else {
        icon.textContent = 'fullscreen';
    }
});

const uiToggleBtn = document.getElementById('uiToggleBtn');
uiToggleBtn.addEventListener('click', () => {
    isUiVisible = !isUiVisible;
    document.body.classList.toggle('hide-ui', !isUiVisible);
    uiToggleBtn.classList.toggle('active', !isUiVisible);
    const icon = uiToggleBtn.querySelector('.material-icons');
    icon.textContent = isUiVisible ? 'visibility' : 'visibility_off';
});

const positionToggleBtn = document.getElementById('positionToggleBtn');
positionToggleBtn.addEventListener('click', () => {
    isTopPosition = !isTopPosition;
    document.body.classList.toggle('top-position', isTopPosition);
    positionToggleBtn.classList.toggle('active', isTopPosition);
    const icon = positionToggleBtn.querySelector('.material-icons');
    icon.textContent = isTopPosition ? 'vertical_align_bottom' : 'vertical_align_top';
    saveSettings();
});

function updateClock() {
    const now = new Date();
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('time').textContent = `${hours}:${minutes}:${seconds}`;
    
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[now.getDay()];
    document.getElementById('date').textContent = `${year}年${month}月${day}日(${weekday})`;

    const currentHour = now.getHours();
    if (isAlarmEnabled && currentHour !== lastHour && now.getMinutes() === 0) {
        alarmSound.play();
        lastHour = currentHour;
    }

    if (currentHour === LUNCH_HOUR && now.getMinutes() === 0 && !hasPlayedLunchSound) {
        lunchSound.play();
        hasPlayedLunchSound = true;
    }

    if (isWorkTimeEnabled) {
        const { progress, text } = calculateProgress(now);
        workProgress.style.width = `${progress}%`;
        workProgressText.textContent = text;

        const totalMinutes = currentHour * 60 + now.getMinutes() + timeShift;
        const adjustedHour = Math.floor(totalMinutes / 60);
        const adjustedMinute = totalMinutes % 60;

        if (adjustedHour === WORK_END_HOUR && adjustedMinute === 0 && !hasPlayedEndSound) {
            endSound.play();
            hasPlayedEndSound = true;
        }
    }

    resetDailyFlags();
}

// 初期化処理
async function initialize() {
    await loadSettings();
    updateClock();
    setInterval(updateClock, 1000);
}

// 初期化を実行
initialize();

const cacheUpdateBtn = document.getElementById('cacheUpdateBtn');
if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
    cacheUpdateBtn.addEventListener('click', async () => {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    cacheUpdateBtn.classList.add('active');
                    await registration.update();
                    await caches.delete('clock-cache-v1');
                    window.location.reload();
                }
            } catch (error) {
                console.error('キャッシュの更新に失敗しました:', error);
            }
        }
    });
} 
let wakeLock = null;
let isAlarmEnabled = false;
let isWorkTimeEnabled = false;
let isUiVisible = true;
let lastHour = new Date().getHours();
let hasPlayedEndSound = false;
let hasPlayedLunchSound = false;
let isTopPosition = false;

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
});

function resetDailyFlags() {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        hasPlayedEndSound = false;
        hasPlayedLunchSound = false;
    }
}

function calculateProgress(now) {
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();

    if (currentHour < WORK_START_HOUR) {
        const totalSecondsUntilStart = (WORK_START_HOUR * 3600) - (currentHour * 3600 + currentMinute * 60 + currentSecond);
        const totalSecondsInPreWork = WORK_START_HOUR * 3600;
        const progress = 100 - (totalSecondsUntilStart / totalSecondsInPreWork * 100);
        return {
            progress,
            text: `勤務開始まで ${Math.floor(totalSecondsUntilStart / 3600)}時間${Math.floor((totalSecondsUntilStart % 3600) / 60)}分 (${Math.round(progress)}%)`
        };
    }
    
    if (currentHour < WORK_END_HOUR) {
        const totalSecondsWorked = (currentHour - WORK_START_HOUR) * 3600 + currentMinute * 60 + currentSecond;
        const totalWorkSeconds = (WORK_END_HOUR - WORK_START_HOUR) * 3600;
        const progress = (totalSecondsWorked / totalWorkSeconds) * 100;
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
});

async function requestWakeLock() {
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
            console.log('Wake Lock was released');
        });
        console.log('Wake Lock is active');
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
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

        if (currentHour === WORK_END_HOUR && now.getMinutes() === 0 && !hasPlayedEndSound) {
            endSound.play();
            hasPlayedEndSound = true;
        }
    }

    resetDailyFlags();
}

updateClock();
setInterval(updateClock, 1000); 
let wakeLock = null;
let isAlarmEnabled = false;
let isWorkTimeEnabled = false;
let isUiVisible = true;
let lastHour = new Date().getHours();
let lastMinute = new Date().getMinutes();
let hasPlayedEndSound = false;
let hasPlayedLunchSound = false;
let isTopPosition = false;
let timeShift = 0;

// 特定のアラーム時刻を設定 (例: 10時30分)
let alarmTargetHour = 10;
let alarmTargetMinute = 30;
let hasPlayedAlarmForMinute = false;

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
const WORK_START_MINUTE = 0;
const WORK_END_HOUR = 17;
const WORK_END_MINUTE = 0;
const LUNCH_HOUR = 12;
const LUNCH_MINUTE = 0;

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
  hasPlayedLunchSound = false;
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

  let totalMinutes = currentHour * 60 + currentMinute + timeShift;
  let adjustedHour = Math.floor(totalMinutes / 60);
  let adjustedMinute = totalMinutes % 60;

  if (adjustedMinute < 0) {
    adjustedHour -= 1;
    adjustedMinute += 60;
  }

  const adjustedDate = new Date(now);

  const currentTotalSeconds = adjustedHour * 3600 + adjustedMinute * 60 + currentSecond;
  const workStartTotalSeconds = WORK_START_HOUR * 3600 + WORK_START_MINUTE * 60;
  const workEndTotalSeconds = WORK_END_HOUR * 3600 + WORK_END_MINUTE * 60;

  if (currentTotalSeconds < workStartTotalSeconds) {
    const totalSecondsUntilStart = workStartTotalSeconds - currentTotalSeconds;
    const progress = (currentTotalSeconds / workStartTotalSeconds) * 100;
    return {
      progress,
      text: `勤務開始まで ${Math.floor(totalSecondsUntilStart / 3600)}時間${Math.floor(
        (totalSecondsUntilStart % 3600) / 60
      )}分 (${Math.round(progress)}%)`,
    };
  }

  if (currentTotalSeconds < workEndTotalSeconds) {
    const totalSecondsWorked = currentTotalSeconds - workStartTotalSeconds;
    const totalWorkSeconds = workEndTotalSeconds - workStartTotalSeconds;
    const progress = (totalSecondsWorked / totalWorkSeconds) * 100;
    const remainingSeconds = totalWorkSeconds - totalSecondsWorked;
    return {
      progress,
      text: `残り ${Math.floor(remainingSeconds / 3600)}時間${Math.floor(
        (remainingSeconds % 3600) / 60
      )}分 (${Math.round(progress)}%)`,
    };
  }

  return {
    progress: 100,
    text: '勤務時間終了 (100%)',
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
  saveSettings();
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
  const currentMinute = now.getMinutes();

  let totalMinutes = currentHour * 60 + currentMinute + timeShift;
  let adjustedHour = Math.floor(totalMinutes / 60);
  let adjustedMinute = totalMinutes % 60;

  if (adjustedMinute < 0) {
    adjustedHour -= 1;
    adjustedMinute += 60;
  }

  // 分が変わったらアラーム再生フラグをリセット
  if (currentMinute !== lastMinute) {
    hasPlayedAlarmForMinute = false;
  }

  // アラームが有効で、設定時刻になり、かつその分でまだ再生していない場合
  if (
    isAlarmEnabled &&
    currentHour === alarmTargetHour &&
    currentMinute === alarmTargetMinute &&
    !hasPlayedAlarmForMinute
  ) {
    alarmSound.play();
    hasPlayedAlarmForMinute = true; // この分では再生済みとする
  }

  if (currentHour === LUNCH_HOUR && currentMinute === LUNCH_MINUTE && !hasPlayedLunchSound) {
    lunchSound.play();
    hasPlayedLunchSound = true;
  }

  if (isWorkTimeEnabled) {
    const { progress, text } = calculateProgress(now);
    workProgress.style.width = `${progress}%`;
    workProgressText.textContent = text;

    if (
      currentHour === WORK_END_HOUR &&
      currentMinute === WORK_END_MINUTE &&
      !hasPlayedEndSound
    ) {
      endSound.play();
      hasPlayedEndSound = true;
    }
  }

  lastHour = adjustedHour;
  lastMinute = adjustedMinute;

  resetDailyFlags();
}

updateClock();
setInterval(updateClock, 1000);

// 時間のずらし機能
document.addEventListener('keydown', e => {
  if (e.ctrlKey) {
    if (e.key === 'ArrowUp') {
      timeShift += 30;
    } else if (e.key === 'ArrowDown') {
      timeShift -= 30;
    }
    if (timeShift < -60) timeShift = -60;
    if (timeShift > 60) timeShift = 60;

    updateClock();
  }
});

// 設定を保存する関数
function saveSettings() {
  const settings = {
    isAlarmEnabled: isAlarmEnabled,
    alarmTargetHour: alarmTargetHour,
    alarmTargetMinute: alarmTargetMinute,
    isWorkTimeEnabled: isWorkTimeEnabled,
    isUiVisible: isUiVisible,
    isTopPosition: isTopPosition,
  };
  localStorage.setItem('clockSettings', JSON.stringify(settings));
  console.log('設定を保存しました');
}

// 設定を読み込む関数
function loadSettings() {
  const savedSettings = localStorage.getItem('clockSettings');
  if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    isAlarmEnabled = settings.isAlarmEnabled;
    alarmTargetHour = settings.alarmTargetHour;
    alarmTargetMinute = settings.alarmTargetMinute;
    isWorkTimeEnabled = settings.isWorkTimeEnabled;
    isUiVisible = settings.isUiVisible;
    isTopPosition = settings.isTopPosition;
    console.log('設定を読み込みました');
    // 読み込んだ設定をUIに適用する関数を呼び出す必要あり
    applySettings();
  } else {
    console.log('保存された設定はありません');
  }
}

// 読み込んだ設定をUIに適用する関数 (新規追加)
function applySettings() {
  // アラーム設定の適用
  const alarmBtn = document.getElementById('alarmBtn');
  if (alarmBtn) {
    alarmBtn.classList.toggle('active', isAlarmEnabled);
    const icon = alarmBtn.querySelector('.material-icons');
    if (icon) icon.textContent = isAlarmEnabled ? 'notifications_active' : 'notifications_off';
  }

  // 勤務時間設定の適用
  const workTimeBtn = document.getElementById('workTimeBtn');
  const workProgressContainer = document.getElementById('workProgressContainer');
  if (workTimeBtn) {
    workTimeBtn.classList.toggle('active', isWorkTimeEnabled);
    const icon = workTimeBtn.querySelector('.material-icons');
    if (icon) icon.textContent = isWorkTimeEnabled ? 'work' : 'work_off';
    if (workProgressContainer)
      workProgressContainer.style.display = isWorkTimeEnabled ? 'block' : 'none';
  }

  // UI表示設定の適用
  const uiToggleBtn = document.getElementById('uiToggleBtn');
  if (uiToggleBtn) {
    document.body.classList.toggle('hide-ui', !isUiVisible);
    uiToggleBtn.classList.toggle('active', !isUiVisible);
    const icon = uiToggleBtn.querySelector('.material-icons');
    if (icon) icon.textContent = isUiVisible ? 'visibility' : 'visibility_off';
  }

  // 位置設定の適用
  const positionToggleBtn = document.getElementById('positionToggleBtn');
  if (positionToggleBtn) {
    document.body.classList.toggle('top-position', isTopPosition);
    positionToggleBtn.classList.toggle('active', isTopPosition);
    const icon = positionToggleBtn.querySelector('.material-icons');
    if (icon) icon.textContent = isTopPosition ? 'vertical_align_bottom' : 'vertical_align_top';
  }

  // TODO: アラーム時刻の表示を更新する必要があればここに追加
}

// 初期化時に設定を読み込む
loadSettings();

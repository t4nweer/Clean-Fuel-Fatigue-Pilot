// -----------------------------
// GLOBAL STATE
// -----------------------------

// Calibration state
let isCalibrating = false;
let calibrationEvents = [];
let calibrationStartTime = 0;
let calibrationTimer = null;

let calibrationMetrics = {
    samplingRateHz: null,
    meanDtMs: null,
    jitterMs: null,
    durationMs: null,
    eventCount: 0,
    calibrationFactor: null
};

// PVG test state
let reactionTimes = [];
let testRunning = false;
let stimulusShown = false;
let stimulusTime = 0;
let testStartTime = 0;
const testDuration = 120000; // 2 minutes

let testStartDateString = "";
let testStartClock = "";
let testEndClock = "";

// -----------------------------
// ELEMENTS
// -----------------------------

const startCalibrationBtn = document.getElementById("startCalibrationBtn");
const calibrationArea = document.getElementById("calibrationArea");
const calibrationSection = document.getElementById("calibrationSection");
const calibrationSummary = document.getElementById("calibrationSummary");

const sliderTrack = document.getElementById("sliderTrack");
const sliderHandle = document.getElementById("sliderHandle");

const inputsSection = document.getElementById("inputsSection");
const startTestBtn = document.getElementById("startTestBtn");

const testSection = document.getElementById("testSection");
const stimulus = document.getElementById("stimulus");

const resultsSection = document.getElementById("resultsSection");
const resultText = document.getElementById("resultText");
const shareBtn = document.getElementById("shareBtn");

// Inputs
const usernameInput = document.getElementById("username");
const dutyStartInput = document.getElementById("dutyStart");
const fatigueDaySelect = document.getElementById("fatigueDay");
const shiftTypeSelect = document.getElementById("shiftType");
const caffeineSinceSelect = document.getElementById("caffeineSince");
const nicotineSinceSelect = document.getElementById("nicotineSince");

// -----------------------------
// CALIBRATION LOGIC
// -----------------------------

startCalibrationBtn.addEventListener("click", () => {
    startCalibration();
});

function startCalibration() {
    // Hide start button
    startCalibrationBtn.classList.add("hidden");

    // Show slider area
    calibrationArea.classList.remove("hidden");

    // Reset state
    calibrationEvents = [];
    calibrationSummary.classList.add("hidden");
    calibrationSummary.textContent = "";
    isCalibrating = false;

    // Scroll slider into view on mobile
    sliderTrack.scrollIntoView({ behavior: "smooth", block: "center" });

    alert("Touch the green circle and slide smoothly to the right for 5 seconds.");
}

function beginCalibrationTracking() {
    if (isCalibrating) return;

    isCalibrating = true;
    calibrationEvents = [];
    calibrationStartTime = performance.now();

    calibrationTimer = setTimeout(() => {
        endCalibration();
    }, 5000);
}

function recordCalibrationEvent(clientX) {
    if (!isCalibrating) return;

    const t = performance.now();
    calibrationEvents.push({ t, x: clientX });

    // Move handle visually
    const rect = sliderTrack.getBoundingClientRect();
    let relX = clientX - rect.left;
    if (relX < 4) relX = 4;
    if (relX > rect.width - 36) relX = rect.width - 36;
    sliderHandle.style.left = relX + "px";
}

function endCalibration() {
    if (!isCalibrating) return;

    isCalibrating = false;
    if (calibrationTimer) {
        clearTimeout(calibrationTimer);
        calibrationTimer = null;
    }

    if (calibrationEvents.length < 3) {
        calibrationSummary.classList.remove("hidden");
        calibrationSummary.textContent = "Calibration failed: not enough movement detected. Please try again.";
        return;
    }

    const times = calibrationEvents.map(e => e.t);
    const dts = [];
    for (let i = 1; i < times.length; i++) {
        dts.push(times[i] - times[i - 1]);
    }

    const meanDt = avg(dts);
    const jitter = stdDev(dts);
    const duration = times[times.length - 1] - times[0];
    const samplingRate = 1000 / meanDt;
    const factor = (meanDt + jitter) / samplingRate;

    calibrationMetrics = {
        samplingRateHz: samplingRate,
        meanDtMs: meanDt,
        jitterMs: jitter,
        durationMs: duration,
        eventCount: calibrationEvents.length,
        calibrationFactor: factor
    };

    const summaryText =
`Calibration complete:

Events: ${calibrationMetrics.eventCount}
Duration: ${calibrationMetrics.durationMs.toFixed(1)} ms
Sampling rate: ${calibrationMetrics.samplingRateHz.toFixed(1)} Hz
Mean interval: ${calibrationMetrics.meanDtMs.toFixed(1)} ms
Jitter (SD): ${calibrationMetrics.jitterMs.toFixed(1)} ms
Calibration factor: ${calibrationMetrics.calibrationFactor.toFixed(4)}`;

    calibrationSummary.textContent = summaryText;
    calibrationSummary.classList.remove("hidden");

    // Auto-advance after 1.5 seconds
    setTimeout(() => {
        calibrationSection.classList.add("hidden");
        inputsSection.classList.remove("hidden");
    }, 1500);
}

// -----------------------------
// TOUCH / POINTER HANDLERS
// -----------------------------

function onPointerDown(e) {
    e.preventDefault();
    beginCalibrationTracking();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    recordCalibrationEvent(clientX);

    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchend", onPointerUp);
}

function onPointerMove(e) {
    if (!isCalibrating) return;
    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    recordCalibrationEvent(clientX);
}

function onPointerUp(e) {
    e.preventDefault();

    window.removeEventListener("mousemove", onPointerMove);
    window.removeEventListener("touchmove", onPointerMove);
    window.removeEventListener("mouseup", onPointerUp);
    window.removeEventListener("touchend", onPointerUp);
}

// Attach listeners
sliderTrack.addEventListener("mousedown", onPointerDown);
sliderTrack.addEventListener("touchstart", onPointerDown, { passive: false });
sliderHandle.addEventListener("touchstart", onPointerDown, { passive: false });

// -----------------------------
// PVG TEST LOGIC
// -----------------------------

startTestBtn.addEventListener("click", () => {
    startTest();
});

function startTest() {
    const name = usernameInput.value.trim();
    if (!name) {
        alert("Please enter your name or ID.");
        return;
    }

    const now = new Date();
    testStartDateString = now.toLocaleDateString();
    testStartClock = now.toLocaleTimeString();

    reactionTimes = [];
    testRunning = true;
    stimulusShown = false;

    inputsSection.classList.add("hidden");
    testSection.classList.remove("hidden");

    testStartTime = performance.now();
    scheduleStimulus();
}

function scheduleStimulus() {
    if (!testRunning) return;

    const delay = Math.random() * 5000 + 2000;
    stimulus.classList.remove("green");
    stimulus.innerText = "Wait…";
    stimulusShown = false;

    setTimeout(() => {
        if (!testRunning) return;
        stimulus.classList.add("green");
        stimulus.innerText = "TAP!";
        stimulusShown = true;
        stimulusTime = performance.now();
    }, delay);
}

stimulus.addEventListener("click", () => handleStimulusTap());
stimulus.addEventListener("touchstart", (e) => {
    e.preventDefault();
    handleStimulusTap();
}, { passive: false });

function handleStimulusTap() {
    if (!testRunning) return;

    if (stimulusShown) {
        const rt = performance.now() - stimulusTime;
        reactionTimes.push(rt);
        stimulusShown = false;
        stimulus.classList.remove("green");
        stimulus.innerText = "Recorded";
    }

    if (performance.now() - testStartTime >= testDuration) {
        endTest();
    } else {
        scheduleStimulus();
    }
}

function endTest() {
    testRunning = false;
    testSection.classList.add("hidden");
    resultsSection.classList.remove("hidden");

    const endNow = new Date();
    testEndClock = endNow.toLocaleTimeString();

    const name = usernameInput.value.trim();
    const dutyStart = dutyStartInput.value || "Not set";
    const fatigueDay = fatigueDaySelect.value;
    const shiftType = shiftTypeSelect.value;
    const caffeineSince = caffeineSinceSelect.value;
    const nicotineSince = nicotineSinceSelect.value;

    let mean = reactionTimes.length ? avg(reactionTimes) : 0;
    let median = reactionTimes.length ? med(reactionTimes) : 0;
    let lapses = reactionTimes.filter(rt => rt > 500).length;

    const tapList = reactionTimes
        .map((rt, i) => `${i + 1}: ${rt.toFixed(1)} ms`)
        .join("\n");

    const device = navigator.userAgent;
    const screenInfo = `${window.screen.width}x${window.screen.height} DPR:${window.devicePixelRatio}`;

    const summary =
`Clean Fuel T&I Fatigue Pilot

Date: ${testStartDateString}
Start Time: ${testStartClock}
End Time: ${testEndClock}

Name / ID: ${name}
Continuous duty start: ${dutyStart}
Time since fatigue day: ${fatigueDay}
Shift type: ${shiftType}
Time since last caffeine: ${caffeineSince}
Time since last nicotine: ${nicotineSince}

Calibration (this session):
Events: ${calibrationMetrics.eventCount}
Duration: ${calibrationMetrics.durationMs.toFixed(1)} ms
Sampling rate: ${calibrationMetrics.samplingRateHz.toFixed(1)} Hz
Mean interval: ${calibrationMetrics.meanDtMs.toFixed(1)} ms
Jitter (SD): ${calibrationMetrics.jitterMs.toFixed(1)} ms
Calibration factor: ${calibrationMetrics.calibrationFactor.toFixed(4)}

PVG Test:
Trials: ${reactionTimes.length}
Mean RT: ${mean.toFixed(1)} ms
Median RT: ${median.toFixed(1)} ms
Lapses (>500 ms): ${lapses}

Tap Responses (ms):
${tapList}

Device: ${device}
Screen: ${screenInfo}`;

    resultText.innerText = summary;

    shareBtn.onclick = () => {
        const encoded = encodeURIComponent(summary);
        window.location.href = `https://wa.me/?text=${encoded}`;
    };
}

// -----------------------------
// HELPERS
// -----------------------------

function avg(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function med(arr) {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(arr) {
    if (arr.length < 2) return 0;
    const mean = avg(arr);
    const variance = avg(arr.map(x => (x - mean) ** 2));
    return Math.sqrt(variance);
}

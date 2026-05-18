let reactionTimes = [];
let testRunning = false;
let stimulusShown = false;
let stimulusTime = 0;
let testStartTime = 0;
const testDuration = 120000; // 2 minutes

const startBtn = document.getElementById("startBtn");
const testArea = document.getElementById("testArea");
const stimulus = document.getElementById("stimulus");
const resultsDiv = document.getElementById("results");
const resultText = document.getElementById("resultText");
const shareBtn = document.getElementById("shareBtn");

startBtn.onclick = startTest;

function startTest() {
    const name = document.getElementById("username").value.trim();
    if (!name) {
        alert("Please enter your name or ID");
        return;
    }

    document.getElementById("instructions").classList.add("hidden");
    testArea.classList.remove("hidden");

    testRunning = true;
    testStartTime = performance.now();

    scheduleStimulus();
}

function scheduleStimulus() {
    if (!testRunning) return;

    const delay = Math.random() * 5000 + 2000; // 2–7 seconds
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

stimulus.onclick = () => {
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
};

function endTest() {
    testRunning = false;
    testArea.classList.add("hidden");
    resultsDiv.classList.remove("hidden");

    const name = document.getElementById("username").value.trim();
    const mean = avg(reactionTimes).toFixed(1);
    const median = med(reactionTimes).toFixed(1);
    const lapses = reactionTimes.filter(rt => rt > 500).length;

    const device = navigator.userAgent;
    const screenInfo = `${window.screen.width}x${window.screen.height} DPR:${window.devicePixelRatio}`;

    const summary =
`PVG Test Results
Name: ${name}
Trials: ${reactionTimes.length}
Mean RT: ${mean} ms
Median RT: ${median} ms
Lapses (>500 ms): ${lapses}

Device: ${device}
Screen: ${screenInfo}`;

    resultText.innerText = summary;

    shareBtn.onclick = () => {
        const encoded = encodeURIComponent(summary);
        window.location.href = `https://wa.me/?text=${encoded}`;
    };
}

function avg(arr) {
    return arr.reduce((a,b)=>a+b,0) / arr.length;
}

function med(arr) {
    const sorted = [...arr].sort((a,b)=>a-b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

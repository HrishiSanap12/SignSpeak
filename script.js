// script.js

const video = document.getElementById("webcam");
const predictionEl = document.getElementById("prediction");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
let isPredicting = false;
let camera = null;
let hands;

// -----------------------------
// 🌐 Hand Tracking
// -----------------------------
startBtn.addEventListener("click", async () => {
  statusEl.innerText = "Starting camera...";
  await initCamera();
  initHandTracking();
}); 

async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    statusEl.innerText = "Camera Ready";
  } catch (err) {
    console.error("Camera error:", err);
    statusEl.innerText = "Camera Error";
  }
}

function initHandTracking() {
  hands = new Hands({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5,
  });

  hands.onResults(onResults);

  // Assign Camera instance to global variable
  camera = new Camera(video, {
    onFrame: async () => {
      await hands.send({ image: video });
    },
    width: 640,
    height: 480,
  });

  camera.start();
  statusEl.innerText = "Tracking Started";
}

async function onResults(results) {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    if (!isPredicting) {
      isPredicting = true;

      const landmarks = results.multiHandLandmarks[0]
        .map((lm) => [lm.x, lm.y, lm.z])
        .flat();

      // Add a 1-second delay before sending the prediction
      setTimeout(() => {
        sendLandmarks(landmarks).finally(() => {
          isPredicting = false;
        });
      }, 2000); // 1000 ms = 1 second
    }
  } else {
    predictionEl.innerText = "-";
    statusEl.innerText = "No Hand Detected";

    // ✅ Stop speaking if no hand
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }

    // Reset prediction flag since hand is no longer visible
    isPredicting = false;
  }
}

async function sendLandmarks(landmarks) {
  try {
    const res = await fetch("http://127.0.0.1:5000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ landmarks }),
    });

    const data = await res.json();

    if (data.prediction) {
      predictionEl.innerText = data.prediction;
      statusEl.innerText = "Prediction Updated";

      // ✅ Speak the predicted sign
      speakPrediction(data.prediction);
    } else {
      predictionEl.innerText = "-";
      statusEl.innerText = "Prediction Error";
    }
  } catch (err) {
    console.error("Prediction error:", err);
    statusEl.innerText = "Server Error";
  }
}

// -----------------------------
// 🌐 Speech-to-Sign Translator
// -----------------------------
const speechBtn = document.getElementById("speechBtn");
const speechText = document.getElementById("speechText");
const signDisplay = document.getElementById("signDisplay");

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = "en-IN"; // or "en-US"
  recognition.continuous = false;
  recognition.interimResults = false;

  speechBtn.addEventListener("click", () => {
    recognition.start();
    speechText.innerText = "🎙️ Listening...";
    signDisplay.innerHTML = "";
  });

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase();
    speechText.innerText = "You said: " + transcript;
    showSigns(transcript);
  };

  recognition.onerror = (event) => {
    speechText.innerText = "❌ Error: " + event.error;
  };
} else {
  speechText.innerText =
    "Speech Recognition not supported in this browser.";
}

// Display hand sign images for each recognized letter and speak them
function showSigns(text) {
  signDisplay.innerHTML = ""; // clear previous signs
  const letters = text.replace(/[^a-z]/g, "").split("");

  letters.forEach((letter) => {
    const img = document.createElement("img");
    img.src = `signs/${letter}.png`; // Ensure /signs folder has a-z images
    img.alt = letter;
    signDisplay.appendChild(img);

    // ✅ Speak each letter
    speakPrediction(letter);
  });
}

// -----------------------------
// 🌐 Speak Predicted Sign
// -----------------------------
function speakPrediction(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  } else {
    console.warn("Text-to-Speech not supported in this browser.");
  }
}

// -----------------------------
// 🌐 Stop Camera
// -----------------------------
stopBtn.addEventListener("click", async () => {
  // Stop MediaPipe camera
  if (camera) {
    await camera.stop();   
    camera = null;
  }

  // Stop hand tracking model
  if (hands) {
    hands.close();   
    hands = null;
  }

  // Stop all video tracks
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }

  // Update UI
  statusEl.innerText = "Camera Stopped";
  predictionEl.innerText = "-";
});

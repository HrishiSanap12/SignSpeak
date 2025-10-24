from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import numpy as np
import joblib
from tensorflow.keras.models import load_model
import os, csv, traceback

# ------------------------------
# Flask + SocketIO setup
# ------------------------------
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

# ------------------------------
# Load ML model and preprocessors
# ------------------------------
MODEL_PATH = r"C:\Users\Hrishikesh Sanap\OneDrive\Desktop\isl sign language\Newprojectwebsite\landmark_mlp.h5"
SCALER_PATH = r"C:\Users\Hrishikesh Sanap\OneDrive\Desktop\isl sign language\Newprojectwebsite\landmark_scaler.pkl"
ENCODER_PATH = r"C:\Users\Hrishikesh Sanap\OneDrive\Desktop\isl sign language\Newprojectwebsite\label_encoder.pkl"

model = load_model(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)
le = joblib.load(ENCODER_PATH)

DATASET_DIR = "dataset"
os.makedirs(DATASET_DIR, exist_ok=True)

# ------------------------------
# Utility functions
# ------------------------------
def normalize_landmarks(coords):
    """Normalize landmarks to make model invariant to hand size and position."""
    coords = np.array(coords).reshape(-1, 3)
    wrist = coords[0, :2]
    coords[:, :2] -= wrist
    xs, ys = coords[:, 0], coords[:, 1]
    s = max(xs.max() - xs.min(), ys.max() - ys.min(), 1e-6)
    coords[:, :2] /= s
    return coords.flatten().reshape(1, -1)

def predict_landmarks(landmarks):
    """Run model inference safely."""
    try:
        X = normalize_landmarks(landmarks)
        X = scaler.transform(X)
        y_pred = model.predict(X)
        label = le.inverse_transform([np.argmax(y_pred)])[0]
        confidence = float(np.max(y_pred))
        return {"prediction": label, "confidence": confidence}
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}

# ------------------------------
# REST API Endpoint
# ------------------------------
@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    landmarks = data.get("landmarks")

    if not landmarks or len(landmarks) != 63:
        return jsonify({"error": "Invalid landmarks"}), 400

    result = predict_landmarks(landmarks)
    return jsonify(result)

# ------------------------------
# WebSocket Events
# ------------------------------
@socketio.on("connect")
def handle_connect():
    print(f"Client connected: {request.sid}")
    emit("server_message", {"message": "Connected to SignSpeak backend"})

@socketio.on("disconnect")
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")

@socketio.on("live_landmarks")
def handle_live_landmarks(data):
    """Handle real-time landmarks for prediction"""
    landmarks = data.get("landmarks")
    if not landmarks or len(landmarks) != 63:
        emit("prediction", {"error": "Invalid landmarks"})
        return

    result = predict_landmarks(landmarks)
    emit("prediction", result)

@socketio.on("save_sample")
def handle_save_sample(data):
    """Save data for training dataset collection"""
    label = data.get("label", "unknown")
    landmarks = data.get("landmarks")

    if not landmarks or len(landmarks) != 63:
        emit("server_message", {"error": "Invalid sample"})
        return

    folder = os.path.join(DATASET_DIR, label)
    os.makedirs(folder, exist_ok=True)

    file_path = os.path.join(folder, "samples.csv")
    with open(file_path, "a", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(landmarks)

    emit("server_message", {"message": f"Saved one sample for '{label}'"})

# ------------------------------
# Run the server
# ------------------------------
if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)

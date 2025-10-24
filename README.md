SignSpeak — Real-Time Indian Sign Language Recognition
Overview

SignSpeak is a web-based app that recognizes Indian Sign Language (ISL) gestures in real time and converts them to speech. It also supports converting spoken words into corresponding ISL gestures. The app uses MediaPipe for hand tracking and a trained ML model for gesture prediction.

Features

Real-time hand gesture recognition (A-Z)

Speech-to-sign and sign-to-speech translation

Responsive single-page web interface

REST API and WebSocket support for predictions

Tech Stack

Frontend: HTML, CSS, JavaScript

Backend: Flask, Flask-CORS, Flask-SocketIO

ML: TensorFlow/Keras (MLP), scikit-learn

Hand Tracking: MediaPipe

Speech: Web Speech API

Project Structure
SignSpeak/
├── index.html
├── script.js
├── style.css
├── app.py
├── landmark_mlp.h5
├── landmark_scaler.pkl
├── label_encoder.pkl
└── mt-setting.json

How It Works

Sign-to-Speech: Webcam captures hand gestures → backend predicts → app displays and speaks the gesture.

Speech-to-Sign: Spoken words are transcribed → mapped to gestures → displayed and spoken.

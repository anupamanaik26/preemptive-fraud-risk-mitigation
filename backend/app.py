"""
Recruitment Fraud Detection — Flask REST API.

Endpoints:
  GET  /         -> {"message": "Recruitment Fraud Detection API Running"}
  POST /predict  -> {"prediction": "...", "confidence": "96.5%"}

Run:  python app.py     (http://localhost:5000)
"""

import os

import joblib
from flask import Flask, jsonify, request
from flask_cors import CORS

from train_model import clean_text

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")

app = Flask(__name__)
CORS(app)

model = joblib.load(os.path.join(MODEL_DIR, "xgboost_model.pkl"))
tfidf = joblib.load(os.path.join(MODEL_DIR, "tfidf_vectorizer.pkl"))

SCAM_INDICATORS = [
    ("unrealistic salary", ["guaranteed income", "unlimited income", "per day"]),
    ("work from home earning money quickly", ["work from home", "earn from home"]),
    ("no experience required", ["no experience", "no qualification"]),
    ("urgent hiring", ["urgent", "hurry", "limited seats"]),
    ("contact through personal email", ["gmail", "yahoo", "whatsapp", "telegram"]),
    ("immediate joining", ["immediate joining", "join today"]),
]


@app.route("/", methods=["GET"])
def index():
    return jsonify({"message": "Recruitment Fraud Detection API Running"})


@app.route("/predict", methods=["POST"])
def predict():
    payload = request.get_json(silent=True) or {}
    text = payload.get("job_description", "").strip()
    if not text:
        return jsonify({"error": "`job_description` is required"}), 400

    cleaned = clean_text(text)
    features = tfidf.transform([cleaned])
    proba = float(model.predict_proba(features)[0][1])
    fraudulent = proba >= 0.5
    confidence = proba if fraudulent else 1 - proba

    indicators = []
    if fraudulent:
        indicators = [
            reason
            for reason, keys in SCAM_INDICATORS
            if any(k in cleaned for k in keys)
        ]

    return jsonify(
        {
            "prediction": "FRAUDULENT JOB POSTING" if fraudulent else "GENUINE JOB POSTING",
            "label": "fraudulent" if fraudulent else "genuine",
            "confidence": f"{confidence * 100:.1f}%",
            "probability": proba,
            "indicators": indicators,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

"""
Recruitment Fraud Detection — Flask REST API (XGBoost x BERT fusion).

Endpoints:
  GET  /         -> {"message": "Recruitment Fraud Detection API Running"}
  POST /predict  -> {"prediction": "...", "confidence": "96.5%", "branches": {...}}

Run:  python app.py     (http://localhost:5000)
"""

import os

import joblib
from flask import Flask, jsonify, request
from flask_cors import CORS
from scipy.sparse import csr_matrix, hstack

from train_model import bert_embed, clean_text, load_bert

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")

app = Flask(__name__)
CORS(app)

model = joblib.load(os.path.join(MODEL_DIR, "xgboost_model.pkl"))
tfidf = joblib.load(os.path.join(MODEL_DIR, "tfidf_vectorizer.pkl"))
meta = joblib.load(os.path.join(MODEL_DIR, "meta.pkl"))
encoder = load_bert()

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
    return jsonify(
        {
            "message": "Recruitment Fraud Detection API Running",
            "model": "XGBoost + TF-IDF + BERT fusion",
            "bert_model": meta.get("bert_model"),
        }
    )


@app.route("/predict", methods=["POST"])
def predict():
    payload = request.get_json(silent=True) or {}
    text = payload.get("job_description", "").strip()
    if not text:
        return jsonify({"error": "`job_description` is required"}), 400

    cleaned = clean_text(text)

    # branch A: TF-IDF lexical | branch B: BERT semantic | branch C: engineered
    lex = tfidf.transform([cleaned])
    sem = bert_embed(encoder, [text])
    eng_vec, detail = extract_features(text)
    features = hstack([lex, csr_matrix(sem), csr_matrix([eng_vec])]).tocsr()

    proba = float(model.predict_proba(features)[0][1])
    score, level = risk_score(detail)
    fraudulent = proba >= 0.5 or level == "high"
    confidence = proba if fraudulent else 1 - proba

    # SHAP explanation over the engineered feature block
    try:
        import shap

        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(features)[0]
        eng_shap = shap_values[-len(FEATURE_NAMES):]
        top = sorted(
            zip(FEATURE_NAMES, [float(v) for v in eng_shap]),
            key=lambda kv: abs(kv[1]),
            reverse=True,
        )
    except Exception:  # shap optional at runtime
        top = [(n, 0.0) for n in FEATURE_NAMES]

    indicators = [
        reason for reason, keys in SCAM_INDICATORS if any(k in cleaned for k in keys)
    ]

    return jsonify(
        {
            "prediction": (
                "FRAUDULENT JOB POSTING" if level == "high" or proba >= 0.75
                else "SUSPICIOUS JOB POSTING" if fraudulent or level == "medium"
                else "GENUINE JOB POSTING"
            ),
            "label": "fraudulent" if fraudulent else "genuine",
            "confidence": f"{confidence * 100:.1f}%",
            "probability": proba,
            "risk_score": score,
            "risk_level": level,
            "explanation": explain(detail, score, level),
            "shap_values": [{"feature": f, "value": v} for f, v in top],
            "top_features": [f for f, _ in top[:5]],
            "verification": detail["verification"],
            "missing_information": detail["missing"],
            "engineered_features": dict(zip(FEATURE_NAMES, eng_vec)),
            "indicators": indicators,
            "branches": {
                "lexical_features": meta.get("lex_dim"),
                "semantic_features": meta.get("sem_dim"),
                "engineered_features": len(FEATURE_NAMES),
            },
        }
    )



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

"""
Recruitment Fraud Detection — XGBoost x BERT fusion training pipeline.

Dataset: Fake Job Postings (fake_job_postings.csv)
Pipeline:
    text cleaning
      -> branch A: TF-IDF (5000 features, sparse lexical)
      -> branch B: BERT sentence embeddings (all-MiniLM-L6-v2, 384-dim dense)
      -> hstack([A, B]) -> XGBoost classifier
Artifacts: model/xgboost_model.pkl, model/tfidf_vectorizer.pkl, model/meta.pkl

Run:  python train_model.py
"""

import os
import re
import string

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix, hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

DATA_PATH = os.environ.get("DATA_PATH", "fake_job_postings.csv")
MODEL_DIR = "model"
BERT_MODEL = os.environ.get("BERT_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
BERT_BATCH = int(os.environ.get("BERT_BATCH", "64"))
BERT_MAX_CHARS = 2000  # BERT truncates at 256 tokens anyway

TEXT_COLUMNS = [
    "title",
    "company_profile",
    "description",
    "requirements",
    "benefits",
]
EXTRA_COLUMNS = ["employment_type", "required_experience", "required_education"]


def clean_text(text: str) -> str:
    text = str(text).lower()
    text = text.translate(str.maketrans("", "", string.punctuation))
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def load_dataset(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    for col in TEXT_COLUMNS + EXTRA_COLUMNS:
        if col not in df.columns:
            df[col] = ""
        df[col] = df[col].fillna("")
    df["fraudulent"] = df["fraudulent"].fillna(0).astype(int)
    df["raw_text"] = df[TEXT_COLUMNS + EXTRA_COLUMNS].agg(" ".join, axis=1)
    df["combined_text"] = df["raw_text"].apply(clean_text)
    return df


def load_bert():
    """Load the sentence-transformer encoder used by the semantic branch."""
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(BERT_MODEL)


def bert_embed(encoder, texts) -> np.ndarray:
    """Dense BERT sentence embeddings, L2-normalised for stable fusion."""
    trimmed = [t[:BERT_MAX_CHARS] for t in texts]
    return encoder.encode(
        trimmed,
        batch_size=BERT_BATCH,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=True,
    )


def main() -> None:
    os.makedirs(MODEL_DIR, exist_ok=True)

    df = load_dataset(DATA_PATH)
    print(f"Loaded {len(df)} rows | fraud rate: {df['fraudulent'].mean():.3%}")

    # ---- Branch A: TF-IDF lexical features ----
    tfidf = TfidfVectorizer(max_features=5000, stop_words="english")
    X_lex = tfidf.fit_transform(df["combined_text"])
    print(f"TF-IDF branch : {X_lex.shape}")

    # ---- Branch B: BERT semantic embeddings ----
    encoder = load_bert()
    X_sem = bert_embed(encoder, df["raw_text"].tolist())
    print(f"BERT branch   : {X_sem.shape}  ({BERT_MODEL})")

    # ---- Fusion: concatenate sparse lexical + dense semantic features ----
    X = hstack([X_lex, csr_matrix(X_sem)]).tocsr()
    y = df["fraudulent"].values
    print(f"Fused matrix  : {X.shape}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = XGBClassifier(
        n_estimators=300,
        learning_rate=0.08,
        max_depth=6,
        subsample=0.9,
        colsample_bytree=0.8,
        random_state=42,
        eval_metric="logloss",
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    print("\n=== Evaluation (XGBoost + BERT fusion) ===")
    print(f"Accuracy : {accuracy_score(y_test, y_pred):.4f}")
    print(f"Precision: {precision_score(y_test, y_pred, zero_division=0):.4f}")
    print(f"Recall   : {recall_score(y_test, y_pred, zero_division=0):.4f}")
    print(f"F1 Score : {f1_score(y_test, y_pred, zero_division=0):.4f}")
    print(f"ROC-AUC  : {roc_auc_score(y_test, y_proba):.4f}")
    print("\nConfusion Matrix:\n", confusion_matrix(y_test, y_pred))
    print("\n", classification_report(y_test, y_pred, zero_division=0))

    fpr, tpr, _ = roc_curve(y_test, y_proba)
    plt.figure(figsize=(6, 5))
    plt.plot(fpr, tpr, label=f"XGBoost+BERT (AUC = {roc_auc_score(y_test, y_proba):.3f})")
    plt.plot([0, 1], [0, 1], "--", color="gray")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("ROC Curve — Fusion Model")
    plt.legend()
    plt.tight_layout()
    plt.savefig("roc_curve.png", dpi=150)

    joblib.dump(model, os.path.join(MODEL_DIR, "xgboost_model.pkl"))
    joblib.dump(tfidf, os.path.join(MODEL_DIR, "tfidf_vectorizer.pkl"))
    joblib.dump(
        {"bert_model": BERT_MODEL, "lex_dim": X_lex.shape[1], "sem_dim": X_sem.shape[1]},
        os.path.join(MODEL_DIR, "meta.pkl"),
    )
    print(f"\nArtifacts saved to ./{MODEL_DIR}/")


if __name__ == "__main__":
    main()

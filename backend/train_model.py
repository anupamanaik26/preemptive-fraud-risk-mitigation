"""
Recruitment Fraud Detection — ML training pipeline.

Dataset: Fake Job Postings (fake_job_postings.csv)
Pipeline: text cleaning -> TF-IDF (5000 features) -> XGBoost classifier
Artifacts: model/xgboost_model.pkl, model/tfidf_vectorizer.pkl

Run:  python train_model.py
"""

import os
import re
import string

import joblib
import matplotlib.pyplot as plt
import pandas as pd
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
    df["combined_text"] = (
        df[TEXT_COLUMNS + EXTRA_COLUMNS].agg(" ".join, axis=1).apply(clean_text)
    )
    return df


def main() -> None:
    os.makedirs(MODEL_DIR, exist_ok=True)

    df = load_dataset(DATA_PATH)
    print(f"Loaded {len(df)} rows | fraud rate: {df['fraudulent'].mean():.3%}")

    tfidf = TfidfVectorizer(max_features=5000, stop_words="english")
    X = tfidf.fit_transform(df["combined_text"])
    y = df["fraudulent"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = XGBClassifier(
        n_estimators=200,
        learning_rate=0.1,
        max_depth=6,
        random_state=42,
        eval_metric="logloss",
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    print("\n=== Evaluation ===")
    print(f"Accuracy : {accuracy_score(y_test, y_pred):.4f}")
    print(f"Precision: {precision_score(y_test, y_pred, zero_division=0):.4f}")
    print(f"Recall   : {recall_score(y_test, y_pred, zero_division=0):.4f}")
    print(f"F1 Score : {f1_score(y_test, y_pred, zero_division=0):.4f}")
    print(f"ROC-AUC  : {roc_auc_score(y_test, y_proba):.4f}")
    print("\nConfusion Matrix:\n", confusion_matrix(y_test, y_pred))
    print("\n", classification_report(y_test, y_pred, zero_division=0))

    fpr, tpr, _ = roc_curve(y_test, y_proba)
    plt.figure(figsize=(6, 5))
    plt.plot(fpr, tpr, label=f"XGBoost (AUC = {roc_auc_score(y_test, y_proba):.3f})")
    plt.plot([0, 1], [0, 1], "--", color="gray")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("ROC Curve — Recruitment Fraud Detection")
    plt.legend()
    plt.tight_layout()
    plt.savefig("roc_curve.png", dpi=150)

    joblib.dump(model, os.path.join(MODEL_DIR, "xgboost_model.pkl"))
    joblib.dump(tfidf, os.path.join(MODEL_DIR, "tfidf_vectorizer.pkl"))
    print(f"\nArtifacts saved to ./{MODEL_DIR}/")


if __name__ == "__main__":
    main()

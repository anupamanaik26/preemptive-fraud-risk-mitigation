# Backend — Recruitment Fraud Detection

Reference Python ML pipeline and Flask API.

```bash
pip install -r requirements.txt
# place fake_job_postings.csv next to train_model.py
python train_model.py     # trains XGBoost + TF-IDF, writes model/*.pkl
python app.py             # serves GET / and POST /predict on :5000
```

The deployed web app serves the same contract from
`src/routes/api/public/predict.ts` (edge runtime, no Python process needed).
To use this Flask service instead, point the frontend `fetch` in
`src/routes/index.tsx` at `http://localhost:5000/predict`.

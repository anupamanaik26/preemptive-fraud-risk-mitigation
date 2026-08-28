# Backend — Recruitment Fraud Detection (XGBoost × BERT fusion)

Reference Python ML pipeline and Flask API.

```bash
pip install -r requirements.txt
# place fake_job_postings.csv next to train_model.py
python train_model.py     # TF-IDF + BERT embeddings -> XGBoost, writes model/*.pkl
python app.py             # serves GET / and POST /predict on :5000
```

## Fusion architecture

```text
job text ─┬─> clean -> TF-IDF (5,000 sparse lexical features) ─┐
          │                                                    ├─ hstack ─> XGBoost ─> P(fraud)
          └─> BERT (all-MiniLM-L6-v2, 384-dim sentence embed) ─┘
```

The lexical branch catches explicit scam vocabulary; the BERT branch catches
paraphrased or reworded scams that share no keywords with the training set.
XGBoost learns the interaction between both blocks in one model.

Swap encoders with `BERT_MODEL=bert-base-uncased python train_model.py`.

The deployed web app serves the same contract from
`src/routes/api/public/predict.ts` (edge runtime, no Python process needed) —
its `src/lib/semantic-model.ts` reproduces the semantic branch's decision layer
via exported class centroids, since transformer weights can't run at the edge.
To use this Flask service instead, point the frontend `fetch` in
`src/routes/index.tsx` at `http://localhost:5000/predict`.

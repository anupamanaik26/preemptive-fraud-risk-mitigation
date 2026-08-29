# JobGuard AI

AI-Powered Recruitment Fraud Detection System

Build a complete full-stack web application called Recruitment Fraud Detection System that detects whether a job posting is Genuine or Fraudulent using Machine Learning (XGBoost).

Project Objective

The system should help job seekers identify fake job advertisements by analyzing job descriptions and predicting whether the posting is genuine or fraudulent.

Tech Stack

Frontend

React.js

HTML5

CSS3

Tailwind CSS

Axios

Backend

Python Flask API

REST API

Machine Learning

Scikit-learn

XGBoost Classifier

TF-IDF Vectorization

Joblib for model saving/loading

Dataset

Use the Fake Job Postings dataset containing:

title

company_profile

description

requirements

benefits

employment_type

required_experience

required_education

fraudulent (target column)

Target:

0 = Genuine Job Posting

1 = Fraudulent Job Posting

Machine Learning Pipeline

Data Preprocessing

Load dataset CSV.

Combine text fields:

title

company_profile

description

requirements

benefits

Clean text:

Convert to lowercase

Remove punctuation

Remove special characters

Remove extra spaces

Handle missing values.

Feature Extraction

Use:

TfidfVectorizer(
    max_features=5000,
    stop_words='english'
)


Generate TF-IDF feature matrix.

Model Training

Train using:

from xgboost import XGBClassifier

model = XGBClassifier(
    n_estimators=200,
    learning_rate=0.1,
    max_depth=6,
    random_state=42
)


Train-Test Split:

test_size=0.2
random_state=42


Evaluation Metrics:

Accuracy

Precision

Recall

F1 Score

Confusion Matrix

ROC Curve

ROC-AUC Score

Expected Accuracy: 90–97%

Save model:

joblib.dump(model, 'xgboost_model.pkl')
joblib.dump(tfidf, 'tfidf_vectorizer.pkl')


Backend Requirements

Create Flask API.

Endpoint 1

GET /

Returns:

{
  "message": "Recruitment Fraud Detection API Running"
}


Endpoint 2

POST /predict

Input:

{
  "job_description": "Software Engineer required for Google with 5 years experience..."
}


Process:

Load TF-IDF vectorizer.

Transform text.

Predict using XGBoost model.

Return prediction.

Output:

{
  "prediction": "GENUINE JOB POSTING",
  "confidence": "96.5%"
}


or

{
  "prediction": "FRAUDULENT JOB POSTING",
  "confidence": "94.2%"
}


Frontend Requirements

Create a modern professional UI.

Home Page

Title:

"AI Recruitment Fraud Detection System"

Subtitle:

"Detect Fake Job Advertisements Using Machine Learning"

Components:

Large text area

Predict button

Clear button

Results card

Prediction Flow

User enters job description.

Example:

Google is hiring a Software Engineer with Python and Machine Learning skills.


Click Predict.

Show loading animation.

Display:

Genuine

✅ Genuine Job Posting

Confidence Score: 96.5%

or

Fraudulent

❌ Fraudulent Job Posting

Confidence Score: 94.2%

Dashboard Section

Display:

Total Predictions

Genuine Count

Fraud Count

Accuracy of Model

Last Prediction

Use attractive cards and charts.

Additional Features

Job Scam Indicators

When fraud is detected display possible reasons:

Unrealistic salary

Work from home earning money quickly

No experience required

Urgent hiring

Contact through personal email

Immediate joining

Confidence Meter

Display prediction confidence with:

Progress bar

Percentage indicator

History Section

Store previous predictions.

Display:

Date Job Text Prediction

Use Local Storage.

Theme

Professional AI Cyber Security Theme.

Colors:

Dark Blue

White

Light Gray

Green for Genuine

Red for Fraud

Use glassmorphism cards and smooth animations.

Project Structure

Recruitment-Fraud-Detection/

frontend/
│
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── PredictionForm.jsx
│   │   ├── ResultCard.jsx
│   │   ├── Dashboard.jsx
│   │   └── History.jsx
│   │
│   ├── App.jsx
│   └── main.jsx

backend/
│
├── app.py
├── model/
│   ├── xgboost_model.pkl
│   └── tfidf_vectorizer.pkl
│
├── train_model.py
└── requirements.txt


Expected Output

A complete production-ready Recruitment Fraud Detection System where:

Users paste a job advertisement.

TF-IDF converts text into numerical features.

XGBoost predicts fraud or genuine status.

Flask API serves predictions.

React frontend displays results.

Dashboard shows analytics.

Prediction history is maintained.

Modern responsive UI works on desktop and mobile.

Generate all frontend, backend, ML integration code, API calls, folder structure, styling, charts, and deployment-ready files.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://vigilant-job-guard.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0b35e7d3-9d5e-4375-8a37-4eed34070cc7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

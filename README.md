# QueryViz AI

<p align="center">
  <b>Ask your CSV questions in plain English. Get interactive dashboards instantly.</b>
</p>

<p align="center">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white" />
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-API-009688?logo=fastapi&logoColor=white" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-Frontend-000000?logo=nextdotjs&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-green" />
</p>

## Live Product Snapshot

Add your product media here to make the page instantly engaging.

![QueryViz AI Demo GIF Placeholder](docs/media/queryviz-demo.gif)

![Dashboard Screenshot Placeholder](docs/media/dashboard-overview.png)

## What Is QueryViz AI?

QueryViz AI turns any CSV into a conversational analytics workspace.

Upload your file, ask a question like "Top categories by views", and get:

- generated SQL,
- query results,
- auto-selected chart configs,
- and an interactive dashboard view.

## Why It Stands Out

- No manual SQL required for common analytics tasks.
- Fast path from raw data to insights.
- Safe-by-default SQL execution with fallback behavior.
- Works with arbitrary uploaded CSVs.

## Try These Prompts

Copy and paste one of these:

- Show key insights and trends from this dataset
- Top 5 categories by total views
- Monthly trend of engagement
- Average sentiment by region
- Compare performance by language

## 60-Second Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm
- Groq API key

### 1. Start the Backend

```bash
cd backend
python -m venv .venv
```

Windows PowerShell:

```bash
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Run API:

```bash
uvicorn main:app --reload --port 8080
```

### 2. Start the Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

Run UI:

```bash
npm run dev
```

Open http://localhost:3000

## API at a Glance

Base path: `/api`

### POST /api/upload

Uploads a CSV file.

- Content type: `multipart/form-data`
- Field: `file`
- Returns: `message`, `db_id`, `schema_preview`

### POST /api/dashboard

Generates SQL, executes it, and returns chart-ready output.

```json
{
  "db_id": "<id from upload>",
  "prompt": "Show key insights and trends"
}
```

Returns: `sql`, `data`, `charts`, `message`

### GET /api/health

Health check endpoint.

## System Flow

1. CSV is uploaded to backend
2. Upload-specific SQLite database is created
3. Schema context is built from the uploaded data
4. LLM converts prompt to SQL
5. SQL is sanitized and executed safely
6. Chart configuration is generated
7. Frontend renders interactive visuals

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, Recharts
- Backend: FastAPI, aiosqlite, pandas, groq, python-dotenv
- Data: SQLite per-upload databases in `backend/data/uploads`

## Local Development

```bash
# Backend tests
cd backend
pytest -q
```

## Troubleshooting

Frontend cannot connect:

- Verify `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- Confirm backend is running on expected port

Upload fails:

- Ensure file extension is `.csv`
- Check backend logs for parsing details

Unexpected query behavior:

- Use clearer metric and grouping terms in the prompt
- App falls back to safe query behavior when needed

## Roadmap Ideas

- Saved dashboards and prompt history
- Shareable dashboard links
- More chart themes and templates
- Data quality profiler before querying

## Contributing

Contributions, bug reports, and feature ideas are welcome.

## License

See `LICENSE`.

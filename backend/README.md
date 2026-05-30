# JME Backend

FastAPI backend server for JME project.

## Setup Instructions

### 1. Activate Virtual Environment
```bash
# Windows
.\venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

### 2. Configure Database
- Get PostgreSQL credentials from Render.com
- Update `.env` file with your database URL:
```
DATABASE_URL=postgresql://jmeuser:PASSWORD@dpg-xxxx.render.com:5432/jmedb
```

### 3. Run Server
```bash
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --reload
```

Server will run at: `http://localhost:8000`

## API Documentation

Once running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## Project Structure

```
backend/
├── main.py           # FastAPI app entry point
├── database.py       # Database connection setup
├── models.py         # SQLAlchemy models (User, etc)
├── schemas.py        # Pydantic schemas for API
├── requirements.txt  # Python dependencies
├── .env              # Environment variables
└── venv/             # Virtual environment
```

## Available Endpoints

- `GET /` - Health check
- `GET /api/health` - Detailed health check

## Next Steps

1. Update `.env` with your PostgreSQL credentials
2. Create database tables: `python -c "from database import engine; from models import Base; Base.metadata.create_all(bind=engine)"`
3. Run the server and visit `/docs` for API documentation
4. Create API routes for user management (register, login, etc.)

## Frontend Integration

Frontend should call backend at: `http://localhost:8000`

CORS is configured for:
- http://localhost:5173 (Vite frontend)
- http://localhost:3000 (Alternative port)

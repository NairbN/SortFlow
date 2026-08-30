FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Shell form so $PORT expands - Railway injects it at runtime and expects
# the app to bind to it; falls back to 8000 when unset (e.g. docker-compose,
# which overrides this CMD anyway for --reload). Runs pending migrations
# before starting the app, since there's no separate release-phase step -
# safe to run on every boot since a no-op `upgrade head` is a no-op.
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}

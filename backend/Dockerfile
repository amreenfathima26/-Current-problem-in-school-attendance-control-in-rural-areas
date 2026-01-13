FROM python:3.10-slim-bullseye

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV CMAKE_ARGS="-DCMAKE_POLICY_VERSION_MINIMUM=3.5"
ENV MAKEFLAGS="-j1"

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        libpq-dev \
        gcc \
        python3-dev \
        pkg-config \
        build-essential \
        cmake \
        libopenblas-dev \
        liblapack-dev \
        libx11-dev \
        libgtk-3-dev \
        libgl1-mesa-glx \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/

# Install build tools first with a specific CMake version to avoid policy errors
# We install them into the system environment so we can use --no-build-isolation
RUN pip install --no-cache-dir --upgrade pip setuptools wheel "cmake<3.27"

# Install dlib separately with flags to handle the memory and policy issues
# --no-build-isolation ensures pip uses the cmake version we just installed
# -vv helps us see exactly what's happening if it fails
RUN CMAKE_ARGS="-DCMAKE_POLICY_VERSION_MINIMUM=3.5" \
    pip install --no-cache-dir dlib==19.24.2 --no-build-isolation -vv

# Install the rest of the requirements
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Create directories for logs and media
RUN mkdir -p logs media staticfiles

# Collect static files
RUN python manage.py collectstatic --noinput

# Copy entrypoint script
COPY entrypoint.sh /app/
RUN chmod +x /app/entrypoint.sh

# Expose port
EXPOSE 8000

# Run the entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]

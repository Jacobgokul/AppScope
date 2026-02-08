#!/bin/bash
# AppScope Backend Setup Script
# This script sets up the backend development environment

set -e  # Exit on error

echo "========================================"
echo "AppScope Backend Setup"
echo "========================================"
echo ""

# Check Python version
echo "Checking Python version..."
python_version=$(python --version 2>&1 | awk '{print $2}')
echo "✓ Python $python_version found"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ] && [ ! -d "env" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi
echo ""

# Activate virtual environment
echo "Activating virtual environment..."
if [ -f "venv/Scripts/activate" ]; then
    # Windows
    source venv/Scripts/activate
elif [ -f "venv/bin/activate" ]; then
    # Linux/Mac
    source venv/bin/activate
else
    echo "✗ Failed to find activate script"
    exit 1
fi
echo "✓ Virtual environment activated"
echo ""

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
echo "✓ Dependencies installed"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env from template..."
    cp .env.example .env

    # Generate secret key
    secret_key=$(openssl rand -hex 32)

    # Update .env with generated secret key
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/SECRET_KEY=.*/SECRET_KEY=$secret_key/" .env
    else
        # Linux
        sed -i "s/SECRET_KEY=.*/SECRET_KEY=$secret_key/" .env
    fi

    echo "✓ .env file created with generated SECRET_KEY"
    echo ""
    echo "⚠️  IMPORTANT: Review and update .env with your database settings:"
    echo "   - DATABASE_URL"
    echo "   - LLM_API_KEY (optional)"
    echo ""
else
    echo "✓ .env file already exists"
    echo ""
fi

# Check database connection
echo "Checking database connection..."
if command -v psql &> /dev/null; then
    db_url=$(grep DATABASE_URL .env | cut -d '=' -f2)
    if [ -z "$db_url" ]; then
        echo "⚠️  DATABASE_URL not set in .env"
    else
        echo "✓ DATABASE_URL configured"
    fi
else
    echo "⚠️  psql not found. Install PostgreSQL to test connection."
fi
echo ""

echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Review .env configuration"
echo "2. Start TimescaleDB (see README.md for Docker command)"
echo "3. Run migrations: alembic upgrade head"
echo "4. Start dev server: uvicorn app.main:app --reload"
echo ""
echo "For detailed instructions, see README.md"
echo ""

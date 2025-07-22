#!/bin/bash

echo ""
echo "========================================"
echo "Medical Medium Archive Explorer"
echo "========================================"
echo ""
echo "Starting local server..."
echo ""
echo "The archive will open in your browser automatically."
echo "To stop the server, press Ctrl+C"
echo ""

# Check if Python is available
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "ERROR: Python is not installed"
    echo "Please install Python from https://python.org"
    exit 1
fi

# Start server in background and get PID
$PYTHON_CMD -m http.server 8080 &
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

# Open browser
if command -v open &> /dev/null; then
    # macOS
    open http://localhost:8080
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open http://localhost:8080
else
    echo "Please open http://localhost:8080 in your browser"
fi

# Wait for server (brings it to foreground)
wait $SERVER_PID 
#!/bin/bash
export PATH="$HOME/Library/Python/3.9/bin:$PATH"
cd "$(dirname "$0")"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

#!/bin/bash

# Exit if any command fails
set -e

echo "Detecting changed functions..."

# Get a list of all changed files in the push
FILES_CHANGED=$(git diff --name-only $1 $2)

# Filter for files in the supabase/functions directory and get the unique function names
FUNCTIONS_TO_DEPLOY=$(echo "$FILES_CHANGED" | grep -oE 'supabase/functions/([^/]+)' | sort -u | sed 's/supabase\/functions\///g')

if [ -z "$FUNCTIONS_TO_DEPLOY" ]; then
  echo "No functions to deploy."
  exit 0
fi

echo "Functions to deploy: $FUNCTIONS_TO_DEPLOY"

for FUNCTION in $FUNCTIONS_TO_DEPLOY; do
  echo "Deploying function $FUNCTION..."
  supabase functions deploy "$FUNCTION" --project-ref "$PROJECT_ID"
done

echo "All changed functions deployed successfully."

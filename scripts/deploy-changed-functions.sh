#!/bin/bash

# Exit if any command fails
set -e

echo "Detecting changed functions..."

# Get a list of all changed files in the push
FILES_CHANGED=$(git diff --name-only $1 $2)

# Filter for files in the supabase/functions directory and get the unique function names
CHANGED_FUNCTIONS=$(echo "$FILES_CHANGED" | grep -oE 'supabase/functions/([^/]+)' | sort -u | sed 's/supabase\/functions\///g')

if [ -z "$CHANGED_FUNCTIONS" ]; then
  echo "No functions to deploy or delete."
  exit 0
fi

echo "Changed functions: $CHANGED_FUNCTIONS"

for FUNCTION in $CHANGED_FUNCTIONS; do
  FUNCTION_DIR="supabase/functions/$FUNCTION"
  if [ -d "$FUNCTION_DIR" ]; then
    echo "Deploying function $FUNCTION..."
    supabase functions deploy "$FUNCTION" --project-ref "$PROJECT_ID"
  else
    echo "Deleting function $FUNCTION..."
    supabase functions delete "$FUNCTION" --project-ref "$PROJECT_ID" --yes
  fi
done

echo "All changed functions processed successfully."

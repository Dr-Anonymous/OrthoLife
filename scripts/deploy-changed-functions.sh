#!/bin/bash

# Exit if any command fails
set -e
# Enable command tracing for debugging in CI
set -x

echo "Detecting changed functions..."

# Get a list of all changed files in the push.
# We capture the output and exit code separately because 'set -e' would exit immediately on failure.
# This allows us to provide a more specific error message.
set +e
FILES_CHANGED=$(git diff --name-only $1 $2)
GIT_DIFF_EXIT_CODE=$?
set -e

if [ $GIT_DIFF_EXIT_CODE -ne 0 ]; then
  echo "Error: 'git diff --name-only $1 $2' failed with exit code $GIT_DIFF_EXIT_CODE." >&2
  echo "This can happen in CI environments with shallow clones. Please ensure the full git history is available." >&2
  exit 1
fi

# Filter for files in the supabase/functions directory and get the unique function names, excluding _shared
CHANGED_FUNCTIONS=$(echo "$FILES_CHANGED" | grep -oE 'supabase/functions/([^/]+)' | sort -u | sed 's/supabase\/functions\///g' | grep -v '^_shared$')

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

#!/bin/bash
# To enable daily automated backups for your default Firestore database, run this command using the gcloud CLI
# Ensure you have billing enabled on your Google Cloud project.
# Replace [PROJECT_ID] with your project ID.

gcloud alpha firestore backups schedules create \
  --database='(default)' \
  --recurrence=daily \
  --retention=7d \
  --project=[PROJECT_ID]

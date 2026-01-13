# Deployment Instructions

This project is configured for easy deployment on **Render.com** with an external free PostgreSQL database (e.g., from Neon.tech).

## Prerequisites
1.  **Bitbucket/GitLab/GitHub Account**: You need your project pushed to a repository.
2.  **Render.com Account**: Sign up for free.
3.  **Neon.tech Account**: Sign up for a free PostgreSQL database.

## Step 1: Push to GitHub
If you haven't already, push your code to GitHub:
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

## Step 2: Create a Free Database
1.  Go to [Neon.tech](https://neon.tech) and create a new project.
2.  Be sure to select the **Free Tier**.
3.  Once created, copy the **Connection String** (Postgres URL). It should look like `postgres://user:password@ep-xyz.region.neon.tech/neondb?sslmode=require`.

## Step 3: Deploy to Render
1.  Log in to your [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** -> **Blueprint**.
3.  Connect your GitHub repository.
4.  Render will detect the `render.yaml` file.
5.  It will ask you for environment variables.
    *   **DATABASE_URL**: Paste the Connection String you copied from Neon.tech.
6.  Click **Apply**.

## Step 4: Verification
Render will deploy the Backend and Frontend.
*   **Backend**: Will automatically run migrations.
*   **Frontend**: Will build and serve the React app.

Once finished, click on the **attendance-frontend** service URL to access your app.

## Notes
*   **API URL**: The frontend is automatically configured to talk to the backend via the `REACT_APP_API_URL` environment variable.
*   **Superuser**: To create an admin user, you can use the Render Shell on the backend service:
    ```bash
    python manage.py createsuperuser
    ```

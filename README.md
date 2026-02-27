# Arabic Sentiment Analyzer

A powerful, React-based web application designed to analyze the sentiment of Arabic text data using the Google Gemini API. This tool allows users to upload datasets, configure analysis parameters, visualize results in real-time, and compare different brand analyses.

## Features

*   **Multi-format File Upload:** Support for `.csv`, `.xlsx`, `.xls`, and `.json` files via drag-and-drop or manual selection.
*   **Intelligent Data Preview:** Automatically detects likely columns for comments, verified status, and engagement metrics.
*   **Configurable Analysis:** Adjust batch sizes and API request delays to manage rate limits and processing speed.
*   **Real-time Progress Tracking:** Watch the analysis happen live with visual indicators for the current comment's sentiment and overall progress.
*   **Comprehensive Dashboards:**
    *   **Overview Metrics:** Total comments, verified users, brand sentiment percentage, net sentiment score, and engagement stats.
    *   **Visualizations:** Pie charts for sentiment distribution, bar charts for positive vs. negative breakdown, and line charts for sentiment trends over time.
    *   **Detailed Data Table:** View, filter (by sentiment and verified status), and explore individual analyzed comments.
*   **Export & Save:**
    *   Export results to CSV or JSON for external reporting.
    *   Save projects locally to revisit them later without re-analyzing.
*   **Brand Comparison:** Upload a previously exported JSON analysis to compare metrics and trends side-by-side with the current dataset.
*   **Dark/Light Mode:** Fully responsive and accessible UI with a built-in theme toggle.

## Project Structure & Key Components

### 1. `src/App.tsx`
The main application container that manages the global state and orchestrates the flow between different views (Upload, Preview, Progress, Results, Comparison, Saved Projects). It also handles theme switching and local storage for saved projects.

### 2. `src/components/FileUpload.tsx`
Handles the initial data ingestion.
*   **Functions:**
    *   `handleDrag`, `handleDrop`: Manages drag-and-drop interactions.
    *   `validateAndUpload`: Validates file extensions and MIME types before passing the file to the main app state.

### 3. `src/components/DataPreview.tsx`
Displays a sample of the uploaded data and provides configuration options for the analysis.
*   **Functions:**
    *   `detectColumn`: A utility function that attempts to auto-select the correct columns (e.g., 'comment', 'text', 'verified') based on common keywords.
    *   Allows users to map dataset columns to specific analysis roles (Text, Verified Status, Engagement).
    *   Provides inputs for `batchSize` and `delayMs` to control the API request flow.

### 4. `src/components/AnalysisProgress.tsx`
Displays the real-time status of the Gemini API analysis.
*   **Functions:**
    *   `getSentimentColor`, `getSentimentEmoji`: Helper functions to visually style the currently analyzed comment based on its returned sentiment.

### 5. `src/components/FinalResults.tsx`
The core dashboard for viewing the completed analysis.
*   **Features:**
    *   Calculates derived metrics like `brandSentiment` and `netSentimentScore`.
    *   Renders Recharts components (`PieChart`, `BarChart`, `LineChart`) with custom tooltips adapted for dark/light modes.
    *   **Filtering:** `filteredComments` uses `useMemo` to efficiently filter the data table based on user selections (Verified Status, Sentiment).
    *   **Export Functions:**
        *   `handleDownloadCSV`: Converts the analyzed data array into a downloadable CSV file.
        *   `handleExportJSON`: Packages the metadata, stats, and comments into a downloadable JSON file (used for the comparison feature).

### 6. `src/components/ComparisonDashboard.tsx`
A side-by-side comparison view triggered when a user uploads an exported JSON file to compare against the currently active analysis.
*   **Features:**
    *   Calculates and aligns metrics from two distinct `ExportedAnalysis` objects.
    *   Renders comparative bar and line charts to visualize differences in sentiment distribution and trends.

### 7. `src/components/SavedProjectsList.tsx`
Manages projects saved to the browser's `localStorage`.
*   **Functions:**
    *   Allows users to load a previously saved state directly into the `FinalResults` view.
    *   Allows deletion of saved projects.

### 8. `src/services/geminiService.ts`
Handles the integration with the Google Gemini API.
*   **Functions:**
    *   `analyzeArabicSentimentBatch(comments: string[])`: Constructs the prompt, sends the batch of comments to the Gemini model, and parses the JSON response into structured sentiment data (positive, negative, neutral) and a numerical score.

## Setup & Installation

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Environment Variables:**
    Ensure you have a `.env` file (or configure it in your environment) with your Gemini API key:
    ```env
    VITE_GEMINI_API_KEY=your_api_key_here
    ```
    *(Note: In the AI Studio environment, this is often handled automatically via `process.env.GEMINI_API_KEY`)*
3.  **Run Development Server:**
    ```bash
    npm run dev
    ```
4.  **Build for Production:**
    ```bash
    npm run build
    ```

## Technologies Used
*   **React 18** (Functional Components, Hooks)
*   **TypeScript** for static typing
*   **Vite** for fast bundling and development
*   **Tailwind CSS** for styling (with dark mode support)
*   **Recharts** for data visualization
*   **Lucide React** for icons
*   **PapaParse** for CSV parsing
*   **XLSX** for Excel file parsing
*   **@google/genai** SDK for AI sentiment analysis

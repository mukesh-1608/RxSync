# RxSync

**Developed by Juara IT Solutions**

## Project Overview

RxSync is an enterprise-grade Intelligent Document Processing (IDP) platform designed specifically for the healthcare sector. It automates the extraction of critical patient, doctor, and prescription data from complex pharmacy order forms and converts it into structured, validated XML.

Traditional OCR solutions often fail to interpret the complex layouts of medical documents, leading to data entry errors. RxSync addresses this by combining AWS Textract for physical layout analysis with Google Gemini 1.5 for cognitive reasoning, achieving high accuracy in distinguishing ambiguous fields such as patient versus doctor names.

## Key Features

- **Hybrid AI Architecture**: Combines deterministic OCR (AWS Textract) with generative AI (Google Gemini) for context-aware extraction.
- **Smart Model Discovery**: Automatically detects available Gemini models associated with the API key to ensure service continuity.
- **Deterministic Normalization**: Pre-processes OCR output to correct common artifacts (e.g., blood type misreadings) before AI processing.
- **Logic-Based Anchoring**: Uses geometric and positional logic to accurately identify doctor names, solving common hallucination issues in medical forms.
- **Strict Validation**: Enforces schema compliance, ensuring no empty tags are generated and missing data is explicitly flagged.

## Architecture

The system follows a multi-stage pipeline:

1.  **Ingestion**: Users upload images (JPEG/PNG) via a secure React frontend.
2.  **Physical Extraction**: AWS Textract analyzes the document geometry, tables, and raw text.
3.  **Normalization**: A TypeScript engine cleans OCR noise and standardizes anchors (e.g., gender labels).
4.  **Cognitive Parsing**: Google Gemini maps the cleaned text to XML using strict logic rules.
5.  **Validation**: Post-processing algorithms verify field completeness before outputting the final XML.

## Technology Stack

### Frontend
- **Framework**: React 18 (Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Middleware**: Multer

### Cloud & AI Services
- **Storage**: AWS S3
- **OCR Engine**: AWS Textract
- **Generative AI**: Google Gemini API (Vertex AI)

## Prerequisites

Ensure the following are installed and configured before running the application:

- Node.js (v18 or higher)
- npm (Node Package Manager)
- AWS Account with permissions for `AmazonS3FullAccess` and `AmazonTextractFullAccess`
- Google Cloud Account with the Generative Language API enabled

## Installation

1.  Clone the repository:
    ```bash
    git clone [https://github.com/your-org/RxSync.git](https://github.com/your-org/RxSync.git)
    cd RxSync
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

## Configuration

Create a `.env` file in the root directory and populate it with your credentials:

```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_s3_bucket_name

# Google AI Configuration
GEMINI_API_KEY=your_google_api_key

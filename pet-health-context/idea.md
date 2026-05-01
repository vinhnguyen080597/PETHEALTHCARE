PROJECT DOCUMENTATION: AI PET HEALTH APP
1. Project Overview

Project Name (Estimated): AI Pet Health.

Objective: An application that assists pet owners in analyzing and diagnosing pet illnesses through images/videos using AI technology.

Target Audience: Pet owners (Dogs, cats, hamsters, chickens, birds, etc.).

Platforms: iOS (Initial priority), Android (Secondary).

Core Strategy: Data Labeling to build a proprietary dataset of veterinary pathologies.

2. Tech Stack

Frontend Mobile: React Native (Framework: Expo).

Backend: Node.js (Runtime), Express/FastAPI.

AI Engine: Google Gemini 3 Flash SDK (@google/genai).

Database & Auth: Supabase (PostgreSQL) or Firebase.

Cloud Storage: Storing pathological images for AI training purposes.

Language: Multi-language support (i18n).

3. Development Roadmap

Phase 1: MVP - Skeleton & Core Diagnosis
Core Feature: Capture Photo/Video -> AI Analysis -> Results (Pathology, severity, recommended actions).

Pet Management: Create basic profiles for pets.

Infrastructure: Set up an intermediary Backend to secure API Keys and store data.

AI Output: Return results in JSON format for UI rendering (Safe/Warning/Danger status).

Phase 2: Care Ecosystem (Retention)
Reminders: Vaccination, deworming, and flea treatment schedules.

Chatbot: 24/7 pet care consultation (context-aware).

Journal: Track daily weight and behavioral symptoms.

Phase 3: Connectivity & Commercialization
Maps: Find the nearest veterinary clinics.

Monetization: Premium plans, Affiliate Marketing (food, medicine), and clinic booking integration.

Admin Tool: Internal tools for veterinarians to perform Data Labeling.

4. AI Data Structure (Prompting Strategy)
The AI is tasked with acting as a professional veterinarian, analyzing uploaded images and returning a JSON structure including:

diagnosis: Predicted illness name.

severity: Level (Low, Medium, High).

symptoms: Identified symptoms.

treatment: Preliminary handling instructions.

disclaimer: Medical liability disclaimer.

5. Cost & Operations Plan

Leveraging Free Tiers: Utilize Gemini 3 Flash (1,500 free requests/day).

Optimization: Compress images on the client-side before sending to save tokens and bandwidth.

Development: Project owner handles direct coding (Web experience, currently learning Mobile via AI guidance).

Marketing: Leverage personal YouTube and TikTok channels (Pet niche).

6. Important Technical Notes

Use the latest @google/genai library (2026).

Model ID: gemini-3-flash-preview or gemini-1.5-flash-latest.

Always require the AI to return results with a confidence score.
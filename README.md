<div align="center">

# ⚡ SyncUp AI — Semester Copilot

### *The Burnout-Aware Semester Copilot with Adaptive Spaced Retention & Instant Academic Triage.*

[![Next.js 14](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Spring Boot 3](https://img.shields.io/badge/Spring_Boot_3.3.5-6DB33F?style=for-the-badge&logo=spring&logoColor=white)](https://spring.io/projects/spring-boot)
[![Java 21](https://img.shields.io/badge/Java_21_LTS-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://openjdk.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Status](https://img.shields.io/badge/Glitchathon-Finalist_Submission-indigo?style=for-the-badge)](https://devpost.com/)

---

[Key Features](#-key-features) • [Architecture](#-system-architecture) • [Quickstart Guide](#-quickstart-guide) • [API Reference](#-api-reference) • [Demo Walkthrough](#-1-minute-judge-demo-guide) • [Team](#-team)

---

</div>

## 📌 Problem & Motivation

Every semester, university students face an exhausting academic paradox:
1. **The PDF Firehose:** Course syllabi, lecture modules, and exam schedules are handed out as dense 15-page PDFs with scattered tables and unstructured expectations.
2. **The "Missed-Day Guilt Spiral":** When a student falls sick or misses two days of study, rigid checklists and static calendar templates break down. Guilt sets in, and the study plan is abandoned.
3. **Severe Academic Burnout:** Without dynamic workload leveling, students cram for 10–12 consecutive hours prior to examinations, leading to cognitive exhaustion, high anxiety, and rapid knowledge decay.

**SyncUp AI** solves this by acting as an **intelligent academic GPS**. Just as a navigation app reroutes you without judgment when you miss a turn, SyncUp AI dynamically redistributes your workload, protects scheduled exam dates, and levels your daily pace the second you fall behind.

---

## 🌟 Key Features

### 1. ⚡ 1-Click Judge Demo (Zero-Setup Pitch Mode)
- Fixed in the top navigation: **`⚡ Instant demo (VIT-AP CS)`**.
- Instantly hydrates a complete, realistic university track: **CSE3009 (NoSQL Database Systems)** and **SWE2008 (Object-Oriented Analysis & Design)**.
- Populates **12 structured modules**, a **Day-10 CAT-1 Exam Day**, weekend review sprints, and pre-seeded streak data in under **100 milliseconds**—zero file upload or network wait time required.

### 2. 🛡️ Live Cognitive Burnout Meter (240° SVG Arc Gauge)
- Real-time mathematical pacing calculated using our dynamic cognitive load index:
  $$\text{Daily Load} = \frac{\sum \text{Pending Hours}}{\text{Remaining Days}}$$
- Three calibrated cognitive tiers:
  - **Optimal Pace ($\le 3.5\text{ hrs/day}$):** Sustainable velocity with maximized spaced retention (Emerald `#10B981`).
  - **Moderate Load ($3.5 - 4.5\text{ hrs/day}$):** Workload tightening; prompts structured Pomodoro intervals (Amber `#F59E0B`).
  - **Critical Risk ($> 4.5\text{ hrs/day}$):** High burnout threshold; triggers proactive cognitive advice (Rose `#EF4444`).

### 3. 🔄 "I Fell Behind" (Smart Academic Triage — Hero Feature)
- Life happens. Clicking **"I Fell Behind"** triggers our cognitive triage engine:
  - Identifies overdue sessions and absorbs backlog hours.
  - Skips rigid exam dates (e.g., CAT-1 Exam Day is strictly preserved).
  - Swaps low-yield heavy theory into active-recall flashcards.
  - Smoothly re-dials the workload gauge back to a sustainable baseline and displays a slide-down **Cognitive Triage Advice Card**.

### 4. 🃏 3D Active Recall & Self-Quizzing Drawer
- **3D Flip Flashcards:** Realistic CSS 3D physics (`perspective-1000`, `transform-style-3d`) displaying concept prompts on front and bullet-formatted recall keys on back.
- **3-Question Mastery MCQs:** Instant green/red selection feedback, pedagogical explanations for every option, and celebratory **confetti bursts** upon reaching a 3/3 score.

### 5. ⏱️ Floating Pomodoro Focus Dock
- Fully integrated, draggable focus dock with circular SVG progress rings:
  - **Focus Mode (25m):** Electric Indigo `#6366F1`
  - **Short Break (5m):** Emerald `#10B981`
  - **Long Rest (15m):** Amber `#F59E0B`
- **Background Tab Precision:** Uses timestamp delta calculation (`Date.now() + remainingMs`) to prevent time drifting when modern browsers throttle background tabs.
- **Web Audio Chimes:** Synthesizes multi-frequency audio tones natively without external audio asset downloads.

### 6. 📅 RFC 5545 iCalendar Universal Export
- Native client-side `.ics` generator ([`ical.ts`](frontend/src/lib/ical.ts)).
- Generates standard `DTSTART`, `DTEND`, `SUMMARY`, and `DESCRIPTION` events.
- Downloads `syncup-schedule.ics` in 1 click for seamless import into **Google Calendar**, **Apple Calendar**, and **Microsoft Outlook**.

### 7. 🏗️ Built-in System Architecture Modal
- Dedicated modal for technical hackathon judges reviewing full-stack topology, latency metrics ($P95 < 1.8\text{s}$), and offline resiliency fallbacks.

---

## 🏛️ System Architecture

```
                          ┌─────────────────────────────────────┐
                          │    Next.js 14 Client Dashboard      │
                          │   (Tailwind CSS + Framer Motion)    │
                          └──────────────────┬──────────────────┘
                                             │
                       HTTP REST Requests    │   RFC 5545 Export
                     (Multipart Form / JSON) │   (.ics Calendar)
                                             ▼
                          ┌─────────────────────────────────────┐
                          │    Spring Boot 3.3.5 Backend        │
                          │   (Java 21 LTS · Port: 8080)        │
                          └──────┬───────────────────────┬──────┘
                                 │                       │
                 Streaming PDF   │                       │  Structured JSON
                 Byte Array      ▼                       ▼  Schema Calls
             ┌─────────────────────────┐     ┌─────────────────────────┐
             │   Apache PDFBox 3.x     │     │    Google Gemini API    │
             │   Positional Parser     │     │ (Generative Language)   │
             └───────────┬─────────────┘     └───────────┬─────────────┘
                         │                               │
                         └───────────────┬───────────────┘
                                         ▼
                         ┌───────────────────────────────┐
                         │   Deterministic Ingestion     │
                         │   & Cognitive Triage Engine   │
                         └───────────────────────────────┘
```

---

## 💻 Tech Stack

| Tier | Technologies / Libraries |
|---|---|
| **Frontend Framework** | **Next.js 14** (App Router), **React 18**, **TypeScript** |
| **Styling & Animation** | **Tailwind CSS**, **Framer Motion**, **Lucide React** |
| **Backend Framework** | **Spring Boot 3.3.5**, **Java 21 LTS**, **Maven** |
| **Document Ingestion** | **Apache PDFBox 3.0.4** (Streaming multipart PDF extractor) |
| **Artificial Intelligence** | **Google Gemini 1.5 Flash API** (Structured JSON Schemas) |
| **Calendar Engine** | Client-side **RFC 5545 iCalendar (.ics)** exporter |
| **Audio & Graphics** | Native **HTML5 Web Audio API**, zero-dependency **GPU Canvas Confetti** |
| **Persistence** | Hydration-safe **LocalStorage** with SSR synchronization gates |

---

## 🚀 Quickstart Guide

### Prerequisites
- **Node.js** 18.17+ or higher
- **Java Development Kit (JDK)** 21 LTS
- **Git**

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/syncup-ai.git
cd syncup-ai
```

---

### Step 2: Start the Spring Boot Backend (Port 8080)

```bash
# Windows
.\mvnw.cmd clean spring-boot:run

# macOS / Linux
./mvnw clean spring-boot:run
```

The backend server starts at: `http://localhost:8080`

> **Note on AI Keys:** By default, SyncUp AI includes deterministic fallback parsing so you can test the application without any API keys. If you wish to use live Google Gemini intelligence, set:
> ```bash
> # Windows PowerShell
> $env:GEMINI_API_KEY="your-gemini-api-key"
>
> # Linux / macOS
> export GEMINI_API_KEY="your-gemini-api-key"
> ```

---

### Step 3: Start the Next.js Frontend (Port 3000)

Open a second terminal window:

```bash
cd frontend

# Install dependencies (including framer-motion)
npm install

# Run development server
npm run dev
```

Open your browser at: **`http://localhost:3000`**

---

### Step 4: Verify the Production Build

To run the strict TypeScript and Next.js static site generation build check:

```bash
cd frontend
npm run build
```
Expected output:
```text
✓ Compiled successfully
✓ Linting and checking validity of types passed
✓ Generating static pages (4/4) completed
```

---

## 📡 API Reference

Base URL: `http://localhost:8080/api`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/syllabus/upload` | Ingests multipart `.pdf` file or raw text JSON. Returns extracted units and estimated study hours. |
| `POST` | `/schedule/generate` | Generates a daily spaced retention study roadmap with burnout risk ratings. |
| `POST` | `/schedule/rebalance` | Absorbs missed task IDs, skips exam dates, and redistributes sessions across remaining days. |
| `POST` | `/study/materials?topic={topic}` | Generates 3D flashcards and 3-question MCQ quiz with explanations for any topic. |

---

## 📂 Project Directory Structure

```text
├── pom.xml                               # Spring Boot Maven dependencies (PDFBox 3.x, WebFlux, Lombok)
├── src/main/java/com/syncup/backend/
│   ├── config/
│   │   └── WebConfig.java                # Global CORS filter (allows http://localhost:3000)
│   ├── controller/
│   │   └── SyncUpController.java         # REST endpoints for syllabus, schedules, rebalance, study
│   ├── dto/
│   │   ├── SyllabusUploadRequest.java    # Upload request data contract
│   │   ├── SyllabusUploadResponse.java   # Extracted topics & total hours
│   │   ├── ScheduleGenerateRequest.java  # Horizon & date constraints
│   │   ├── ScheduleResponse.java         # Daily study blocks & burnout risk
│   │   ├── RebalanceRequest.java         # Missed task IDs & remaining horizon
│   │   ├── RebalanceResponse.java        # Adjusted schedule & triage advice
│   │   └── StudyMaterialResponse.java    # Flashcards & MCQ quiz objects
│   └── service/
│       └── SyncUpService.java            # PDFBox parser, Gemini AI engine, and fallback matrix
├── src/main/resources/
│   └── application.properties            # Server port 8080, 10MB multipart limits, API key config
│
└── frontend/
    ├── package.json                      # Next.js 14, React 18, framer-motion, lucide-react
    ├── tailwind.config.js                # Obsidian dark palette, spring easings, glow drop-shadows
    ├── src/app/
    │   ├── globals.css                   # 48px grid background texture, 3D flip card classes
    │   ├── layout.tsx                    # Inter & JetBrains Mono font variables, dark theme meta
    │   └── page.tsx                      # Unified dashboard, live streak calculation, demo engine
    ├── src/components/
    │   ├── BurnoutMeter.tsx              # 240° SVG arc gauge needle & slide-down triage card
    │   ├── Timetable.tsx                 # Week-by-week study roadmap with filters & instant search
    │   ├── StudyDrawer.tsx               # 3D flip flashcards & 3-question MCQ quiz with confetti
    │   ├── PomodoroTimer.tsx             # Floating focus dock with circular SVG progress rings
    │   ├── SyllabusUploader.tsx          # Drag & drop PDF parser with Obsidian design language
    │   └── ArchitectureModal.tsx         # Full-stack 4-tier pipeline review for tech judges
    ├── src/lib/
    │   ├── api.ts                        # Typed backend fetch client with local fallback
    │   ├── ical.ts                       # RFC 5545 .ics generator (syncup-schedule.ics)
    │   └── confetti.ts                   # Zero-dependency GPU canvas confetti particle engine
    └── src/types/
        └── index.ts                      # Strict TypeScript DTO contracts mirroring Spring Boot
```

---

## 🎯 1-Minute Judge Demo Guide

To test SyncUp AI like a hackathon judge in under 60 seconds:

1. **Launch the Demo:** Click the glowing button **`⚡ Instant demo (VIT-AP CS)`** in the header.
2. **Observe the Roadmap:** Notice how 12 modules from *CSE3009 (NoSQL)* and *SWE2008 (OOAD)* are spaced across 28 days with **CAT-1 Exam Day** marked on Day 10.
3. **Check Off a Task:** Click the checkbox on any study session to see the completion animation and confetti particle burst.
4. **Trigger Active Recall:** Click **Recall** on any module to test the 3D flip flashcards and take the interactive MCQ quiz.
5. **Launch Focus Dock:** Click **Focus** to launch the floating Pomodoro timer with animated circular rings.
6. **Hit "I Fell Behind" (Hero Feature):** Click **"I Fell Behind"** in the timetable header. Watch the Burnout Meter dial recalculate, an amber pulse ripple across the roadmap, and a slide-down **Cognitive Triage Advice Card** appear protecting your CAT-1 trajectory.
7. **Inspect Architecture & Export:** Click **Architecture** in the navbar to inspect our 4-tier pipeline, then click **Export .ics** to download your calendar file.

---

## 👥 Team & Submission Info

- **Project:** SyncUp AI — Semester Copilot
- **Event:** GLITCHATHON 2026
- **License:** MIT License — Open source and available for educational empowerment.

import asyncio
import os
import subprocess
import edge_tts

AUDIO_DIR = "demo_assets/audio"
OUTPUT_DIR = "demo_output"
os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

VOICE = "en-US-ChristopherNeural"

SEGMENTS = [
    {
        "id": "seg1_intro",
        "text": "Hi judges. Every semester, university students face an exhausting problem: dense course syllabus PDFs with scattered topics and rigid exam schedules. When students fall behind, static calendars break, leading to guilt and severe burnout. Meet SyncUp AI: the intelligent, burnout-aware semester study copilot.",
        "pause_after": 1.0,
    },
    {
        "id": "seg2_demo",
        "text": "Instead of waiting for file uploads, our 1-Click Judge Demo instantly hydrates an official curriculum: CSE 3009 NoSQL Database Systems and SWE 2008 OOAD from VIT-AP University. In milliseconds, our Apache PDFBox and Google Gemini ingestion pipeline decomposes the syllabus into twelve structured modules, calculates safe daily study hours, and identifies a Day 10 CAT-1 exam sprint.",
        "pause_after": 1.5,
    },
    {
        "id": "seg3_pomodoro",
        "text": "Notice our live streak tracker in the navigation updating in real time. When a student checks off a task, particle confetti fires to reward cognitive momentum. For focused study, students can launch our integrated Pomodoro focus dock with mode-specific circular rings and Web Audio chimes, engineered to stay millisecond-accurate even when backgrounded in browser tabs.",
        "pause_after": 1.5,
    },
    {
        "id": "seg4_recall",
        "text": "Every module features on-demand active recall. Students can open the study drawer to flip 3D conceptual flashcards with smooth physics, reviewing key bullet points on the back. Then, they can test their mastery with interactive three-question quizzes that provide instant explanations for every option.",
        "pause_after": 1.5,
    },
    {
        "id": "seg5_rebalance",
        "text": "Now, here is our championship hero feature. When life happens and a student misses sessions, they don't have to quit. They simply click 'I Fell Behind'. Watch the Burnout Meter: an amber recalibration wave sweeps across the UI, absorbing the backlog hours without moving the exam date. Our cognitive triage advice card slides down, confirming that exam trajectory is completely protected.",
        "pause_after": 1.5,
    },
    {
        "id": "seg6_arch",
        "text": "SyncUp AI is powered by Next.js 14, Spring Boot 3 on Java 21, and Apache PDFBox 3.x, with a deterministic document scanner fallback that guarantees zero downtime. With one click, students can export their personalized schedule to Google Calendar, Apple Calendar, or Outlook using standard RFC 5545 iCalendar format.",
        "pause_after": 1.0,
    },
    {
        "id": "seg7_outro",
        "text": "SyncUp AI transforms stressful semester syllabi into sustainable, burnout-proof academic success. Thank you, judges!",
        "pause_after": 2.0,
    },
]

async def build_audio():
    print("Generating speech segments using edge-tts (Neural Studio Voice)...")
    durations = []
    
    # Generate 1s, 1.5s, 2s silence files (44.1kHz stereo)
    silence_1s = os.path.join(AUDIO_DIR, "silence_1s.mp3")
    silence_1_5s = os.path.join(AUDIO_DIR, "silence_1_5s.mp3")
    silence_2s = os.path.join(AUDIO_DIR, "silence_2s.mp3")
    
    subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-t", "1.0", "-q:a", "2", silence_1s], capture_output=True)
    subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-t", "1.5", "-q:a", "2", silence_1_5s], capture_output=True)
    subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-t", "2.0", "-q:a", "2", silence_2s], capture_output=True)

    concat_list_path = os.path.join(AUDIO_DIR, "concat_list.txt")
    with open(concat_list_path, "w", encoding="utf-8") as f:
        for i, seg in enumerate(SEGMENTS):
            raw_path = os.path.join(AUDIO_DIR, f"{seg['id']}_raw.mp3")
            norm_path = os.path.join(AUDIO_DIR, f"{seg['id']}.mp3")
            
            communicate = edge_tts.Communicate(seg["text"], VOICE, rate="+3%")
            await communicate.save(raw_path)
            
            # Normalize to 44.1kHz stereo mp3
            subprocess.run([
                "ffmpeg", "-y", "-i", raw_path,
                "-ar", "44100", "-ac", "2", "-b:a", "192k",
                norm_path
            ], capture_output=True, check=True)
            
            # Get duration of normalized segment
            res = subprocess.run([
                "ffprobe", "-v", "error", "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1", norm_path
            ], capture_output=True, text=True, check=True)
            dur = float(res.stdout.strip())
            durations.append(dur)
            print(f"  Segment {i+1} ({seg['id']}): {dur:.2f}s + {seg['pause_after']}s pause")
            
            p = os.path.abspath(norm_path).replace("\\", "/")
            f.write(f"file '{p}'\n")
            if seg["pause_after"] == 1.0:
                sil_p = os.path.abspath(silence_1s).replace("\\", "/")
            elif seg["pause_after"] == 1.5:
                sil_p = os.path.abspath(silence_1_5s).replace("\\", "/")
            else:
                sil_p = os.path.abspath(silence_2s).replace("\\", "/")
            f.write(f"file '{sil_p}'\n")

    full_audio_path = os.path.join(OUTPUT_DIR, "full_narration.mp3")
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", concat_list_path,
        "-ar", "44100", "-ac", "2", "-b:a", "192k",
        full_audio_path
    ], check=True)

    res = subprocess.run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", full_audio_path
    ], capture_output=True, text=True, check=True)
    total_audio_duration = float(res.stdout.strip())
    print(f"\nNarration track successfully created: {full_audio_path}")
    print(f"Total audio duration: {total_audio_duration:.2f} seconds ({int(total_audio_duration // 60)}m {int(total_audio_duration % 60)}s)")
    return durations, total_audio_duration

if __name__ == "__main__":
    asyncio.run(build_audio())

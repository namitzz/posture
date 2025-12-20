# GPT-Based Post-Set Coaching Feedback

## Overview

This feature provides AI-powered coaching feedback after each completed set of squats. It analyzes per-rep form data and generates natural language coaching summaries using OpenAI's GPT-3.5-turbo model.

## Features

### 1. Per-Rep Summary Generation

After each rep, the system automatically generates a human-readable summary including:
- **Depth quality**: Good / Shallow
- **Knee stability**: Stable / Caved in  
- **Chest angle**: Upright / Leaned forward

Example output:
```
- Rep 1: Depth good, knees stable, chest upright
- Rep 2: Depth shallow, knees caved in, chest upright
- Rep 3: Depth good, knees stable, chest leaned forward
- Rep 4: Good rep
- Rep 5: Depth good, knees stable, chest upright
```

### 2. GPT Coaching Summary

After completing a set, the AI coach generates 2-3 sentence coaching feedback based on the per-rep summaries.

### 3. Edge Case Handling

- **Less than 3 reps**: Returns "Do more reps to receive coaching"
- **API failure**: Returns "Couldn't get feedback. Try again later."
- **No API key**: Falls back to rule-based summary

## Usage

Set your OpenAI API key and run the application:

```bash
export OPENAI_API_KEY='your-api-key-here'
python src/main.py
```

Controls:
- **SPACE**: Start/Stop tracking
- **R**: Reset rep counter
- **P**: Play coaching summary via text-to-speech
- **Q**: Quit

## Testing

```bash
python examples/demo_gpt_coaching.py
python examples/test_edge_cases.py
python tests/test_gpt_coaching.py
```

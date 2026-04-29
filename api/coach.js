export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
    return;
  }

  const body = req.body || {};
  const { type, userName } = body;
  const nameCtx = userName ? `The user's name is ${userName}. Address them by name naturally.` : "";

  let prompt, maxTokens;

  if (type === "weekly_digest") {
    const w = body.weekData || {};
    maxTokens = 500;
    prompt = `You are postur, an expert AI squat form coach with a chill gen-z vibe. ${nameCtx} Give a weekly progress report.

This Week's Stats:
- Days Active: ${w.daysActive}/7
- Total Sets: ${w.totalSets}
- Total Reps: ${w.totalReps}
- Avg Score: ${w.avgScore}/100
- Best Score: ${w.bestScore}/100
- Current Streak: ${w.streak} days
- Score Progression: ${(w.scoreProgression || []).join(" → ")}
- Form Issues: ${w.issueBreakdown?.valgus || 0}% knee valgus, ${w.issueBreakdown?.lean || 0}% forward lean, ${w.issueBreakdown?.shallow || 0}% shallow depth

Give a weekly digest in this format:
1. One sentence overall week assessment
2. Highlights (2-3 bullet points of what went well)
3. Focus areas for next week (2-3 specific improvements)
4. One sentence motivation/encouragement

Keep it conversational and gen-z friendly. Under 200 words.`;
  } else {
    const { setData, avgScore, grade, reps, avgDepth, avgTempo } = body;
    if (!setData || !setData.length) {
      res.status(400).json({ error: "No set data provided" });
      return;
    }
    maxTokens = 300;
    const repBreakdown = setData.map((r, i) =>
      `Rep ${i + 1}: depth ${r.minAngle}°, score ${r.score}/100, tempo ${(r.tempoMs / 1000).toFixed(1)}s${r.hadValgus ? ", knee valgus" : ""}${r.hadLean ? ", forward lean" : ""}`
    ).join("\n");

    prompt = `You are postur, an expert AI squat form coach with a chill gen-z vibe. ${nameCtx} Analyze this set and give brief, actionable coaching feedback.

Set Summary:
- Reps: ${reps}
- Grade: ${grade}
- Avg Score: ${avgScore}/100
- Avg Depth: ${avgDepth}°
- Avg Tempo: ${avgTempo}s per rep

Rep Breakdown:
${repBreakdown}

Give coaching feedback in this format:
1. One sentence overall assessment
2. Top 2-3 specific things to improve (brief bullet points)
3. One thing they did well (encouragement)

Keep it conversational and gen-z friendly — use phrases like "no cap", "lowkey", "slay", "fire" naturally but don't overdo it. Under 120 words. Use "you" not "the lifter".`;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      res.status(response.status).json({ error: "Anthropic API error", details: err });
      return;
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "No feedback generated.";
    res.status(200).json({ feedback: text });
  } catch (err) {
    res.status(500).json({ error: "Failed to get coaching feedback", details: err.message });
  }
}

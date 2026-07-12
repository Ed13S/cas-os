async function askAI() {
  const prompt = document.getElementById("aiinput").value;

  // Hardcoded OpenRouter API key
  const key = "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";

  try {
    // OpenRouter completion endpoint
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + key,
        // OpenRouter strongly recommends including these headers for rankings/analytics
        "HTTP-Referer": window.location.origin || "http://localhost",
        "X-Title": "CAS_OS Calculator"
      },
      body: JSON.stringify({
        // 'openrouter/auto' routes to the best available free model automatically
        model: "openrouter/auto", 
        messages: [
          { role: "system", content: "You are CAS_OS, a math and science assistant." },
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await res.json();

    if (data.error) {
      throw new Error(data.error.message || "OpenRouter error");
    }

    document.getElementById("aiout").textContent =
      data.choices?.[0]?.message?.content || "CAS_OS AI error";

  } catch (e) {
    document.getElementById("aiout").textContent =
      "CAS_OS API error: " + e.message;
  }
}

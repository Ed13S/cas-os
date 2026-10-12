async function askAI() {
  const prompt = document.getElementById("aiinput").value;

  // Hardcoded OpenRouter API key
  const key = ""; // REDACTED - the original key was leaked in git history and must be revoked

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

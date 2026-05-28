async function askAI(){

  const key = document.getElementById("apikey").value;
  const prompt = document.getElementById("aiinput").value;

  // OFFLINE fallback
  if(!key){
    document.getElementById("aiout").textContent =
      "Offline Mode:\n- Use solve/diff/int\n- Or enter API key for AI tutor";
    return;
  }

  try{

    const res = await fetch("https://api.openai.com/v1/chat/completions",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer " + key
      },
      body:JSON.stringify({
        model:"gpt-4o-mini",
        messages:[
          {
            role:"system",
            content:"You are CAS OS FINAL EVOLUTION. Teach math step-by-step clearly."
          },
          {
            role:"user",
            content:prompt
          }
        ]
      })
    });

    const data = await res.json();

    document.getElementById("aiout").textContent =
      data.choices?.[0]?.message?.content || "AI error";

  }catch(e){
    document.getElementById("aiout").textContent =
      "API error: " + e.message;
  }
}

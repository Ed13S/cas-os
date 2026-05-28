async function askAI(){

  const prompt = document.getElementById("aiinput").value;

  if(!AI_KEY){
    document.getElementById("aiout").textContent =
      "No API key set in app.js";
    return;
  }

  try{

    const res = await fetch("https://api.openai.com/v1/chat/completions",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer " + AI_KEY
      },
      body:JSON.stringify({
        model:"gpt-4o-mini",
        messages:[
          {
            role:"system",
            content:"You are CAS OS. Explain math step-by-step clearly."
          },
          {role:"user",content:prompt}
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

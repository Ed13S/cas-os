async function askAI(){

  const prompt = document.getElementById("aiinput").value;
  const key = AI_KEY; // from app.js

  if(!key){
    document.getElementById("aiout").textContent =
      "No API key set. Add it in app.js line 6.";
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
            content:"You are CAS OS, a math tutor that explains step-by-step."
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

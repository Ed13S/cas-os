async function askAI(){

  const key=document.getElementById("apikey").value;
  const prompt=document.getElementById("aiinput").value;

  if(!key){
    document.getElementById("aiout").textContent =
      "CAS_OS AI: No API key provided.";
    return;
  }

  try{
    const res=await fetch("https://api.openai.com/v1/chat/completions",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer "+key
      },
      body:JSON.stringify({
        model:"gpt-4o-mini",
        messages:[
          {role:"system",content:"You are CAS_OS, a math and science assistant."},
          {role:"user",content:prompt}
        ]
      })
    });

    const data=await res.json();

    document.getElementById("aiout").textContent =
      data.choices?.[0]?.message?.content || "CAS_OS AI error";

  }catch(e){
    document.getElementById("aiout").textContent =
      "CAS_OS API error: "+e.message;
  }
}

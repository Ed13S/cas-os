function startVoice(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return alert("CAS_OS voice not supported");

  const rec=new SR();
  rec.lang="en-US";

  rec.onresult=(e)=>{
    const text=e.results[0][0].transcript;
    document.getElementById("input").value=text;
    run();
  };

  rec.start();
}

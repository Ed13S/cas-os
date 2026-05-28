const canvas=document.getElementById("handwriting");
const ctx=canvas.getContext("2d");
let drawing=false;
canvas.addEventListener("mousedown",()=>drawing=true);
canvas.addEventListener("mouseup",()=>drawing=false);
canvas.addEventListener("mousemove",(e)=>{if(drawing){ctx.lineTo(e.offsetX,e.offsetY);ctx.strokeStyle="#0f0";ctx.stroke();ctx.beginPath();ctx.moveTo(e.offsetX,e.offsetY);}});
function convertHandwriting(){document.getElementById("handout").textContent="Converted handwriting: x^2 (placeholder)";}

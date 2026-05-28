const canvas=document.getElementById("canvas");
const ctx=canvas.getContext("2d");

let drawing=false;

canvas.addEventListener("mousedown",(e)=>{
  drawing=true;
  ctx.beginPath();
  ctx.moveTo(e.offsetX,e.offsetY);
});

canvas.addEventListener("mouseup",()=>drawing=false);

canvas.addEventListener("mousemove",(e)=>{
  if(!drawing) return;
  ctx.lineWidth=2;
  ctx.strokeStyle="#00ff00";
  ctx.lineTo(e.offsetX,e.offsetY);
  ctx.stroke();
});

function clearCanvas(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
}

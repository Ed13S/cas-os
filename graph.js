function plot(expr){
  let x=[], y=[];
  for(let i=-50;i<=50;i++){
    x.push(i);
    try{y.push(math.evaluate(expr,{x:i}));}catch{y.push(null);}
  }
  Plotly.newPlot("graph",[{
    x,y,type:"scatter",line:{color:"#00ff88"}
  }],{paper_bgcolor:"#000", plot_bgcolor:"#000"});
}

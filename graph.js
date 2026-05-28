function plot(expr){
  let x=[], y=[];
  for(let i=-10;i<=10;i+=0.1){
    x.push(i);
    try{
      let val = math.evaluate(expr,{x:i});
      if(!isFinite(val) || Math.abs(val)>1e6) val=null;
      y.push(val);
    }catch{
      y.push(null);
    }
  }

  Plotly.newPlot("graph",[{
    x,y,type:"scatter",
    line:{color:"#00ff00"}
  }],{
    paper_bgcolor:"#000",
    plot_bgcolor:"#000"
  });
}

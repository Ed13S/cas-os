function plot(expr){

  let x=[], y=[];
  const min=-10, max=10, step=0.1;

  for(let i=min;i<=max;i+=step){
    x.push(i);

    try{
      let val = math.evaluate(expr,{x:i});

      if(!isFinite(val) || Math.abs(val)>1e6)
        val = null;

      y.push(val);

    }catch{
      y.push(null);
    }
  }

  Plotly.newPlot("graph",[{
    x,y,type:"scatter",
    line:{color:"#00ff88"}
  }],{
    paper_bgcolor:"#000",
    plot_bgcolor:"#000",
    xaxis:{range:[-10,10]},
    yaxis:{autorange:true}
  });
}

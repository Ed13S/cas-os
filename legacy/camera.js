async function readCamera(){
  const file=document.getElementById("cameraInput").files[0];
  if(!file) return;

  const img=await createImageBitmap(file);

  const worker=Tesseract.createWorker();

  await worker.load();
  await worker.loadLanguage("eng");
  await worker.initialize("eng");

  const { data:{text} } = await worker.recognize(img);

  await worker.terminate();

  document.getElementById("cameraOut").textContent=text;
  document.getElementById("input").value=text;
  run();
}

self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open("cas_os").then(cache=>{
      return cache.addAll([
        "./",
        "./index.html",
        "./app.js",
        "./cas-engine.js",
        "./steps.js",
        "./graph.js",
        "./physics.js",
        "./chemistry.js",
        "./handwriting.js",
        "./ai-mini.js",
        "./voice.js",
        "./camera.js",
        "./style.css"
      ]);
    })
  );
});

self.addEventListener("fetch", e=>{
  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request))
  );
});

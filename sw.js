self.addEventListener("install", e => {

  e.waitUntil(

    caches.open("cas-os").then(cache => {

      return cache.addAll([
        "./",
        "./index.html",
        "./style.css",
        "./app.js",
        "./cas-engine.js",
        "./steps.js",
        "./physics.js",
        "./chemistry.js",
        "./graph.js",
        "./handwriting.js",
        "./ai-mini.js"
      ]);

    })

  );

});

self.addEventListener("fetch", e => {

  e.respondWith(

    caches.match(e.request).then(r => r || fetch(e.request))

  );

});

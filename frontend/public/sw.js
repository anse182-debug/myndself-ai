self.addEventListener("install", () => {
  console.log("MyndSelf service worker installed.")
})

self.addEventListener("fetch", (e) => {
  e.respondWith(fetch(e.request))
})

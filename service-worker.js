if ("function" === typeof importScripts) {
    importScripts("/js/idb.js");
    importScripts("/js/dbhelper.js");
}
let CACHE_NAME = "restaurant-cache-v1";

let filesToCache = [
    "/",
    "/index.html",
    "/restaurant.html",
    "/js/main.js",
    "/js/restaurant_info.js",
    "/js/dbhelper.js",
    "/js/idb.js",
    "/js/lazyload.min.js",
    "/manifest.json",
    "/data/restaurants.json",
    "/css/styles.css",
    "https://unpkg.com/leaflet@1.3.1/dist/leaflet.css",
    "https://unpkg.com/leaflet@1.3.1/dist/leaflet.js",
    "/img/1.jpg",
    "/img/2.jpg",
    "/img/3.jpg",
    "/img/4.jpg",
    "/img/5.jpg",
    "/img/6.jpg",
    "/img/7.jpg",
    "/img/8.jpg",
    "/img/9.jpg",
    "/img/10.jpg",
    "/img/icon.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("Appshell caching started...");
            return cache.addAll(filesToCache);
        })
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(cacheName => {
                        return (
                            cacheName.startsWith("restaurant-cache-") &&
                            cacheName != CACHE_NAME
                        );
                    })
                    .map(cacheName => {
                        return caches.delete(cacheName);
                    })
            );
        })
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then(response => {
            if (response) {
                return response;
            }
            let fetchRequest = event.request.clone();

            return fetch(fetchRequest).then(response => {
                if (!response) return;

                let newResponse = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, newResponse);
                });

                return response;
            });
        })
    );
});

self.addEventListener("sync", event => {
    if (event.tag === "offline-reviews") {
        event.waitUntil(
            DBHelper.fetchDeferedReview()
                .then(reviews => {
                    reviews.forEach(review => {
                        let newReview = {
                            name: review.name,
                            rating: review.rating,
                            comments: review.comments,
                            restaurant_id: review.restaurant_id
                        };
                        DBHelper.saveReviewtoServer(
                            newReview,
                            (error, response) => {
                                if (error) {
                                    console.log(error);
                                }
                                console.log("Moved from deffered to reviews");
                                DBHelper.addNewReview(response); //add the response to IDB
                                DBHelper.deleteDeferedReview(review.id); //delete the added review from deferedStore
                            }
                        );
                    });
                })
                .catch(error => console.error(error))
        );
    }
});

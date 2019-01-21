/**
 * Common database helper functions.
 */

function serviceWorker() {
    if (!navigator.serviceWorker) return;
    navigator.serviceWorker
        .register("../service-worker.js")
        .then(reg => console.info("Service worker registered with state."))
        .catch(err =>
            console.error("Failed to register Service worker: ", err)
        );
}
const port = 1337;
class DBHelper {
    static get DATABASE_URL() {
        // const port = 1337; // Change this to your server port
        return `http://localhost:${port}/restaurants`;
    }
    static get REVIEWS_URL() {
        return `http://localhost:${port}/reviews`;
    }
    static openDatabase() {
        let indexDb = idb.open("restReviewAppDatabase", 1, upgradeDb => {
            const restaurantStore = upgradeDb.createObjectStore(
                "restaurantDB",
                {
                    keypath: "id"
                }
            );
            const reviewStore = upgradeDb.createObjectStore("reviewsDB", {
                keypath: "id"
            });
            const deferedReviewStore = upgradeDb.createObjectStore(
                "deferedReviewDB",
                {
                    keypath: "id"
                }
            );
            restaurantStore.createIndex("by-id", "id");
            reviewStore.createIndex("by-id", "id");
        });
        return indexDb;
    }
    static getRestaurantFromServer() {
        return fetch(DBHelper.DATABASE_URL)
            .then(response => {
                return response.json();
            })
            .then(restaurants => {
                DBHelper.saveRestaurantDataToIdb(restaurants);
                return restaurants;
            });
    }

    static fetchRestaurantReviews(id) {
        return fetch(`${DBHelper.REVIEWS_URL}/?restaurant_id=${id}`)
            .then(response => {
                return response.json();
            })
            .then(reviews => {
                DBHelper.saveReviewsToIdb(reviews);
                let allReviews = DBHelper.fetchStoredReviews();
                return allReviews;
            });
    }

    static saveRestaurantDataToIdb(restautantsData) {
        return DBHelper.openDatabase().then(database => {
            if (!database) return;
            const tx = database.transaction("restaurantDB", "readwrite");
            const store = tx.objectStore("restaurantDB");
            restautantsData.forEach(restaurant => {
                store.put(restaurant, restaurant.id);
            });
            return tx.complete;
        });
    }

    static saveReviewsToIdb(reviews) {
        return DBHelper.openDatabase().then(database => {
            if (!database) return;
            const tx = database.transaction("reviewsDB", "readwrite");
            const store = tx.objectStore("reviewsDB");
            reviews.forEach(review => {
                store.put(review, review.id);
            });
            return tx.complete;
        });
    }

    static fetchStoredRestaurants() {
        return DBHelper.openDatabase().then(database => {
            if (!database) return;
            let store = database
                .transaction("restaurantDB")
                .objectStore("restaurantDB");

            return store.getAll();
        });
    }
    static fetchStoredReviews() {
        return DBHelper.openDatabase().then(database => {
            if (!database) return;
            let store = database
                .transaction("reviewsDB")
                .objectStore("reviewsDB");

            return store.getAll();
        });
    }
    /*
     *  Add new Review to the review DB
     */
    static addNewReview(review) {
        return DBHelper.openDatabase().then(database => {
            if (!database) return;
            let transaction = database.transaction("reviewsDB", "readwrite");
            let store = transaction.objectStore("reviewsDB");
            store.put(review, review.id);
            return transaction.complete;
        });
    }

    static deleteDeferedReview(reviewId) {
        return DBHelper.openDatabase().then(database => {
            if (!database) return;
            let transaction = database.transaction(
                "deferedReviewDB",
                "readwrite"
            );
            let store = transaction.objectStore("deferedReviewDB");

            store.delete(reviewId);
            return transaction.complete;
        });
    }
    /*
     * save new reviews to the deferedDB and wait for network connection
     */
    static addDeferedToIDB(data) {
        return DBHelper.openDatabase().then(database => {
            if (!database) return;
            let transaction = database.transaction(
                "deferedReviewDB",
                "readwrite"
            );
            let store = transaction.objectStore("deferedReviewDB");

            store.put(data, data.id);
            return transaction.complete;
        });
    }
    /*
     * fetch deferedDB reviews
     */
    static fetchDeferedReview() {
        return DBHelper.openDatabase().then(database => {
            if (!database) return;
            let store = database
                .transaction("deferedReviewDB")
                .objectStore("deferedReviewDB");

            return store.getAll();
        });
    }

    /**
     * Fetch all restaurants.
     */
    static fetchRestaurants(callback) {
        return DBHelper.fetchStoredRestaurants()
            .then(restaurants => {
                if (!restaurants.length) {
                    return DBHelper.getRestaurantFromServer();
                }
                return Promise.resolve(restaurants);
            })
            .then(restaurants => {
                callback(null, restaurants);
            })
            .catch(err => {
                callback(err, null);
            });
    }

    /**
     * Fetch a restaurant by its ID.
     */
    static fetchRestaurantById(id, callback) {
        // fetch all restaurants with proper error handling.
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                const restaurant = restaurants.find(r => r.id == id);
                if (restaurant) {
                    // Got the restaurant
                    callback(null, restaurant);
                } else {
                    // Restaurant does not exist in the database
                    callback("Restaurant does not exist", null);
                }
            }
        });
    }

    /**
     * Fetch restaurants by a cuisine type with proper error handling.
     */
    static fetchRestaurantByCuisine(cuisine, callback) {
        // Fetch all restaurants  with proper error handling
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Filter restaurants to have only given cuisine type
                const results = restaurants.filter(
                    r => r.cuisine_type == cuisine
                );
                callback(null, results);
            }
        });
    }

    /**
     * Fetch restaurants by a neighborhood with proper error handling.
     */
    static fetchRestaurantByNeighborhood(neighborhood, callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Filter restaurants to have only given neighborhood
                const results = restaurants.filter(
                    r => r.neighborhood == neighborhood
                );
                callback(null, results);
            }
        });
    }

    /**
     * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
     */
    static fetchRestaurantByCuisineAndNeighborhood(
        cuisine,
        neighborhood,
        callback
    ) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                let results = restaurants;
                if (cuisine != "all") {
                    // filter by cuisine
                    results = results.filter(r => r.cuisine_type == cuisine);
                }
                if (neighborhood != "all") {
                    // filter by neighborhood
                    results = results.filter(
                        r => r.neighborhood == neighborhood
                    );
                }
                callback(null, results);
            }
        });
    }

    /**
     * Fetch all neighborhoods with proper error handling.
     */
    static fetchNeighborhoods(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all neighborhoods from all restaurants
                const neighborhoods = restaurants.map(
                    (v, i) => restaurants[i].neighborhood
                );
                // Remove duplicates from neighborhoods
                const uniqueNeighborhoods = neighborhoods.filter(
                    (v, i) => neighborhoods.indexOf(v) == i
                );
                callback(null, uniqueNeighborhoods);
            }
        });
    }

    /**
     * Fetch all cuisines with proper error handling.
     */
    static fetchCuisines(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all cuisines from all restaurants
                const cuisines = restaurants.map(
                    (v, i) => restaurants[i].cuisine_type
                );
                // Remove duplicates from cuisines
                const uniqueCuisines = cuisines.filter(
                    (v, i) => cuisines.indexOf(v) == i
                );
                callback(null, uniqueCuisines);
            }
        });
    }

    /**
     * Restaurant page URL.
     */
    static urlForRestaurant(restaurant) {
        return `./restaurant.html?id=${restaurant.id}`;
    }

    /**
     * Restaurant image URL.
     */
    static imageUrlForRestaurant(restaurant) {
        return `/img/${restaurant.photograph || restaurant.id}.jpg`;
    }

    /**
     * Map marker for a restaurant.
     */
    static mapMarkerForRestaurant(restaurant, map) {
        // https://leafletjs.com/reference-1.3.0.html#marker
        const marker = new L.marker(
            [restaurant.latlng.lat, restaurant.latlng.lng],
            {
                title: restaurant.name,
                alt: restaurant.name,
                url: DBHelper.urlForRestaurant(restaurant)
            }
        );
        marker.addTo(newMap);
        return marker;
    }
    static saveReviewtoServer(review, callback) {
        fetch(`${DBHelper.REVIEWS_URL}/`, {
            method: "POST",
            body: JSON.stringify(review),
            header: {
                "Content-Type": "application/json",
                Accept: "application/json"
            }
        })
            .then(res => res.json())
            .then(review => {
                callback(null, review);
            })
            .catch(error => {
                callback(error, null);
            });
    }

    static setFavouriteState(id, state) {
        return fetch(`${DBHelper.DATABASE_URL}/${id}/?is_favorite=${state}`, {
            method: "PUT"
        });
    }
}

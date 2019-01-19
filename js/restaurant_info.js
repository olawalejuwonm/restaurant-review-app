let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener("DOMContentLoaded", event => {
    initMap();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
    fetchRestaurantFromURL((error, restaurant) => {
        if (error) {
            // Got an error!
            console.error(error);
        } else {
            self.newMap = L.map("map", {
                center: [restaurant.latlng.lat, restaurant.latlng.lng],
                zoom: 16,
                scrollWheelZoom: false
            });
            L.tileLayer(
                "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}",
                {
                    mapboxToken:
                        "pk.eyJ1IjoiYXV3YWxtcyIsImEiOiJjamt2aGpiY3AwYnI0M2twY3Z3YTEwNm1sIn0.FFH2oLSABXxsKAtfOGLnng",
                    maxZoom: 18,
                    attribution:
                        'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
                        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
                    id: "mapbox.streets"
                }
            ).addTo(newMap);
            fillBreadcrumb();
            DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
        }
    });
};

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = callback => {
    if (self.restaurant) {
        // restaurant already fetched!
        callback(null, self.restaurant);
        return;
    }
    const id = getParameterByName("id");
    if (!id) {
        // no id found in URL
        error = "No restaurant id in URL";
        callback(error, null);
    } else {
        DBHelper.fetchRestaurantById(id, (error, restaurant) => {
            self.restaurant = restaurant;
            if (!restaurant) {
                console.error(error);
                return;
            }
            fillRestaurantHTML();
            callback(null, restaurant);
        });
    }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
    const name = document.getElementById("restaurant-name");
    name.innerHTML = restaurant.name;

    const address = document.getElementById("restaurant-address");
    address.innerHTML = restaurant.address;

    const image = document.getElementById("restaurant-img");
    image.className = "restaurant-img";
    image.src = DBHelper.imageUrlForRestaurant(restaurant);
    image.alt = `an image of ${restaurant.name} restaurant`;

    const cuisine = document.getElementById("restaurant-cuisine");
    cuisine.innerHTML = restaurant.cuisine_type;

    const favourite = document.getElementById("like");
    favourite.append(createFavButton());
    favButtonHandler();

    // fill operating hours
    if (restaurant.operating_hours) {
        fillRestaurantHoursHTML();
    }
    // fill reviews

    fillReviewsHTML();
};

createFavButton = () => {
    let favButton = document.createElement("button");
    favButton.setAttribute("class", "favourite");
    favButton.setAttribute("data-id", self.restaurant.id);
    favButton.setAttribute("data-favourite", false);
    favButton.innerHTML = "♡ Favourite";

    return favButton;
};

favButtonHandler = () => {
    const btn = document.querySelector(".favourite");
    btn.addEventListener("click", () => {
        if (btn.innerHTML == "♡ Favourite") {
            btn.innerHTML = "❤️ Favourite";
            btn.setAttribute("data-favourite", true);
            let restaurantState = btn.getAttribute("data-favourite");
            DBHelper.setFavouriteState(self.restaurant.id, restaurantState)
                .then(response => {
                    if (response.status === 200) {
                        flashSnackbar(`You just liked ${self.restaurant.name}`);
                    } else {
                        flashSnackbar("Something went wrong, try again later");
                    }
                })
                .catch(error => {
                    console.error(error);
                });
        } else {
            btn.innerHTML = "♡ Favourite";
            btn.setAttribute("data-favourite", false);
            let restaurantState = btn.getAttribute("data-favourite");
            DBHelper.setFavouriteState(self.restaurant.id, restaurantState)
                .then(response => {
                    if (response.status === 200) {
                        flashSnackbar(`You just liked ${self.restaurant.name}`);
                    } else {
                        console.log("Something went wrong");
                    }
                })
                .catch(error => {
                    console.error(error);
                });
        }
    });
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (
    operatingHours = self.restaurant.operating_hours
) => {
    const hours = document.getElementById("restaurant-hours");
    for (let key in operatingHours) {
        const row = document.createElement("tr");

        const day = document.createElement("td");
        day.innerHTML = key;
        row.appendChild(day);

        const time = document.createElement("td");
        time.innerHTML = operatingHours[key];
        row.appendChild(time);

        hours.appendChild(row);
    }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = () => {
    const container = document.getElementById("reviews-container");
    const title = document.createElement("h3");
    title.innerHTML = "Reviews";
    container.appendChild(title);
    DBHelper.fetchRestaurantReviews(self.restaurant.id)
        .then(reviews => {
            console.log(reviews);
            if (!reviews) {
                const noReviews = document.createElement("p");
                noReviews.innerHTML = "No reviews yet!";
                container.appendChild(noReviews);
                const reviewForm = createReviewForm();
                container.appendChild(reviewForm);
                return;
            }
            const ul = document.getElementById("reviews-list");
            reviews.forEach(review => {
                if (review.restaurant_id === self.restaurant.id) {
                    ul.appendChild(createReviewHTML(review));
                    container.appendChild(ul);
                }
            });

            const reviewForm = createReviewForm();
            container.appendChild(reviewForm);
            submitReview();
        })
        .catch(error => {
            console.log(error);
        });
};

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = review => {
    const reviewHeader = document.createElement("div");
    const li = document.createElement("li");
    reviewHeader.setAttribute("class", "review-header");
    const name = document.createElement("span");
    reviewHeader.setAttribute("class", "review-header");
    name.innerHTML = review.name;
    name.setAttribute("class", "reviewer");
    reviewHeader.appendChild(name);

    const date = document.createElement("span");
    date.innerHTML = new Date(review.updatedAt).toLocaleDateString();
    date.setAttribute("class", "review-date");
    reviewHeader.appendChild(date);
    li.appendChild(reviewHeader);

    const reviewBody = document.createElement("div");
    const rating = document.createElement("span");
    reviewBody.setAttribute("class", "review-body");
    rating.innerHTML = `Rating: ${review.rating}`;
    rating.setAttribute("class", "review-rating");
    reviewBody.appendChild(rating);
    li.appendChild(reviewBody);

    const comments = document.createElement("p");
    comments.innerHTML = review.comments;
    reviewBody.appendChild(comments);
    li.appendChild(reviewBody);

    return li;
};
/**
 * update reviews list
 */
updateReviewsHTML = review => {
    const ul = document.querySelector("#reviews-list");

    ul.appendChild(createReviewHTML(review));
};

flashSnackbar = message => {
    let snackbar = document.querySelector("#snackbar");
    snackbar.classList.add("show");
    snackbar.innerHTML = message;

    setTimeout(() => snackbar.classList.remove("show"), 5000);
};
/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
    const breadcrumb = document.getElementById("breadcrumb");
    const li = document.createElement("li");
    li.innerHTML = restaurant.name;
    breadcrumb.appendChild(li);
};

createReviewForm = () => {
    const reviewForm = document.createElement("form");
    reviewForm.setAttribute("class", "reviews-form");

    const reviewFormTitle = document.createElement("h3");
    reviewFormTitle.innerHTML = "Add a review";

    reviewForm.append(reviewFormTitle);

    const nameField = createNameInputHTML();
    const ratingField = createRatingInputHTML();
    const commentField = createCommentInputHTML();
    const submitBTN = createSubmitButtonHTML();

    reviewForm.appendChild(nameField);
    reviewForm.appendChild(ratingField);
    reviewForm.appendChild(commentField);
    reviewForm.appendChild(submitBTN);

    return reviewForm;
};

/**
 * create name input
 */
createNameInputHTML = () => {
    const nameLabel = document.createElement("label");
    nameLabel.innerHTML = "Name: ";
    const nameInput = document.createElement("input");
    nameInput.setAttribute("type", "text");
    nameInput.setAttribute("class", "reviewerName");
    nameLabel.appendChild(nameInput);

    return nameLabel;
};
/**
 * create rating input
 */
createRatingInputHTML = () => {
    const ratingLabel = document.createElement("label");
    ratingLabel.innerHTML = "Rating: ";
    const ratingInput = document.createElement("input");
    ratingInput.setAttribute("type", "number");
    ratingInput.setAttribute("min", "1");
    ratingInput.setAttribute("max", "5");
    ratingInput.setAttribute("class", "rating");
    ratingLabel.appendChild(ratingInput);

    return ratingLabel;
};

/**
 * create comment box
 */
createCommentInputHTML = () => {
    const commentLabel = document.createElement("label");
    commentLabel.innerHTML = "Comment: ";
    const commentBox = document.createElement("textarea");
    commentBox.setAttribute("class", "comment");
    commentLabel.appendChild(commentBox);

    return commentLabel;
};

createSubmitButtonHTML = () => {
    const submitBtn = document.createElement("button");
    submitBtn.setAttribute("class", "submit-review");
    submitBtn.setAttribute("type", "submit");
    submitBtn.innerHTML = "Submit Review";

    return submitBtn;
};

/**
 * Review Form Handler
 */
submitReview = () => {
    const reviewForm = document.querySelector("form");
    const reviewer = document.querySelector(".reviewerName");
    const reviewRating = document.querySelector(".rating");
    const reviewComment = document.querySelector(".comment");

    reviewForm.addEventListener("submit", event => {
        event.preventDefault();
        if (!reviewer.value || !reviewRating.value || !reviewComment.value) {
            alert("Please fill in all fields");
            return;
        }
        const review = {
            name: reviewer.value,
            rating: reviewRating.value,
            comments: reviewComment.value,
            restaurant_id: self.restaurant.id
        };

        if ("serviceWorker" in navigator && "SyncManager" in window) {
            if (navigator.onLine) {
                DBHelper.saveReviewtoServer(review, (error, response) => {
                    if (error) {
                        console.log(error);
                    }
                    flashSnackbar("Review Added Successfully");
                    DBHelper.addNewReview(response); //add the response to IDB
                    updateReviewsHTML(response); //update the view
                });
                reviewer.value = "";
                reviewRating.value = "";
                reviewComment.value = "";
            } else {
                console.log("You are offline but we've got you covered");
                navigator.serviceWorker.ready
                    .then(worker => {
                        const date = new Date().toISOString();
                        review.id = date;
                        review.createdAt = date;
                        review.updatedAt = date;
                        DBHelper.addDeferedToIDB(review)
                            .then(() => {
                                worker.sync.register("offline-reviews");
                            })
                            .then(() => {
                                flashSnackbar(
                                    "Review will be submitted when you have a network connection"
                                );
                                updateReviewsHTML(review); //update the view
                                reviewer.value = "";
                                reviewRating.value = "";
                                reviewComment.value = "";
                            })
                            .catch(error => console.error(error));
                    })
                    .catch(error => console.error(error));
            }
        } else {
            console.log(
                "Your browser does not support offline submission of comment"
            );
            if (navigator.onLine) {
                DBHelper.saveReviewtoServer(review, (error, response) => {
                    if (error) {
                        console.log(error);
                    }
                    console.log("Submited Successfully");
                    DBHelper.addNewReview(response); //add the response to IDB
                    updateReviewsHTML(response); //update the view
                });
                reviewer.value = "";
                reviewRating.value = "";
                reviewComment.value = "";
            } else {
                flashSnackbar("You cannot submit review while offline");
            }
        }
    });
};

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return "";
    return decodeURIComponent(results[2].replace(/\+/g, " "));
};

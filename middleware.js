const Listing = require("./models/listing");
const Review = require("./models/Review");

module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "You must be logged in to continue.");
    return res.redirect("/login");
  }
  next();
};

module.exports.isOwner = async (req, res, next) => {
  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    req.flash("error", "That property does not exist.");
    return res.redirect("/home");
  }

  if (!listing.owner.equals(req.user._id)) {
    req.flash("error", "You do not have permission to do that.");
    return res.redirect(`/home/${listing._id}`);
  }

  req.listing = listing;
  next();
};

module.exports.isReviewAuthor = async (req, res, next) => {
  const review = await Review.findById(req.params.reviewId);

  if (!review) {
    req.flash("error", "That review does not exist.");
    return res.redirect(`/home/${req.params.id}`);
  }

  if (!review.author.equals(req.user._id)) {
    req.flash("error", "You can only delete your own reviews.");
    return res.redirect(`/home/${req.params.id}`);
  }

  next();
};

module.exports.validateListing = (req, res, next) => {
  const { title, description, price, image, location, country } = req.body.place || {};

  if (!title || !description || price === undefined || !location || !country) {
    req.flash("error", "Title, description, price, location and country are required.");
    return res.redirect(req.path.includes("/edit") ? "back" : "/newplace");
  }

  if (Number(price) < 0) {
    req.flash("error", "Price cannot be negative.");
    return res.redirect(req.path.includes("/edit") ? "back" : "/newplace");
  }

  next();
};

module.exports.validateReview = (req, res, next) => {
  const { rating, comment } = req.body.review || {};

  if (!rating || !comment || Number(rating) < 1 || Number(rating) > 5) {
    req.flash("error", "Please provide a rating from 1 to 5 and a comment.");
    return res.redirect(`/home/${req.params.id}`);
  }

  next();
};

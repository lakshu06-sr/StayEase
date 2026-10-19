const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");

const Listing = require("./models/listing");
const Review = require("./models/Review");
const User = require("./models/user");
const wrapAsync = require("./utils/wrapAsync");
const ExpressErr = require("./utils/ExpressErr");
const { isLoggedIn, isOwner, isReviewAuthor, validateListing, validateReview } = require("./middleware");

const app = express();
const PORT = process.env.PORT || 8080;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/StayEase";
const SESSION_SECRET = process.env.SESSION_SECRET || "stayease-development-secret";

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true
    }
  })
);
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currentUser = req.user || null;
  next();
});

// Home
app.get("/", (req, res) => {
  res.redirect("/home");
});

app.get(
  "/home",
  wrapAsync(async (req, res) => {
    const listings = await Listing.find({}).populate("owner");
    res.render("home", { listings });
  })
);

// Create
app.get("/newplace", isLoggedIn, (req, res) => {
  res.render("newplace");
});

app.post(
  "/newplace",
  isLoggedIn,
  validateListing,
  wrapAsync(async (req, res) => {
    const listing = new Listing(req.body.place);
    listing.owner = req.user._id;
    await listing.save();

    req.flash("success", "New property listed successfully.");
    res.redirect(`/home/${listing._id}`);
  })
);

// Show
app.get(
  "/home/:id",
  wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id)
      .populate("owner")
      .populate({
        path: "reviews",
        populate: { path: "author" }
      });

    if (!listing) {
      req.flash("error", "That property does not exist.");
      return res.redirect("/home");
    }

    res.render("show", { listing });
  })
);

// Edit
app.get(
  "/home/:id/edit",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      req.flash("error", "That property does not exist.");
      return res.redirect("/home");
    }

    if (!listing.owner.equals(req.user._id)) {
      req.flash("error", "You can only edit your own properties.");
      return res.redirect(`/home/${listing._id}`);
    }

    res.render("edit", { listing });
  })
);

app.patch(
  "/home/:id/edit",
  isLoggedIn,
  validateListing,
  wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      req.flash("error", "That property does not exist.");
      return res.redirect("/home");
    }

    if (!listing.owner.equals(req.user._id)) {
      req.flash("error", "You can only edit your own properties.");
      return res.redirect(`/home/${listing._id}`);
    }

    Object.assign(listing, req.body.place);
    await listing.save();

    req.flash("success", "Property updated successfully.");
    res.redirect(`/home/${listing._id}`);
  })
);

// Delete
app.delete(
  "/home/:id",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      req.flash("error", "That property does not exist.");
      return res.redirect("/home");
    }

    if (!listing.owner.equals(req.user._id)) {
      req.flash("error", "You can only delete your own properties.");
      return res.redirect(`/home/${listing._id}`);
    }

    await Listing.findByIdAndDelete(listing._id);
    await Review.deleteMany({ _id: { $in: listing.reviews } });

    req.flash("success", "Property deleted successfully.");
    res.redirect("/home");
  })
);

// Reviews
app.post(
  "/home/:id/reviews",
  isLoggedIn,
  validateReview,
  wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      req.flash("error", "That property does not exist.");
      return res.redirect("/home");
    }

    const review = new Review(req.body.review);
    review.author = req.user._id;

    listing.reviews.push(review);
    await review.save();
    await listing.save();

    req.flash("success", "Review added successfully.");
    res.redirect(`/home/${listing._id}`);
  })
);

app.delete(
  "/home/:id/reviews/:reviewId",
  isLoggedIn,
  isReviewAuthor,
  wrapAsync(async (req, res) => {
    const { id, reviewId } = req.params;

    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);

    req.flash("success", "Review deleted successfully.");
    res.redirect(`/home/${id}`);
  })
);

// Auth
app.get("/signup", (req, res) => {
  res.render("users/signup");
});

app.post(
  "/signup",
  wrapAsync(async (req, res, next) => {
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        req.flash("error", "Username, email and password are required.");
        return res.redirect("/signup");
      }

      const existingUser = await User.findOne({
        $or: [{ username }, { email: email.toLowerCase() }]
      });

      if (existingUser) {
        req.flash("error", "A user with that username or email already exists.");
        return res.redirect("/signup");
      }

      const user = new User({
        username,
        email: email.toLowerCase()
      });

      const registeredUser = await User.register(user, password);

      req.login(registeredUser, (err) => {
        if (err) return next(err);
        req.flash("success", "Welcome to StayEase!");
        res.redirect("/home");
      });
    } catch (err) {
      req.flash("error", err.message);
      res.redirect("/signup");
    }
  })
);

app.get("/login", (req, res) => {
  res.render("users/login");
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: "Invalid username or password."
  }),
  (req, res) => {
    req.flash("success", "Welcome back to StayEase!");
    res.redirect("/home");
  }
);

app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash("success", "You have been logged out.");
    res.redirect("/home");
  });
});

// 404
app.use((req, res, next) => {
  next(new ExpressErr(404, "Page not found."));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || "Something went wrong.";
  res.status(status).render("error", { status, message });
});

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`StayEase is running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

startServer();

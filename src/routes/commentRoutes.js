const express = require("express");
const router = express.Router();
const isAuth = require("../middleware/isAuth");
const isAdmin = require("../middleware/isAdmin");

const {
  getCommentsByVideoId,
  addComment,
  likeComment,
  dislikeComment,
  deleteComment,
} = require("../controllers/commentController");

router.get("/video/:videoId", getCommentsByVideoId);

router.post("/", isAuth, addComment);

router.post("/like/:commentId", isAuth, likeComment);

router.post("/dislike/:commentId", isAuth, dislikeComment);

router.delete("/:commentId", isAuth, deleteComment);

module.exports = router;
const { validationResult } = require("express-validator");
const Comment = require("../models/Comment");
const Post = require("../models/Post");
const asyncHandler = require("../middlewares/async");

// @desc    Get comments for a post
// @route   GET /api/posts/:postId/comments
// @access  Public
const getComments = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Verify post exists
  const post = await Post.findById(req.params.postId);
  if (!post) {
    return res.status(404).json({
      success: false,
      message: `Post not found with id of ${req.params.postId}`,
    });
  }

  // Build query
  let query = {
    post: req.params.postId,
    parentComment: null, // Only get top-level comments
    isActive: true,
  };

  // Filter by status for admin/editor
  if (req.user && (req.user.role === "admin" || req.user.role === "editor")) {
    if (req.query.status) {
      query.status = req.query.status;
    }
  } else {
    // For public access, only show approved comments
    query.status = "approved";
  }

  const total = await Comment.countDocuments(query);

  const comments = await Comment.find(query)
    .populate("author", "name avatar")
    .populate({
      path: "replies",
      populate: {
        path: "author",
        select: "name avatar",
      },
      match: { isActive: true, status: "approved" },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const pages = Math.ceil(total / limit);

  res.status(200).json({
    success: true,
    count: comments.length,
    pagination: {
      page,
      limit,
      pages,
      total,
    },
    data: comments,
  });
});

// @desc    Get single comment
// @route   GET /api/comments/:id
// @access  Public
const getComment = asyncHandler(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id)
    .populate("author", "name avatar")
    .populate("post", "title slug")
    .populate({
      path: "replies",
      populate: {
        path: "author",
        select: "name avatar",
      },
      match: { isActive: true, status: "approved" },
    });

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: `Comment not found with id of ${req.params.id}`,
    });
  }

  res.status(200).json({
    success: true,
    data: comment,
  });
});

// @desc    Create comment
// @route   POST /api/posts/:postId/comments
// @access  Private
const createComment = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation errors",
      errors: errors.array(),
    });
  }

  // Verify post exists and is published
  const post = await Post.findOne({
    _id: req.params.postId,
    status: "published",
    isActive: true,
  });

  if (!post) {
    return res.status(404).json({
      success: false,
      message: `Published post not found with id of ${req.params.postId}`,
    });
  }

  // Verify parent comment exists if provided
  if (req.body.parentComment) {
    const parentComment = await Comment.findOne({
      _id: req.body.parentComment,
      post: req.params.postId,
      isActive: true,
    });

    if (!parentComment) {
      return res.status(400).json({
        success: false,
        message: "Invalid parent comment ID",
      });
    }
  }

  // Create comment
  const commentData = {
    ...req.body,
    author: req.user._id,
    post: req.params.postId,
  };

  const comment = await Comment.create(commentData);

  const populatedComment = await Comment.findById(comment._id)
    .populate("author", "name avatar")
    .populate("post", "title slug");

  res.status(201).json({
    success: true,
    message: "Comment created successfully",
    data: populatedComment,
  });
});

// @desc    Update comment
// @route   PUT /api/comments/:id
// @access  Private/Owner/Admin/Editor
const updateComment = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation errors",
      errors: errors.array(),
    });
  }

  let comment = await Comment.findById(req.params.id);

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: `Comment not found with id of ${req.params.id}`,
    });
  }

  // Check ownership or admin/editor role
  if (
    comment.author.toString() !== req.user._id.toString() &&
    req.user.role !== "admin" &&
    req.user.role !== "editor"
  ) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this comment",
    });
  }

  // Only allow content updates for regular users
  const updateData = { content: req.body.content };

  // Admin/Editor can update status
  if (req.user.role === "admin" || req.user.role === "editor") {
    if (req.body.status) {
      updateData.status = req.body.status;
    }
  }

  comment = await Comment.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate("author", "name avatar")
    .populate("post", "title slug");

  res.status(200).json({
    success: true,
    message: "Comment updated successfully",
    data: comment,
  });
});

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private/Owner/Admin
const deleteComment = asyncHandler(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: `Comment not found with id of ${req.params.id}`,
    });
  }

  // Check ownership or admin role
  if (
    comment.author.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this comment",
    });
  }

  // Delete replies first
  await Comment.deleteMany({ parentComment: comment._id });

  // Delete the comment
  await Comment.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Comment deleted successfully",
  });
});

// @desc    Like/Unlike comment
// @route   PUT /api/comments/:id/like
// @access  Private
const toggleLikeComment = asyncHandler(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: `Comment not found with id of ${req.params.id}`,
    });
  }

  const isLiked = comment.likes.includes(req.user._id);

  if (isLiked) {
    // Unlike the comment
    comment.likes.pull(req.user._id);
  } else {
    // Like the comment
    comment.likes.push(req.user._id);
  }

  await comment.save();

  res.status(200).json({
    success: true,
    message: isLiked
      ? "Comment unliked successfully"
      : "Comment liked successfully",
    data: {
      likes: comment.likes.length,
      isLiked: !isLiked,
    },
  });
});

// @desc    Moderate comment (approve/reject)
// @route   PUT /api/comments/:id/moderate
// @access  Private/Admin/Editor
const moderateComment = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status must be either approved or rejected",
    });
  }

  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: `Comment not found with id of ${req.params.id}`,
    });
  }

  comment.status = status;
  await comment.save();

  res.status(200).json({
    success: true,
    message: `Comment ${status} successfully`,
    data: comment,
  });
});

// @desc    Get all comments (admin/editor)
// @route   GET /api/comments
// @access  Private/Admin/Editor
const getAllComments = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  // Build query
  let query = {};

  // Filter by status
  if (req.query.status) {
    query.status = req.query.status;
  }

  // Filter by post
  if (req.query.post) {
    query.post = req.query.post;
  }

  // Filter by author
  if (req.query.author) {
    query.author = req.query.author;
  }

  // Search in content
  if (req.query.search) {
    query.content = { $regex: req.query.search, $options: "i" };
  }

  const total = await Comment.countDocuments(query);

  const comments = await Comment.find(query)
    .populate("author", "name email avatar")
    .populate("post", "title slug")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const pages = Math.ceil(total / limit);

  res.status(200).json({
    success: true,
    count: comments.length,
    pagination: {
      page,
      limit,
      pages,
      total,
    },
    data: comments,
  });
});

module.exports = {
  getComments,
  getComment,
  createComment,
  updateComment,
  deleteComment,
  toggleLikeComment,
  moderateComment,
  getAllComments,
};

const { validationResult } = require("express-validator");
const Post = require("../models/Post");
const Category = require("../models/Category");
const Tag = require("../models/Tag");
const asyncHandler = require("../middlewares/async");

// @desc    Get all posts
// @route   GET /api/posts
// @access  Public
const getPosts = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Build query
  let query = {};

  // For public access, only show published and active posts
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "editor")) {
    query.status = "published";
    query.isActive = true;
  } else {
    // For admin/editor, allow filtering by status
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === "true";
    }
  }

  // Filter by category
  if (req.query.category) {
    query.category = req.query.category;
  }

  // Filter by tags
  if (req.query.tags) {
    const tagIds = req.query.tags.split(",");
    query.tags = { $in: tagIds };
  }

  // Filter by author
  if (req.query.author) {
    query.author = req.query.author;
  }

  // Search functionality
  if (req.query.search) {
    query.$text = { $search: req.query.search };
  }

  // Date range filtering
  if (req.query.startDate || req.query.endDate) {
    query.publishedAt = {};
    if (req.query.startDate) {
      query.publishedAt.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      query.publishedAt.$lte = new Date(req.query.endDate);
    }
  }

  const total = await Post.countDocuments(query);

  // Sort options
  let sortOption = { publishedAt: -1 }; // Default: newest first
  if (req.query.sort) {
    switch (req.query.sort) {
      case "oldest":
        sortOption = { publishedAt: 1 };
        break;
      case "popular":
        sortOption = { views: -1 };
        break;
      case "liked":
        sortOption = { likes: -1 };
        break;
      case "title":
        sortOption = { title: 1 };
        break;
      default:
        sortOption = { publishedAt: -1 };
    }
  }

  const posts = await Post.find(query)
    .populate("author", "name email avatar")
    .populate("category", "name slug color")
    .populate("tags", "name slug color")
    .sort(sortOption)
    .skip(skip)
    .limit(limit)
    .select("-content"); // Exclude full content in list view

  const pages = Math.ceil(total / limit);

  res.status(200).json({
    success: true,
    count: posts.length,
    pagination: {
      page,
      limit,
      pages,
      total,
    },
    data: posts,
  });
});

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Public
const getPost = asyncHandler(async (req, res, next) => {
  let query = { _id: req.params.id };

  // For public access, only show published and active posts
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "editor")) {
    query.status = "published";
    query.isActive = true;
  }

  const post = await Post.findOne(query)
    .populate("author", "name email avatar bio")
    .populate("category", "name slug color description")
    .populate("tags", "name slug color")
    .populate("likes", "name avatar");

  if (!post) {
    return res.status(404).json({
      success: false,
      message: `Post not found with id of ${req.params.id}`,
    });
  }

  // Increment view count if it's a public request
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "editor")) {
    await Post.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
  }

  res.status(200).json({
    success: true,
    data: post,
  });
});

// @desc    Create post
// @route   POST /api/posts
// @access  Private/Admin/Editor
const createPost = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation errors",
      errors: errors.array(),
    });
  }

  // Verify category exists
  const category = await Category.findById(req.body.category);
  if (!category) {
    return res.status(400).json({
      success: false,
      message: "Invalid category ID",
    });
  }

  // Verify tags exist if provided
  if (req.body.tags && req.body.tags.length > 0) {
    const existingTags = await Tag.find({ _id: { $in: req.body.tags } });
    if (existingTags.length !== req.body.tags.length) {
      return res.status(400).json({
        success: false,
        message: "One or more tag IDs are invalid",
      });
    }
  }

  // Add author to post data
  req.body.author = req.user._id;

  const post = await Post.create(req.body);

  const populatedPost = await Post.findById(post._id)
    .populate("author", "name email avatar")
    .populate("category", "name slug color")
    .populate("tags", "name slug color");

  res.status(201).json({
    success: true,
    message: "Post created successfully",
    data: populatedPost,
  });
});

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private/Admin/Editor/Owner
const updatePost = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation errors",
      errors: errors.array(),
    });
  }

  let post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({
      success: false,
      message: `Post not found with id of ${req.params.id}`,
    });
  }

  // Check ownership or admin/editor role
  if (
    post.author.toString() !== req.user._id.toString() &&
    req.user.role !== "admin" &&
    req.user.role !== "editor"
  ) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this post",
    });
  }

  // Verify category exists if being updated
  if (req.body.category) {
    const category = await Category.findById(req.body.category);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }
  }

  // Verify tags exist if being updated
  if (req.body.tags && req.body.tags.length > 0) {
    const existingTags = await Tag.find({ _id: { $in: req.body.tags } });
    if (existingTags.length !== req.body.tags.length) {
      return res.status(400).json({
        success: false,
        message: "One or more tag IDs are invalid",
      });
    }
  }

  post = await Post.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate("author", "name email avatar")
    .populate("category", "name slug color")
    .populate("tags", "name slug color");

  res.status(200).json({
    success: true,
    message: "Post updated successfully",
    data: post,
  });
});

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private/Admin/Owner
const deletePost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({
      success: false,
      message: `Post not found with id of ${req.params.id}`,
    });
  }

  // Check ownership or admin role
  if (
    post.author.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this post",
    });
  }

  await Post.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Post deleted successfully",
  });
});

// @desc    Like/Unlike post
// @route   PUT /api/posts/:id/like
// @access  Private
const toggleLikePost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json({
      success: false,
      message: `Post not found with id of ${req.params.id}`,
    });
  }

  const isLiked = post.likes.includes(req.user._id);

  if (isLiked) {
    // Unlike the post
    post.likes.pull(req.user._id);
  } else {
    // Like the post
    post.likes.push(req.user._id);
  }

  await post.save();

  res.status(200).json({
    success: true,
    message: isLiked ? "Post unliked successfully" : "Post liked successfully",
    data: {
      likes: post.likes.length,
      isLiked: !isLiked,
    },
  });
});

// @desc    Get post stats
// @route   GET /api/posts/stats
// @access  Private/Admin/Editor
const getPostStats = asyncHandler(async (req, res, next) => {
  const stats = await Post.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalViews: { $sum: "$views" },
        totalLikes: { $sum: { $size: "$likes" } },
      },
    },
  ]);

  const categoryStats = await Post.aggregate([
    { $match: { status: "published", isActive: true } },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryInfo",
      },
    },
    { $unwind: "$categoryInfo" },
    {
      $group: {
        _id: "$category",
        name: { $first: "$categoryInfo.name" },
        count: { $sum: 1 },
        totalViews: { $sum: "$views" },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const recentPosts = await Post.find({ status: "published", isActive: true })
    .populate("author", "name")
    .populate("category", "name")
    .sort({ publishedAt: -1 })
    .limit(5)
    .select("title views likes publishedAt");

  res.status(200).json({
    success: true,
    data: {
      statusStats: stats,
      categoryStats,
      recentPosts,
    },
  });
});

// @desc    Get related posts
// @route   GET /api/posts/:id/related
// @access  Public
const getRelatedPosts = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id).select("category tags");

  if (!post) {
    return res.status(404).json({
      success: false,
      message: `Post not found with id of ${req.params.id}`,
    });
  }

  const limit = parseInt(req.query.limit, 10) || 5;

  // Find posts with same category or tags
  const relatedPosts = await Post.find({
    _id: { $ne: req.params.id },
    status: "published",
    isActive: true,
    $or: [{ category: post.category }, { tags: { $in: post.tags } }],
  })
    .populate("author", "name avatar")
    .populate("category", "name slug color")
    .populate("tags", "name slug color")
    .sort({ publishedAt: -1 })
    .limit(limit)
    .select("-content");

  res.status(200).json({
    success: true,
    data: relatedPosts,
  });
});

module.exports = {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  toggleLikePost,
  getPostStats,
  getRelatedPosts,
};

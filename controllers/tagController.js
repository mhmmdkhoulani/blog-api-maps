const { validationResult } = require("express-validator");
const Tag = require("../models/Tag");
const Post = require("../models/Post");
const asyncHandler = require("../middlewares/async");

// @desc    Get all tags
// @route   GET /api/tags
// @access  Public
const getTags = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  // Build query
  let query = {};

  // Filter by active status
  if (req.query.isActive !== undefined) {
    query.isActive = req.query.isActive === "true";
  } else {
    // By default, only show active tags for public access
    query.isActive = true;
  }

  // Search by name
  if (req.query.search) {
    query.name = { $regex: req.query.search, $options: "i" };
  }

  const total = await Tag.countDocuments(query);
  const tags = await Tag.find(query).sort({ name: 1 }).skip(skip).limit(limit);

  const pages = Math.ceil(total / limit);

  res.status(200).json({
    success: true,
    count: tags.length,
    pagination: {
      page,
      limit,
      pages,
      total,
    },
    data: tags,
  });
});

// @desc    Get single tag
// @route   GET /api/tags/:id
// @access  Public
const getTag = asyncHandler(async (req, res, next) => {
  const tag = await Tag.findById(req.params.id);

  if (!tag) {
    return res.status(404).json({
      success: false,
      message: `Tag not found with id of ${req.params.id}`,
    });
  }

  // Count posts with this tag
  const postCount = await Post.countDocuments({
    tags: tag._id,
    status: "published",
    isActive: true,
  });

  res.status(200).json({
    success: true,
    data: {
      ...tag.toObject(),
      postCount,
    },
  });
});

// @desc    Create tag
// @route   POST /api/tags
// @access  Private/Admin/Editor
const createTag = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation errors",
      errors: errors.array(),
    });
  }

  // Check if tag exists
  const existingTag = await Tag.findOne({
    name: { $regex: new RegExp(`^${req.body.name}$`, "i") },
  });

  if (existingTag) {
    return res.status(400).json({
      success: false,
      message: "Tag already exists with this name",
    });
  }

  const tag = await Tag.create(req.body);

  res.status(201).json({
    success: true,
    message: "Tag created successfully",
    data: tag,
  });
});

// @desc    Update tag
// @route   PUT /api/tags/:id
// @access  Private/Admin/Editor
const updateTag = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation errors",
      errors: errors.array(),
    });
  }

  let tag = await Tag.findById(req.params.id);

  if (!tag) {
    return res.status(404).json({
      success: false,
      message: `Tag not found with id of ${req.params.id}`,
    });
  }

  // Check if name is being changed and if it already exists
  if (req.body.name && req.body.name.toLowerCase() !== tag.name.toLowerCase()) {
    const existingTag = await Tag.findOne({
      name: { $regex: new RegExp(`^${req.body.name}$`, "i") },
    });

    if (existingTag) {
      return res.status(400).json({
        success: false,
        message: "Tag already exists with this name",
      });
    }
  }

  tag = await Tag.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Tag updated successfully",
    data: tag,
  });
});

// @desc    Delete tag
// @route   DELETE /api/tags/:id
// @access  Private/Admin
const deleteTag = asyncHandler(async (req, res, next) => {
  const tag = await Tag.findById(req.params.id);

  if (!tag) {
    return res.status(404).json({
      success: false,
      message: `Tag not found with id of ${req.params.id}`,
    });
  }

  // Check if tag is being used by any posts
  const postsUsingTag = await Post.countDocuments({ tags: tag._id });

  if (postsUsingTag > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete tag. It is being used by ${postsUsingTag} post(s)`,
    });
  }

  await Tag.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Tag deleted successfully",
  });
});

// @desc    Get tag stats
// @route   GET /api/tags/stats
// @access  Private/Admin/Editor
const getTagStats = asyncHandler(async (req, res, next) => {
  const stats = await Tag.aggregate([
    {
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "tags",
        as: "posts",
      },
    },
    {
      $addFields: {
        postCount: { $size: "$posts" },
        publishedPostCount: {
          $size: {
            $filter: {
              input: "$posts",
              cond: { $eq: ["$$this.status", "published"] },
            },
          },
        },
      },
    },
    {
      $project: {
        name: 1,
        slug: 1,
        color: 1,
        isActive: 1,
        postCount: 1,
        publishedPostCount: 1,
        createdAt: 1,
      },
    },
    {
      $sort: { publishedPostCount: -1 },
    },
  ]);

  res.status(200).json({
    success: true,
    data: stats,
  });
});

// @desc    Get popular tags
// @route   GET /api/tags/popular
// @access  Public
const getPopularTags = asyncHandler(async (req, res, next) => {
  const limit = parseInt(req.query.limit, 10) || 10;

  const popularTags = await Tag.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "tags",
        as: "posts",
      },
    },
    {
      $addFields: {
        publishedPostCount: {
          $size: {
            $filter: {
              input: "$posts",
              cond: {
                $and: [
                  { $eq: ["$$this.status", "published"] },
                  { $eq: ["$$this.isActive", true] },
                ],
              },
            },
          },
        },
      },
    },
    {
      $match: { publishedPostCount: { $gt: 0 } },
    },
    {
      $project: {
        name: 1,
        slug: 1,
        color: 1,
        publishedPostCount: 1,
      },
    },
    {
      $sort: { publishedPostCount: -1 },
    },
    {
      $limit: limit,
    },
  ]);

  res.status(200).json({
    success: true,
    data: popularTags,
  });
});

module.exports = {
  getTags,
  getTag,
  createTag,
  updateTag,
  deleteTag,
  getTagStats,
  getPopularTags,
};

const { validationResult } = require("express-validator");
const Category = require("../models/Category");
const Post = require("../models/Post");
const asyncHandler = require("../middlewares/async");

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  // Build query
  let query = {};

  // Filter by active status
  if (req.query.isActive !== undefined) {
    query.isActive = req.query.isActive === "true";
  } else {
    // By default, only show active categories for public access
    query.isActive = true;
  }

  // Search by name
  if (req.query.search) {
    query.name = { $regex: req.query.search, $options: "i" };
  }

  const total = await Category.countDocuments(query);
  const categories = await Category.find(query)
    .sort({ name: 1 })
    .skip(skip)
    .limit(limit);

  const pages = Math.ceil(total / limit);

  res.status(200).json({
    success: true,
    count: categories.length,
    pagination: {
      page,
      limit,
      pages,
      total,
    },
    data: categories,
  });
});

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
const getCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: `Category not found with id of ${req.params.id}`,
    });
  }

  // Count posts in this category
  const postCount = await Post.countDocuments({
    category: category._id,
    status: "published",
    isActive: true,
  });

  res.status(200).json({
    success: true,
    data: {
      ...category.toObject(),
      postCount,
    },
  });
});

// @desc    Create category
// @route   POST /api/categories
// @access  Private/Admin/Editor
const createCategory = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation errors",
      errors: errors.array(),
    });
  }

  // Check if category exists
  const existingCategory = await Category.findOne({
    name: { $regex: new RegExp(`^${req.body.name}$`, "i") },
  });

  if (existingCategory) {
    return res.status(400).json({
      success: false,
      message: "Category already exists with this name",
    });
  }

  const category = await Category.create(req.body);

  res.status(201).json({
    success: true,
    message: "Category created successfully",
    data: category,
  });
});

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin/Editor
const updateCategory = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation errors",
      errors: errors.array(),
    });
  }

  let category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: `Category not found with id of ${req.params.id}`,
    });
  }

  // Check if name is being changed and if it already exists
  if (
    req.body.name &&
    req.body.name.toLowerCase() !== category.name.toLowerCase()
  ) {
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${req.body.name}$`, "i") },
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category already exists with this name",
      });
    }
  }

  category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Category updated successfully",
    data: category,
  });
});

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: `Category not found with id of ${req.params.id}`,
    });
  }

  // Check if category is being used by any posts
  const postsUsingCategory = await Post.countDocuments({
    category: category._id,
  });

  if (postsUsingCategory > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete category. It is being used by ${postsUsingCategory} post(s)`,
    });
  }

  await Category.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Category deleted successfully",
  });
});

// @desc    Get category stats
// @route   GET /api/categories/stats
// @access  Private/Admin/Editor
const getCategoryStats = asyncHandler(async (req, res, next) => {
  const stats = await Category.aggregate([
    {
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "category",
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
        description: 1,
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

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
};

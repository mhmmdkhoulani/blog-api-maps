const express = require("express");
const {
  getTags,
  getTag,
  createTag,
  updateTag,
  deleteTag,
  getTagStats,
  getPopularTags,
} = require("../controllers/tagController");
const {
  createTagValidation,
  updateTagValidation,
} = require("../middlewares/validation");
const { protect, authorize } = require("../middlewares/auth");

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Tag:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the tag
 *         name:
 *           type: string
 *           description: The tag name
 *         slug:
 *           type: string
 *           description: URL-friendly version of the name
 *         color:
 *           type: string
 *           description: Hex color code for the tag
 *         isActive:
 *           type: boolean
 *           description: Whether the tag is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/tags:
 *   get:
 *     summary: Get all tags
 *     tags: [Tags]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of tags per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search tags by name
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Tags retrieved successfully
 *   post:
 *     summary: Create a new tag
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 30
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-F]{6}$'
 *     responses:
 *       201:
 *         description: Tag created successfully
 *       400:
 *         description: Validation error or tag already exists
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Admin/Editor access required
 */
router
  .route("/")
  .get(getTags)
  .post(protect, authorize("admin", "editor"), createTagValidation, createTag);

/**
 * @swagger
 * /api/tags/popular:
 *   get:
 *     summary: Get popular tags
 *     tags: [Tags]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *         description: Number of popular tags to return
 *     responses:
 *       200:
 *         description: Popular tags retrieved successfully
 */
router.get("/popular", getPopularTags);

/**
 * @swagger
 * /api/tags/stats:
 *   get:
 *     summary: Get tag statistics
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tag statistics retrieved successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Admin/Editor access required
 */
router.get("/stats", protect, authorize("admin", "editor"), getTagStats);

/**
 * @swagger
 * /api/tags/{id}:
 *   get:
 *     summary: Get tag by ID
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag ID
 *     responses:
 *       200:
 *         description: Tag retrieved successfully
 *       404:
 *         description: Tag not found
 *   put:
 *     summary: Update tag
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 30
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-F]{6}$'
 *     responses:
 *       200:
 *         description: Tag updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Admin/Editor access required
 *       404:
 *         description: Tag not found
 *   delete:
 *     summary: Delete tag
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag ID
 *     responses:
 *       200:
 *         description: Tag deleted successfully
 *       400:
 *         description: Tag is being used by posts
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Tag not found
 */
router
  .route("/:id")
  .get(getTag)
  .put(protect, authorize("admin", "editor"), updateTagValidation, updateTag)
  .delete(protect, authorize("admin"), deleteTag);

module.exports = router;

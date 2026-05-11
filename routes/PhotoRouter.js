const express = require("express");
const path = require("path");
const multer = require("multer");
const mongoose = require("mongoose");
const Photo = require("../db/photoModel");
const User = require("../db/userModel");
const router = express.Router();

const imagesDir = path.join(__dirname, "..", "images");

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, imagesDir);
	},
	filename: (req, file, cb) => {
		const ext = path.extname(file.originalname || "");
		const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
		cb(null, uniqueName);
	},
});

const upload = multer({ storage });

router.get("/photosOfUser/:id", async (request, response) => {
	const { id } = request.params;
	if (!mongoose.Types.ObjectId.isValid(id)) {
		return response.status(400).json({ message: "Invalid user id" });
	}

	try {
		const owner = await User.findById(id, "_id").lean();
		if (!owner) {
			return response.status(400).json({ message: "User not found" });
		}

		const photos = await Photo.find(
			{ user_id: id },
			"_id user_id comments file_name date_time",
		).lean();

		const commenterIds = [
			...new Set(
				photos
					.flatMap((photo) => photo.comments || [])
					.map((comment) => comment.user_id?.toString())
					.filter(Boolean),
			),
		];

		const commenters = commenterIds.length
			? await User.find(
					{ _id: { $in: commenterIds } },
					"_id first_name last_name",
				).lean()
			: [];

		const userMap = new Map(commenters.map((user) => [user._id.toString(), user]));

		const responseData = photos.map((photo) => ({
			_id: photo._id,
			user_id: photo.user_id,
			file_name: photo.file_name,
			date_time: photo.date_time,
			comments: (photo.comments || []).map((comment) => ({
				_id: comment._id,
				comment: comment.comment,
				date_time: comment.date_time,
				user:
					userMap.get(comment.user_id?.toString()) ||
					({ _id: comment.user_id, first_name: "Unknown", last_name: "User" }),
			})),
		}));

		return response.status(200).json(responseData);
	} catch (error) {
		return response.status(500).json({ message: "Failed to fetch photos" });
	}
});

router.post("/commentsOfPhoto/:photo_id", async (request, response) => {
	const { photo_id } = request.params;
	const { comment } = request.body || {};

	if (!mongoose.Types.ObjectId.isValid(photo_id)) {
		return response.status(400).json({ message: "Invalid photo id" });
	}

	if (!comment || !comment.trim()) {
		return response.status(400).json({ message: "Comment cannot be empty" });
	}

	try {
		const photo = await Photo.findById(photo_id);
		if (!photo) {
			return response.status(400).json({ message: "Photo not found" });
		}

		photo.comments.push({
			comment: comment.trim(),
			user_id: request.session.userId,
			date_time: new Date(),
		});

		await photo.save();
		return response.status(200).json({ message: "Comment added" });
	} catch (error) {
		return response.status(500).json({ message: "Failed to add comment" });
	}
});

router.post("/photos/new", upload.any(), async (request, response) => {
	const [uploadedFile] = request.files || [];

	if (!uploadedFile) {
		return response.status(400).json({ message: "No file uploaded" });
	}

	try {
		const photo = await Photo.create({
			file_name: uploadedFile.filename,
			user_id: request.session.userId,
			date_time: new Date(),
			comments: [],
		});

		return response.status(200).json({
			_id: photo._id,
			file_name: photo.file_name,
			date_time: photo.date_time,
		});
	} catch (error) {
		return response.status(500).json({ message: "Failed to upload photo" });
	}
});

module.exports = router;

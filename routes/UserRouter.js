const express = require("express");
const mongoose = require("mongoose");
const User = require("../db/userModel");
const Photo = require("../db/photoModel");
const router = express.Router();

router.get("/list", async (request, response) => {
	try {
		const users = await User.find({}, "_id first_name last_name").lean();
		return response.status(200).json(users);
	} catch (error) {
		return response.status(500).json({ message: "Failed to fetch user list" });
	}
});

router.get("/stats/list", async (request, response) => {
	try {
		const users = await User.find({}, "_id first_name last_name").lean();
		const photos = await Photo.find({}, "user_id comments.user_id").lean();

		const photoCountMap = new Map();
		const commentCountMap = new Map();

		photos.forEach((photo) => {
			const ownerId = photo.user_id?.toString();
			if (ownerId) {
				photoCountMap.set(ownerId, (photoCountMap.get(ownerId) || 0) + 1);
			}

			(photo.comments || []).forEach((comment) => {
				const commenterId = comment.user_id?.toString();
				if (commenterId) {
					commentCountMap.set(commenterId, (commentCountMap.get(commenterId) || 0) + 1);
				}
			});
		});

		const stats = users.map((user) => ({
			_id: user._id,
			photoCount: photoCountMap.get(user._id.toString()) || 0,
			commentCount: commentCountMap.get(user._id.toString()) || 0,
		}));

		return response.status(200).json(stats);
	} catch (error) {
		return response.status(500).json({ message: "Failed to fetch user stats" });
	}
});

router.get("/:id/comments", async (request, response) => {
	const { id } = request.params;
	if (!mongoose.Types.ObjectId.isValid(id)) {
		return response.status(400).json({ message: "Invalid user id" });
	}

	try {
		const user = await User.findById(id, "_id").lean();
		if (!user) {
			return response.status(400).json({ message: "User not found" });
		}

		const photos = await Photo.find(
			{ "comments.user_id": id },
			"_id user_id file_name comments",
		).lean();

		const comments = [];
		photos.forEach((photo) => {
			(photo.comments || []).forEach((comment) => {
				if (comment.user_id?.toString() === id) {
					comments.push({
						_id: comment._id,
						comment: comment.comment,
						date_time: comment.date_time,
						photo_id: photo._id,
						photo_user_id: photo.user_id,
						file_name: photo.file_name,
					});
				}
			});
		});

		comments.sort((a, b) => new Date(b.date_time) - new Date(a.date_time));
		return response.status(200).json(comments);
	} catch (error) {
		return response.status(500).json({ message: "Failed to fetch user comments" });
	}
});

router.get("/:id", async (request, response) => {
	const { id } = request.params;
	if (!mongoose.Types.ObjectId.isValid(id)) {
		return response.status(400).json({ message: "Invalid user id" });
	}

	try {
		const user = await User.findById(
			id,
			"_id first_name last_name location description occupation",
		).lean();

		if (!user) {
			return response.status(400).json({ message: "User not found" });
		}

		return response.status(200).json(user);
	} catch (error) {
		return response.status(500).json({ message: "Failed to fetch user detail" });
	}
});

module.exports = router;
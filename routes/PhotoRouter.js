const express = require("express");
const mongoose = require("mongoose");
const Photo = require("../db/photoModel");
const User = require("../db/userModel");
const router = express.Router();

router.get("/:id", async (request, response) => {
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

module.exports = router;

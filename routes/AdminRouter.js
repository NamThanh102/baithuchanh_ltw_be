const express = require("express");
const User = require("../db/userModel");

const router = express.Router();

router.get("/me", async (request, response) => {
	if (!request.session || !request.session.userId) {
		return response.status(401).json({ message: "Not logged in" });
	}

	try {
		const user = await User.findById(
			request.session.userId,
			"_id login_name first_name last_name",
		).lean();

		if (!user) {
			return response.status(401).json({ message: "Not logged in" });
		}

		return response.status(200).json(user);
	} catch (error) {
		return response.status(500).json({ message: "Failed to fetch current user" });
	}
});

router.post("/login", async (request, response) => {
	const { login_name, password } = request.body || {};

	if (!login_name || !password) {
		return response.status(400).json({ message: "Missing login credentials" });
	}

	try {
		const user = await User.findOne({ login_name }).lean();
		if (!user || user.password !== password) {
			return response.status(400).json({ message: "Invalid login" });
		}

		request.session.userId = user._id.toString();
		request.session.login_name = user.login_name;

		return response.status(200).json({
			_id: user._id,
			login_name: user.login_name,
			first_name: user.first_name,
			last_name: user.last_name,
		});
	} catch (error) {
		return response.status(500).json({ message: "Login failed" });
	}
});

router.post("/logout", (request, response) => {
	if (!request.session || !request.session.userId) {
		return response.status(400).json({ message: "Not logged in" });
	}

	request.session.destroy((err) => {
		if (err) {
			return response.status(500).json({ message: "Logout failed" });
		}
		return response.status(200).json({ message: "Logged out" });
	});
});

module.exports = router;

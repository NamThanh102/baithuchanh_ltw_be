const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../db/userModel");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "photo-sharing-jwt-secret";

router.get("/me", async (request, response) => {
	const token = request.headers.authorization?.split(" ")[1];
	if (!token) {
		return response.status(401).json({ message: "Not logged in" });
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		const user = await User.findById(
			decoded.userId,
			"_id login_name first_name last_name",
		).lean();

		if (!user) {
			return response.status(401).json({ message: "Not logged in" });
		}

		return response.status(200).json(user);
	} catch (error) {
		return response.status(401).json({ message: "Invalid token" });
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

		const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: "24h" });

		return response.status(200).json({
			token,
			user: {
				_id: user._id,
				login_name: user.login_name,
				first_name: user.first_name,
				last_name: user.last_name,
			},
		});
	} catch (error) {
		return response.status(500).json({ message: "Login failed" });
	}
});

router.post("/logout", (request, response) => {
	// JWT logout is stateless - just return success
	return response.status(200).json({ message: "Logged out" });
});

module.exports = router;

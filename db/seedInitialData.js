const models = require("../modelData/models.js");
const User = require("./userModel.js");
const Photo = require("./photoModel.js");

function buildLoginName(firstName, lastName) {
  return `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z0-9.]/g, "");
}

async function seedInitialData() {
  const sampleUsers = models.userListModel();
  const samplePhotos = sampleUsers.flatMap((user) => models.photoOfUserModel(user._id));

  const userIdMap = new Map();

  for (const sampleUser of sampleUsers) {
    const existingUser = await User.findOne({
      first_name: sampleUser.first_name,
      last_name: sampleUser.last_name,
    });

    if (existingUser) {
      if (!existingUser.login_name) {
        existingUser.login_name = buildLoginName(sampleUser.first_name, sampleUser.last_name);
      }
      if (!existingUser.password) {
        existingUser.password = "password";
      }
      await existingUser.save();
      userIdMap.set(sampleUser._id, existingUser._id);
      continue;
    }

    const createdUser = await User.create({
      login_name: buildLoginName(sampleUser.first_name, sampleUser.last_name),
      password: "password",
      first_name: sampleUser.first_name,
      last_name: sampleUser.last_name,
      location: sampleUser.location,
      description: sampleUser.description,
      occupation: sampleUser.occupation,
    });

    userIdMap.set(sampleUser._id, createdUser._id);
  }

  for (const samplePhoto of samplePhotos) {
    const ownerId = userIdMap.get(samplePhoto.user_id);
    if (!ownerId) {
      continue;
    }

    const existingPhoto = await Photo.findOne({
      file_name: samplePhoto.file_name,
      user_id: ownerId,
    });

    if (existingPhoto) {
      continue;
    }

    const photoDoc = await Photo.create({
      file_name: samplePhoto.file_name,
      date_time: samplePhoto.date_time,
      user_id: ownerId,
      comments: [],
    });

    for (const sampleComment of samplePhoto.comments || []) {
      const commenterId = userIdMap.get(sampleComment.user._id);
      if (!commenterId) {
        continue;
      }

      photoDoc.comments.push({
        comment: sampleComment.comment,
        date_time: sampleComment.date_time,
        user_id: commenterId,
      });
    }

    await photoDoc.save();
  }
}

module.exports = seedInitialData;
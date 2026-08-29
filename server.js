const db = require("./database");
const express = require("express");
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = 3000;

console.log("THIS IS MY CONNECTLY SERVER");

app.use(express.json());
app.use(express.static("public"));

// ===============================
// IMAGE UPLOAD
// ===============================

const storage = multer.diskStorage({
    destination: "public/uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

// ===============================
// GET POSTS + LIKES + COMMENTS
// ===============================

app.get("/api/posts", (req, res) => {

    db.all(`
        SELECT posts.*,
               COUNT(DISTINCT likes.id) AS likeCount
        FROM posts
        LEFT JOIN likes ON posts.id = likes.post_id
        GROUP BY posts.id
        ORDER BY posts.id DESC
    `, [], (err, rows) => {

        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Failed to fetch posts"
            });
        }

        if (rows.length === 0) {
            return res.json([]);
        }

        let completed = 0;

        rows.forEach(post => {

            db.all(`
                SELECT id, comment, user_id
                FROM comments
                WHERE post_id = ?
                ORDER BY id ASC
            `, [post.id], (commentErr, comments) => {

                if (commentErr) {
                    console.error(commentErr);
                    return res.status(500).json({
                        error: "Failed to fetch comments"
                    });
                }

                post.comments = comments;
                completed++;

                if (completed === rows.length) {
                    res.json(rows);
                }
            });
        });
    });
});

// ===============================
// CREATE POST
// ===============================

app.post("/api/posts", upload.single("image"), (req, res) => {

    const text = req.body.text || "";
    const image = req.file
        ? "/uploads/" + req.file.filename
        : "";

    db.run(
        `INSERT INTO posts (user_id, text, image)
         VALUES (?, ?, ?)`,
        [1, text, image],
        function(err) {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Failed to save post"
                });
            }

            res.json({
                id: this.lastID,
                user_id: 1,
                text: text,
                image: image,
                likeCount: 0,
                comments: []
            });
        }
    );
});

// ===============================
// LIKE / UNLIKE
// ===============================

app.post("/api/posts/:id/like", (req, res) => {

    const postId = req.params.id;
    const userId = 1;

    db.get(
        `SELECT * FROM likes
         WHERE post_id = ? AND user_id = ?`,
        [postId, userId],
        (err, row) => {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Database error"
                });
            }

            if (row) {

                db.run(
                    `DELETE FROM likes
                     WHERE post_id = ? AND user_id = ?`,
                    [postId, userId],
                    err => {

                        if (err) {
                            return res.status(500).json({
                                error: "Failed to unlike"
                            });
                        }

                        res.json({
                            liked: false
                        });
                    }
                );

            } else {

                db.run(
                    `INSERT INTO likes (post_id, user_id)
                     VALUES (?, ?)`,
                    [postId, userId],
                    err => {

                        if (err) {
                            console.error(err);
                            return res.status(500).json({
                                error: "Failed to like"
                            });
                        }

                        res.json({
                            liked: true
                        });
                    }
                );
            }
        }
    );
});

// ===============================
// ADD COMMENT
// ===============================

app.post("/api/posts/:id/comments", (req, res) => {

    const postId = req.params.id;
    const userId = 1;
    const comment = (req.body.comment || "").trim();

    if (!comment) {
        return res.status(400).json({
            error: "Comment cannot be empty"
        });
    }

    db.run(
        `INSERT INTO comments
         (post_id, user_id, comment)
         VALUES (?, ?, ?)`,
        [postId, userId, comment],
        function(err) {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Failed to save comment"
                });
            }

            res.json({
                id: this.lastID,
                user_id: userId,
                comment: comment
            });
        }
    );
});

// ===============================
// DELETE POST
// ===============================

app.delete("/api/posts/:id", (req, res) => {

    const postId = req.params.id;

    db.run(
        `DELETE FROM comments WHERE post_id = ?`,
        [postId],
        err => {

            if (err) {
                return res.status(500).json({
                    error: "Failed to delete comments"
                });
            }

            db.run(
                `DELETE FROM likes WHERE post_id = ?`,
                [postId],
                err => {

                    if (err) {
                        return res.status(500).json({
                            error: "Failed to delete likes"
                        });
                    }

                    db.run(
                        `DELETE FROM posts WHERE id = ?`,
                        [postId],
                        function(err) {

                            if (err) {
                                return res.status(500).json({
                                    error: "Failed to delete post"
                                });
                            }

                            res.json({
                                success: true
                            });
                        }
                    );
                }
            );
        }
    );
});

// ===============================
// FOLLOW / UNFOLLOW
// ===============================

const currentUserId = 1;
const profileUserId = 2;

// Get follow status
app.get("/api/follow", (req, res) => {

    db.run(
        `INSERT OR IGNORE INTO users
         (id, username, bio)
         VALUES (?, ?, ?)`,
        [profileUserId, "Connectly User", ""],
        err => {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Failed to create profile user"
                });
            }

            db.get(
                `SELECT * FROM followers
                 WHERE follower_id = ?
                 AND following_id = ?`,
                [currentUserId, profileUserId],
                (err, row) => {

                    if (err) {
                        console.error(err);
                        return res.status(500).json({
                            error: "Database error"
                        });
                    }

                    db.get(
                        `SELECT COUNT(*) AS count
                         FROM followers
                         WHERE following_id = ?`,
                        [profileUserId],
                        (err, followerRow) => {

                            if (err) {
                                return res.status(500).json({
                                    error: "Failed to get followers"
                                });
                            }

                            db.get(
                                `SELECT COUNT(*) AS count
                                 FROM followers
                                 WHERE follower_id = ?`,
                                [currentUserId],
                                (err, followingRow) => {

                                    if (err) {
                                        return res.status(500).json({
                                            error: "Failed to get following"
                                        });
                                    }

                                    res.json({
                                        isFollowing: !!row,
                                        followers: followerRow.count,
                                        following: followingRow.count
                                    });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

// Follow / Unfollow
app.post("/api/follow", (req, res) => {

    db.get(
        `SELECT * FROM followers
         WHERE follower_id = ?
         AND following_id = ?`,
        [currentUserId, profileUserId],
        (err, row) => {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Database error"
                });
            }

            if (row) {

                // UNFOLLOW
                db.run(
                    `DELETE FROM followers
                     WHERE follower_id = ?
                     AND following_id = ?`,
                    [currentUserId, profileUserId],
                    err => {

                        if (err) {
                            console.error(err);
                            return res.status(500).json({
                                error: "Failed to unfollow"
                            });
                        }

                        res.json({
                            following: false
                        });
                    }
                );

            } else {

                // FOLLOW
                db.run(
                    `INSERT INTO followers
                     (follower_id, following_id)
                     VALUES (?, ?)`,
                    [currentUserId, profileUserId],
                    err => {

                        if (err) {
                            console.error(err);
                            return res.status(500).json({
                                error: "Failed to follow"
                            });
                        }

                        res.json({
                            following: true
                        });
                    }
                );
            }
        }
    );
});

// ===============================
// START SERVER
// ===============================
// ===============================
// PROFILE
// ===============================

const profileId = 1;
db.run(
    `INSERT OR IGNORE INTO users
     (id, username, bio, profile_image)
     VALUES (?, ?, ?, ?)`,
    [profileId, "Almas", "Welcome to my Connectly profile! 👋", ""],
    (err) => {
        if (err) {
            console.error("Profile user error:", err);
        }
    }
);


// GET PROFILE
app.get("/api/profile", (req, res) => {

    db.get(
        `SELECT id, username, bio, profile_image
         FROM users
         WHERE id = ?`,
        [profileId],
        (err, user) => {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Failed to load profile"
                });
            }

            if (!user) {
                return res.status(404).json({
                    error: "Profile not found"
                });
            }

            res.json(user);
        }
    );
});


// UPDATE PROFILE
app.put("/api/profile", (req, res) => {

    const username = (req.body.username || "").trim();
    const bio = (req.body.bio || "").trim();

    if (!username) {
        return res.status(400).json({
            error: "Username cannot be empty"
        });
    }

    db.run(
        `UPDATE users
         SET username = ?, bio = ?
         WHERE id = ?`,
        [username, bio, profileId],
        function(err) {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Failed to update profile"
                });
            }

            res.json({
                success: true,
                username: username,
                bio: bio
            });
        }
    );
});
// ===============================
// PROFILE PICTURE
// ===============================

app.post(
    "/api/profile/picture",
    upload.single("profileImage"),
    (req, res) => {

        if (!req.file) {
            return res.status(400).json({
                error: "Please select an image"
            });
        }

        const imagePath =
            "/uploads/" + req.file.filename;

        db.run(
            `UPDATE users
             SET profile_image = ?
             WHERE id = ?`,
            [imagePath, profileId],
            function(err) {

                if (err) {
                    console.error(err);
                    return res.status(500).json({
                        error: "Failed to save profile picture"
                    });
                }

                res.json({
                    success: true,
                    profile_image: imagePath
                });
            }
        );
    }
);
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
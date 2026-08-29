console.log("Connectly script loaded!");

// ===============================
// LOAD POSTS
// ===============================

async function loadPosts() {

    try {

        const response = await fetch("/api/posts");
        const posts = await response.json();

        if (!response.ok) {
            throw new Error(posts.error || "Failed to load posts");
        }

        const postsContainer =
            document.getElementById("postsContainer");

        postsContainer.innerHTML = "";

        posts.forEach(post => {
            displayPost(post);
        });

    } catch (error) {

        console.error("Load posts error:", error);

    }
}
async function loadExplore() {

    try {

        const response = await fetch("/api/posts");
        const posts = await response.json();

        if (!response.ok) {
            throw new Error(
                posts.error || "Failed to load explore posts"
            );
        }

        const exploreContainer =
            document.getElementById("exploreContainer");

        exploreContainer.innerHTML = "";

        if (posts.length === 0) {
            exploreContainer.innerHTML =
                "<p>No posts to explore yet. 😊</p>";
            return;
        }

        posts.forEach(post => {

            const explorePost =
                document.createElement("div");

            explorePost.className = "explore-post";

            explorePost.innerHTML = `
                <h3>👤 You</h3>
                <p>${post.text || ""}</p>
            `;

            if (post.image) {

                const image =
                    document.createElement("img");

                image.src = post.image;
                image.style.width = "100%";
                image.style.maxHeight = "400px";
                image.style.objectFit = "cover";
                image.style.borderRadius = "10px";

                explorePost.appendChild(image);
            }

            exploreContainer.appendChild(explorePost);
        });

    } catch (error) {

        console.error("Explore error:", error);
    }
}
// ===============================
// LOAD EXPLORE POSTS
// ===============================




// ===============================
// CREATE POST
// ===============================

async function createPost() {

    const postText =
        document.getElementById("postText");

    const postImage =
        document.getElementById("postImage");

    const text = postText.value.trim();

    const imageFile =
        postImage.files[0];

    if (text === "" && !imageFile) {

        alert("Please write something or choose a photo!");

        return;
    }

    const formData = new FormData();

    formData.append("text", text);

    if (imageFile) {
        formData.append("image", imageFile);
    }

    try {

        const response = await fetch("/api/posts", {
            method: "POST",
            body: formData
        });

        const post = await response.json();

        if (!response.ok) {
            throw new Error(
                post.error || "Failed to create post"
            );
        }

        displayPost(post);

        postText.value = "";
        postImage.value = "";

    } catch (error) {

        console.error("Post error:", error);

        alert("Post error: " + error.message);
    }
}


// ===============================
// DISPLAY POST
// ===============================

function displayPost(post) {

    const postsContainer =
        document.getElementById("postsContainer");

    const postElement =
        document.createElement("div");

    postElement.className = "post";

    postElement.dataset.postId = post.id;

    postElement.innerHTML = `

        <h3>👤 You</h3>

        <p>${post.text || ""}</p>

        <div class="post-media"></div>

        <button onclick="likePost(this)">
            ❤️ Like
            <span>${post.likeCount || 0}</span>
        </button>

        <button onclick="commentPost(this)">
            💬 Comment
        </button>

        <button onclick="deletePost(this)">
            🗑️ Delete
        </button>

        <div class="comments"></div>
    `;

    // IMAGE

    if (post.image) {

        const image =
            document.createElement("img");

        image.src = post.image;

        image.style.width = "100%";
        image.style.maxHeight = "500px";
        image.style.objectFit = "cover";
        image.style.borderRadius = "10px";
        image.style.marginBottom = "15px";

        postElement
            .querySelector(".post-media")
            .appendChild(image);
    }

    // COMMENTS

    const commentsBox =
        postElement.querySelector(".comments");

    if (post.comments) {

        post.comments.forEach(comment => {

            const commentElement =
                document.createElement("p");

            commentElement.textContent =
                "💬 " + comment.comment;

            commentsBox.appendChild(commentElement);
        });
    }

    postsContainer.prepend(postElement);
}


// ===============================
// LIKE / UNLIKE
// ===============================

async function likePost(button) {

    const post =
        button.parentElement;

    const postId =
        post.dataset.postId;

    try {

        const response =
            await fetch(
                `/api/posts/${postId}/like`,
                {
                    method: "POST"
                }
            );

        const result =
            await response.json();

        if (!response.ok) {

            throw new Error(
                result.error || "Like failed"
            );
        }

        // Reload posts so count comes
        // directly from database

        await loadPosts();

    } catch (error) {

        console.error("Like error:", error);

        alert("Like error: " + error.message);
    }
}


// ===============================
// COMMENT
// ===============================

async function commentPost(button) {

    const post =
        button.parentElement;

    const postId =
        post.dataset.postId;

    const comment =
        prompt("Write your comment:");

    if (!comment || comment.trim() === "") {
        return;
    }

    try {

        const response =
            await fetch(
                `/api/posts/${postId}/comments`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        comment: comment.trim()
                    })
                }
            );

        const result =
            await response.json();

        if (!response.ok) {

            throw new Error(
                result.error ||
                "Failed to save comment"
            );
        }

        const commentsBox =
            post.querySelector(".comments");

        const newComment =
            document.createElement("p");

        newComment.textContent =
            "💬 " + result.comment;

        commentsBox.appendChild(newComment);

    } catch (error) {

        console.error("Comment error:", error);

        alert(
            "Comment error: " +
            error.message
        );
    }
}


// ===============================
// DELETE POST
// ===============================

async function deletePost(button) {

    const post =
        button.parentElement;

    const postId =
        post.dataset.postId;

    if (!confirm(
        "Are you sure you want to delete this post?"
    )) {
        return;
    }

    try {

        const response =
            await fetch(
                `/api/posts/${postId}`,
                {
                    method: "DELETE"
                }
            );

        const result =
            await response.json();

        if (!response.ok) {

            throw new Error(
                result.error ||
                "Failed to delete post"
            );
        }

        post.remove();

    } catch (error) {

        console.error("Delete error:", error);

        alert(
            "Delete error: " +
            error.message
        );
    }
}


// ===============================
// EDIT PROFILE
// ===============================

async function editProfile() {

    const username = prompt(
        "Enter your name:",
        document.getElementById("profileUsername").textContent
    );

    const bio = prompt(
        "Write your bio:",
        document.getElementById("profileBio").textContent
    );

    if (!username || !bio) {
        return;
    }

    try {

        const response = await fetch("/api/profile", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username.trim(),
                bio: bio.trim()
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Failed to update profile"
            );
        }

        document.getElementById("profileUsername").textContent =
            result.username;

        document.getElementById("profileBio").textContent =
            result.bio;

        alert("Profile updated successfully!");

    } catch (error) {

        console.error("Profile update error:", error);

        alert("Profile error: " + error.message);
    }
}


// ===============================
// PROFILE PICTURE
// ===============================

async function changeProfilePicture() {

    const file =
        document.getElementById("profileImageInput").files[0];

    if (!file) {
        return;
    }

    const formData = new FormData();

    formData.append("profileImage", file);

    try {

        const response = await fetch("/api/profile/picture", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Failed to upload profile picture"
            );
        }

        document.getElementById("profileImage").src =
            result.profile_image;

        alert("Profile picture updated!");

    } catch (error) {

        console.error("Profile picture error:", error);

        alert(
            "Profile picture error: " +
            error.message
        );
    }
}
// ===============================
// LOAD PROFILE
// ===============================

async function loadProfile() {

    try {

        const response = await fetch("/api/profile");

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Failed to load profile"
            );
        }

        document.getElementById("profileUsername").textContent =
            data.username;

        document.getElementById("profileBio").textContent =
            data.bio;

        if (data.profile_image) {

            document.getElementById("profileImage").src =
                data.profile_image;
        }

    } catch (error) {

        console.error("Load profile error:", error);

    }
}
// ===============================
// FOLLOW / UNFOLLOW
// ===============================

async function loadFollowStatus() {

    try {
        const response = await fetch("/api/follow");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to load follow status");
        }

        document.getElementById("followerCount").innerText = data.followers;
        document.getElementById("followingCount").innerText = data.following;

        const button = document.getElementById("followButton");

        if (data.isFollowing) {
            button.innerText = "Following";
        } else {
            button.innerText = "Follow";
        }

    } catch (error) {
        console.error("Follow status error:", error);
    }
}


async function toggleFollow() {

    const button = document.getElementById("followButton");

    try {

        const response = await fetch("/api/follow", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Follow failed");
        }

        await loadFollowStatus();

    } catch (error) {

        console.error("Follow error:", error);
        alert("Follow error: " + error.message);

    }
}

window.addEventListener("DOMContentLoaded", () => {
    loadPosts();
    loadFollowStatus();
    loadProfile();
    loadExplore();
});
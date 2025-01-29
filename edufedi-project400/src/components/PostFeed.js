// components/PostFeed.js
import React, { useState } from "react";
import "./PostFeed.css";

const posts = [
  {
    id: 1,
    author: "Dr. Smith",
    content: "Excited to collaborate on AI research! #AI #Research",
    date: "2025-01-29",
  },
  {
    id: 2,
    author: "Jane Doe",
    content: "Looking for partners on a climate change project. DM me! 🌍",
    date: "2025-01-28",
  },
];

function PostFeed() {
  return (
    <div className="post-feed">
      {posts.map((post) => (
        <Post key={post.id} post={post} />
      ))}
    </div>
  );
}

function Post({ post }) {
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [replies, setReplies] = useState([]);
  const [replyInput, setReplyInput] = useState("");

  const handleLike = () => {
    setLikes(liked ? likes - 1 : likes + 1);
    setLiked(!liked);
  };

  const handleReplySubmit = () => {
    if (replyInput.trim()) {
      setReplies([...replies, replyInput]);
      setReplyInput("");
    }
  };

  return (
    <div className="post-card">
      <h3>{post.author}</h3>
      <p>{post.content}</p>
      <span>{post.date}</span>

      {/* Action Buttons */}
      <div className="post-actions">
        <button onClick={handleLike} className={`like-button ${liked ? "liked" : ""}`}>
          {liked ? "❤️ Liked" : "♡ Like"} ({likes})
        </button>
        <button className="repost-button">🔁 Repost</button>
        <button className="share-button">📤 Share</button>
        <button
          className="reply-button"
          onClick={() => document.getElementById(`reply-box-${post.id}`).classList.toggle("hidden")}
        >
          💬 Reply
        </button>
      </div>

      {/* Reply Section */}
      <div id={`reply-box-${post.id}`} className="reply-box hidden">
        <textarea
          value={replyInput}
          onChange={(e) => setReplyInput(e.target.value)}
          placeholder="Write a reply..."
        ></textarea>
        <button onClick={handleReplySubmit}>Submit Reply</button>

        {/* Display Replies */}
        {replies.length > 0 && (
          <ul className="replies-list">
            {replies.map((reply, index) => (
              <li key={index}>{reply}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default PostFeed;

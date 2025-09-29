const express = require("express");
const Parser = require("rss-parser");
const app = express();
const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
      ["content:encoded", "contentEncoded"]
    ]
  }
});

app.get("/api/rss-blogs", async (req, res) => {
  try {
    const feed = await parser.parseURL("https://towardsdatascience.com/feed");

    if (!feed.items || feed.items.length === 0) {
      return res.send("<h2>No blog posts found in feed.</h2>");
    }

    const blogs = feed.items.map(item => {
      let image = null;

      // 1. Check for media:content
      if (item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) {
        image = item.mediaContent.$.url;
      }

      // 2. Check for media:thumbnail
      else if (item.mediaThumbnail && item.mediaThumbnail.$ && item.mediaThumbnail.$.url) {
        image = item.mediaThumbnail.$.url;
      }

      // 3. Extract from content:encoded (if contains <img>)
      else if (item.contentEncoded) {
        const match = item.contentEncoded.match(/<img[^>]+src="([^">]+)"/);
        if (match && match[1]) {
          image = match[1];
        }
      }

      return {
        title: item.title || "Untitled",
        link: item.link || "#",
        date: item.pubDate || "Unknown date",
        content: item.contentSnippet || "No excerpt available",
        image: image || "https://via.placeholder.com/300x200?text=No+Image"
      };
    });

    const html = `
      <html>
      <head>
        <title>Latest Blogs</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: #f9f9f9; }
          .blog { background: white; padding: 15px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
          .blog img { max-width: 100%; border-radius: 8px; margin-bottom: 10px; }
          .blog h2 { margin: 0 0 10px; }
          .blog p { color: #555; }
          a { text-decoration: none; color: #0077cc; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>📰 Latest Blog Posts</h1>
        ${blogs.map(blog => `
          <div class="blog">
            <img src="${blog.image}" alt="Blog Image">
            <h2><a href="${blog.link}" target="_blank">${blog.title}</a></h2>
            <p><em>${blog.date}</em></p>
            <p>${blog.content}</p>
          </div>
        `).join("")}
      </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    console.error("❌ RSS Fetch Error:", error.message);
    res.status(500).send(`<h2>Error: ${error.message}</h2>`);
  }
});

app.listen(5000, () => {
  console.log("🚀 Server running at http://localhost:5000/api/rss-blogs");
});

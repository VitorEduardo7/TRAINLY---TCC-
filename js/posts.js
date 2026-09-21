/* =========================================================
   TRAINLY - posts.js
   Publicações (feed de amigos) — separado das atividades.
   Carregado DEPOIS de main.js na dashboard.
   ========================================================= */
(function () {
  "use strict";

  const API_BASE = "http://localhost/TRAINLY---TCC-/api/index.php";
  const TOKEN_KEY = "trainly_token";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function showToast(msg) {
    if (window.Trainly && window.Trainly.showToast) {
      window.Trainly.showToast(msg);
    } else {
      alert(msg);
    }
  }

  async function apiRequest(path, options = {}) {
    const token = getToken();
    const isFormData = options.body instanceof FormData;
    const clean = path.replace(/^\//, "");
    const [route, existingQuery] = clean.split("?");
    const url = API_BASE + "?route=" + encodeURIComponent(route) + (existingQuery ? "&" + existingQuery : "");

    const res = await fetch(url, {
      ...options,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(options.headers || {})
      }
    });
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      if (!location.pathname.endsWith("login.php")) location.href = "login.php";
      throw new Error("Não autenticado");
    }
    if (!res.ok) {
      let msg = "Erro na requisição";
      try {
        msg = (await res.json()).error || msg;
      } catch (e) {}
      throw new Error(msg);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  const AVATAR_COLORS = ["#8b5cf6", "#ef4444", "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#14b8a6"];
  function avatarColor(seed) {
    let hash = 0;
    const str = String(seed);
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }
  function initials(name) {
    return (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  }
  function avatarHtml(className, id, name, photoUrl) {
    if (photoUrl) {
      return '<div class="' + className + '" style="background-image:url(\'' + photoUrl + '\');background-size:cover;background-position:center;"></div>';
    }
    return '<div class="' + className + '" style="background:' + avatarColor(id) + '">' + initials(name) + "</div>";
  }
  function timeAgo(dateStr) {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return mins + "min atrás";
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + "h atrás";
    const days = Math.floor(hours / 24);
    if (days === 1) return "Ontem";
    if (days < 7) return days + "d atrás";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  }
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  /* ---------------------------------------------------------
     API
     --------------------------------------------------------- */
  async function getPostsFeed() {
    const { feed } = await apiRequest("/posts/feed");
    return feed;
  }
  async function createPost(content, photoFile) {
    const form = new FormData();
    form.append("content", content || "");
    if (photoFile) form.append("photo", photoFile);
    const { post } = await apiRequest("/posts", { method: "POST", body: form });
    return post;
  }
  async function deletePost(id) {
    return apiRequest("/posts/" + id, { method: "DELETE" });
  }
  async function getMyPosts() {
    const { posts } = await apiRequest("/posts/mine");
    return posts;
  }
  async function getUserPosts(userId) {
    const { posts } = await apiRequest("/users/" + userId + "/posts");
    return posts;
  }
  async function togglePostLike(id, currentlyLiked) {
    return apiRequest("/posts/" + id + "/like", { method: currentlyLiked ? "DELETE" : "POST" });
  }
  async function addComment(postId, content) {
    const { comment } = await apiRequest("/posts/" + postId + "/comments", {
      method: "POST",
      body: JSON.stringify({ content })
    });
    return comment;
  }

  /* ---------------------------------------------------------
     Render
     --------------------------------------------------------- */
  function renderComment(c) {
    return (
      '<div class="comment-item">' +
        avatarHtml("feed-avatar small", c.userId, c.userName, c.userAvatarUrl) +
        '<div class="comment-body">' +
          '<span class="comment-author">' + escapeHtml(c.userName) + "</span> " +
          '<span class="comment-text">' + escapeHtml(c.content) + "</span>" +
        "</div>" +
      "</div>"
    );
  }

  function renderPost(p) {
    const photoHtml = p.photoUrl
      ? '<img class="post-photo" src="' + p.photoUrl + '" alt="Foto da publicação">'
      : "";
    const contentHtml = p.content
      ? '<div class="post-content">' + escapeHtml(p.content).replace(/\n/g, "<br>") + "</div>"
      : "";
    const deleteBtn = p.isMine
      ? '<button class="route-icon-btn danger post-delete-btn" type="button" title="Apagar publicação">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>' +
          '<path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>' +
        "</button>"
      : "";
    const commentsHtml = (p.comments || []).map(renderComment).join("");

    return (
      '<div class="post-item" data-post-id="' + p.id + '">' +
        '<div class="post-top">' +
          '<div class="post-author">' +
            avatarHtml("feed-avatar", p.authorId, p.authorName, p.authorAvatarUrl) +
            "<div>" +
              '<div class="feed-author-name">' + escapeHtml(p.authorName) + "</div>" +
              '<div class="feed-post-meta">' + timeAgo(p.date) + "</div>" +
            "</div>" +
          "</div>" +
          deleteBtn +
        "</div>" +
        contentHtml +
        photoHtml +
        '<div class="post-footer">' +
          '<button class="kudos-btn' + (p.likedByMe ? " liked" : "") + '" data-action="like"' + (p.canLike ? "" : " disabled") + ">👍 <span>" + (p.likeCount || 0) + "</span></button>" +
          '<button class="comment-toggle-btn" type="button">💬 ' + (p.comments ? p.comments.length : 0) + "</button>" +
        "</div>" +
        '<div class="post-comments" style="display:none;">' +
          '<div class="comment-list">' + commentsHtml + "</div>" +
          '<div class="comment-input-row">' +
            '<input type="text" class="comment-input" placeholder="Escreva um comentário..." maxlength="500">' +
            '<button class="comment-send-btn" type="button">Enviar</button>' +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function renderPostsFeed(listEl, emptyEl, feed) {
    if (!listEl) return;
    if (!feed.length) {
      listEl.innerHTML = "";
      if (emptyEl) emptyEl.style.display = "block";
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";
    listEl.innerHTML = feed.map(renderPost).join("");
    wirePostInteractions(listEl);
  }

  function wirePostInteractions(listEl) {
    listEl.querySelectorAll(".post-item").forEach((item) => {
      const postId = item.dataset.postId;

      const likeBtn = item.querySelector('[data-action="like"]');
      if (likeBtn) {
        likeBtn.addEventListener("click", async () => {
          if (likeBtn.disabled) return;
          const isLiked = likeBtn.classList.contains("liked");
          likeBtn.disabled = true;
          try {
            const { likeCount, likedByMe } = await togglePostLike(postId, isLiked);
            likeBtn.querySelector("span").textContent = likeCount;
            likeBtn.classList.toggle("liked", likedByMe);
          } catch (err) {
            showToast(err.message || "Não foi possível curtir agora.");
          } finally {
            likeBtn.disabled = false;
          }
        });
      }

      const commentToggle = item.querySelector(".comment-toggle-btn");
      const commentsBox = item.querySelector(".post-comments");
      if (commentToggle && commentsBox) {
        commentToggle.addEventListener("click", () => {
          commentsBox.style.display = commentsBox.style.display === "none" ? "block" : "none";
        });
      }

      const sendBtn = item.querySelector(".comment-send-btn");
      const input = item.querySelector(".comment-input");
      if (sendBtn && input) {
        const submit = async () => {
          const content = input.value.trim();
          if (!content) return;
          sendBtn.disabled = true;
          try {
            const comment = await addComment(postId, content);
            const list = item.querySelector(".comment-list");
            list.insertAdjacentHTML("beforeend", renderComment(comment));
            input.value = "";
            if (commentToggle) {
              commentToggle.textContent = "💬 " + item.querySelectorAll(".comment-item").length;
            }
          } catch (err) {
            showToast(err.message || "Não foi possível comentar agora.");
          } finally {
            sendBtn.disabled = false;
          }
        };
        sendBtn.addEventListener("click", submit);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") submit();
        });
      }

      const deleteBtn = item.querySelector(".post-delete-btn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
          if (!confirm("Apagar essa publicação?")) return;
          try {
            await deletePost(postId);
            item.remove();
          } catch (err) {
            showToast(err.message || "Não foi possível apagar a publicação.");
          }
        });
      }
    });
  }

  /* ---------------------------------------------------------
     Modal de criar publicação
     --------------------------------------------------------- */
  function initCreatePostModal(onCreated) {
    const overlay = document.getElementById("createPostOverlay");
    if (!overlay) return;

    const composerInput = document.getElementById("composerInput");
    const composerBtn = document.getElementById("composerBtn");
    const cancelBtn = document.getElementById("cancelPostBtn");
    const saveBtn = document.getElementById("savePostBtn");
    const contentField = document.getElementById("postContent");
    const photoField = document.getElementById("postPhoto");

    function open() {
      contentField.value = "";
      if (photoField) photoField.value = "";
      overlay.classList.add("open");
      contentField.focus();
    }
    function close() {
      overlay.classList.remove("open");
    }

    if (composerInput) composerInput.addEventListener("click", open);
    if (composerBtn) composerBtn.addEventListener("click", open);
    if (cancelBtn) cancelBtn.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        const content = contentField.value.trim();
        const photoFile = photoField && photoField.files[0] ? photoField.files[0] : null;
        if (!content && !photoFile) {
          showToast("Escreva algo ou anexe uma foto para publicar.");
          return;
        }
        saveBtn.disabled = true;
        saveBtn.textContent = "Publicando...";
        try {
          await createPost(content, photoFile);
          showToast("Publicação criada!");
          close();
          if (onCreated) onCreated();
        } catch (e) {
          showToast(e.message || "Não foi possível publicar agora.");
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = "Publicar";
        }
      });
    }
  }

  async function initPostsFeed() {
    const listEl = document.getElementById("feedList");
    if (!listEl) return; // não é o dashboard

    async function load() {
      try {
        const feed = await getPostsFeed();
        renderPostsFeed(listEl, document.getElementById("feedEmpty"), feed);
      } catch (e) {
        showToast(e.message || "Não foi possível carregar o feed.");
      }
    }

    initCreatePostModal(load);
    await load();
  }

  /* ---------------------------------------------------------
     Aba "Publicações" do perfil (próprio ou de outro usuário)
     --------------------------------------------------------- */
  async function initProfilePosts() {
    const listEl = document.getElementById("profilePostsList");
    if (!listEl) return; // não é a página de perfil

    const emptyEl = document.getElementById("profilePostsEmpty");
    const statPostsEl = document.getElementById("statPosts");
    const viewUserId = new URLSearchParams(location.search).get("user");

    try {
      const posts = viewUserId ? await getUserPosts(viewUserId) : await getMyPosts();
      renderPostsFeed(listEl, emptyEl, posts);
      if (statPostsEl) statPostsEl.textContent = posts.length;
    } catch (e) {
      showToast(e.message || "Não foi possível carregar as publicações.");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initPostsFeed();
    initProfilePosts();
  });
})();
import os
import time
from threading import Lock
from typing import Any

import instaloader
from flask import Flask, jsonify, request

app = Flask(__name__)
_loader = instaloader.Instaloader(
    download_pictures=False,
    download_videos=False,
    download_video_thumbnails=False,
    download_geotags=False,
    save_metadata=False,
    compress_json=False,
    quiet=True,
)
_session_id = os.getenv("INSTAGRAM_SESSIONID", "").strip()
if _session_id:
    _loader.context._session.cookies.set("sessionid", _session_id, domain=".instagram.com")
_user_agent = os.getenv("INSTAGRAM_USER_AGENT", "").strip()
if _user_agent:
    _loader.context._session.headers.update({"User-Agent": _user_agent})

_lock = Lock()
_last_request_at = 0.0
_min_interval = max(float(os.getenv("MIN_REQUEST_INTERVAL_SECONDS", "8")), 1.0)
_cache_ttl = max(int(os.getenv("PROFILE_CACHE_SECONDS", "300")), 30)
_cache: dict[str, tuple[float, dict[str, Any]]] = {}


def _profile_payload(profile: instaloader.Profile) -> dict[str, Any]:
    return {
        "username": profile.username,
        "userId": str(profile.userid),
        "displayName": profile.full_name or None,
        "biography": profile.biography or None,
        "followers": profile.followers,
        "following": profile.followees,
        "postCount": profile.mediacount,
        "verified": profile.is_verified,
        "isPrivate": profile.is_private,
        "profilePictureUrl": profile.profile_pic_url,
        "externalUrl": profile.external_url or None,
    }


@app.get("/health")
def health():
    return jsonify({"status": "ready", "provider": "instaloader", "sessionConfigured": bool(_session_id)})


@app.post("/profile")
def profile():
    body = request.get_json(silent=True) or {}
    username = str(body.get("username", "")).strip().lstrip("@").lower()
    if not username or len(username) > 30 or any(ch not in "abcdefghijklmnopqrstuvwxyz0123456789._" for ch in username):
        return jsonify({"error": "اسم المستخدم غير صالح"}), 400

    now = time.time()
    cached = _cache.get(username)
    if cached and now - cached[0] < _cache_ttl:
        return jsonify({"profile": cached[1], "cached": True})

    global _last_request_at
    with _lock:
        wait = _min_interval - (time.time() - _last_request_at)
        if wait > 0:
            return jsonify({"error": "مصدر Instagram يفرض مهلة بين الطلبات. حاول بعد قليل.", "retryAfterSeconds": round(wait)}), 429
        _last_request_at = time.time()
        try:
            result = _profile_payload(instaloader.Profile.from_username(_loader.context, username))
            _cache[username] = (time.time(), result)
            return jsonify({"profile": result, "cached": False})
        except instaloader.exceptions.ProfileNotExistsException:
            return jsonify({"error": "الحساب غير موجود"}), 404
        except instaloader.exceptions.PrivateAccountException:
            return jsonify({"error": "الحساب خاص ولا تتوفر بياناته العامة الكافية"}), 403
        except Exception as exc:
            message = str(exc)
            if "429" in message or "Too Many Requests" in message or "Login required" in message:
                return jsonify({"error": "مصدر Instagram فرض حدًا مؤقتًا على الطلبات. حاول لاحقًا.", "retryAfterSeconds": 60}), 429
            app.logger.warning("Instagram provider error: %s", type(exc).__name__)
            return jsonify({"error": "تعذر جلب بيانات الحساب من المصدر حاليًا"}), 502


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "10000")))

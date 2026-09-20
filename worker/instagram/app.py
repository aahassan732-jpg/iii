import os
import time
from threading import Lock
from typing import Any

import instaloader
from flask import Flask, jsonify, request

app = Flask(__name__)
_lock = Lock()
_last_request_at = 0.0
_min_interval = max(float(os.getenv("MIN_REQUEST_INTERVAL_SECONDS", "60")), 1.0)
_cooldown_until = 0.0
_cache_ttl = max(int(os.getenv("PROFILE_CACHE_SECONDS", "900")), 30)
_cache: dict[str, tuple[float, dict[str, Any]]] = {}

_loader = instaloader.Instaloader(
    download_pictures=False,
    download_videos=False,
    download_video_thumbnails=False,
    download_geotags=False,
    download_comments=False,
    save_metadata=False,
    compress_json=False,
    max_connection_attempts=1,
    request_timeout=max(float(os.getenv("INSTAGRAM_REQUEST_TIMEOUT_SECONDS", "15")), 5.0),
)


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


def _rate_limit_message(error: Exception) -> str:
    text = str(error).lower()
    if "429" in text or "too many" in text or "rate" in text or "checkpoint" in text:
        return "Instaloader أو Instagram فرض حدًا مؤقتًا على الطلبات. ستتم إعادة المحاولة لاحقًا."
    return "تعذر جلب البيانات الحقيقية من Instagram حاليًا."


@app.get("/health")
def health():
    return jsonify({
        "status": "ready",
        "provider": "instaloader",
        "authenticated": bool(os.getenv("INSTAGRAM_USERNAME")),
        "cooldown": max(0, round(_cooldown_until - time.time())),
    })


@app.post("/profile")
def profile():
    body = request.get_json(silent=True) or {}
    username = str(body.get("username", "")).strip().lstrip("@").lower()
    if not username or len(username) > 30 or any(ch not in "abcdefghijklmnopqrstuvwxyz0123456789._" for ch in username):
        return jsonify({"error": "اسم المستخدم غير صالح"}), 400

    now = time.time()
    cached = _cache.get(username)
    if cached and now - cached[0] < _cache_ttl:
        return jsonify({"profile": cached[1], "cached": True, "stale": False})

    global _last_request_at, _cooldown_until
    with _lock:
        now = time.time()
        if now < _cooldown_until:
            return jsonify({"error": "مصدر Instagram في فترة تهدئة مؤقتة.", "retryAfterSeconds": round(_cooldown_until - now)}), 429
        wait = _min_interval - (now - _last_request_at)
        if wait > 0:
            return jsonify({"error": "Instaloader يفرض مهلة بين الطلبات.", "retryAfterSeconds": round(wait)}), 429
        _last_request_at = now
        try:
            profile_obj = instaloader.Profile.from_username(_loader.context, username)
            result = _profile_payload(profile_obj)
            _cache[username] = (time.time(), result)
            _cooldown_until = 0.0
            return jsonify({"profile": result, "cached": False, "stale": False})
        except instaloader.exceptions.ProfileNotExistsException:
            return jsonify({"error": "الحساب غير موجود"}), 404
        except (instaloader.exceptions.ConnectionException, instaloader.exceptions.QueryReturnedNotFoundException) as error:
            cooldown = max(int(os.getenv("INSTAGRAM_COOLDOWN_SECONDS", "1800")), 60)
            _cooldown_until = time.time() + cooldown
            return jsonify({"error": _rate_limit_message(error), "retryAfterSeconds": cooldown}), 429
        except Exception as error:
            app.logger.warning("Instaloader profile fetch failed: %s", error)
            return jsonify({"error": _rate_limit_message(error)}), 502


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "10000")))
